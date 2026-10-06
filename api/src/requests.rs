//! Permintaan layanan: riwayat mahasiswa, detail (juga untuk cetak surat), antrean staf, dan metrik dampak.

use axum::extract::{Path, Query, State};
use axum::Json;
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::SqlitePool;

use crate::agent::insert_message;
use crate::auth::{CurrentUser, Role};
use crate::error::AppError;
use crate::tools::{letter_fields, letter_of, merge_data, POLICY};
use crate::util::{clock, day_label, day_of, hm, iso, now, parse_iso, today_start, when};
use crate::AppState;

#[derive(sqlx::FromRow)]
struct Req {
    id: String,
    student_id: String,
    worker: String,
    title: String,
    status: String,
    summary: String,
    data: String,
    created_at: i64,
    name: String,
    nim: Option<String>,
    prodi: Option<String>,
}

const SELECT: &str = "SELECT r.id, r.student_id, r.worker, r.title, r.status, r.summary, r.data, r.created_at, u.name, u.nim, u.prodi \
                      FROM requests r JOIN users u ON u.id = r.student_id";

/// Jenis permintaan untuk tampilan: surat | tiket | booking | laporan
pub(crate) fn kind(worker: &str, d: &Value) -> &'static str {
    match worker {
        "surat" => "surat",
        "helpdesk" => "tiket",
        _ if !d["report_id"].is_null() => "laporan",
        _ => "booking",
    }
}

/// "G1.2 · Jumat, 2 Okt, 13.00–15.00"
fn slot(d: &Value) -> String {
    let c = &d["chosen"];
    let (start, end) = (c["start"].as_str().or(d["start"].as_str()).unwrap_or(""), c["end"].as_str().or(d["end"].as_str()).unwrap_or(""));
    let day = d["date"].as_str().and_then(parse_iso).map(day_label).unwrap_or_default();
    format!("{} · {day}, {}–{}", c["code"].as_str().unwrap_or("-"), hm(start), hm(end))
}

impl Req {
    fn data(&self) -> Value {
        serde_json::from_str(&self.data).unwrap_or(json!({}))
    }

    fn first_name(&self) -> &str {
        self.name.split(' ').next().unwrap_or(&self.name)
    }

    fn kind(&self, d: &Value) -> &'static str {
        kind(&self.worker, d)
    }

    fn display_title(&self, d: &Value) -> String {
        match self.kind(d) {
            "tiket" => format!("Tiket {}", self.id),
            "booking" => format!("Booking {}", d["chosen"]["code"].as_str().unwrap_or("ruang")),
            "laporan" => self.title.trim_start_matches("Lapor: ").to_owned(),
            _ => self.title.clone(),
        }
    }

    /// Ringkasan satu baris untuk list.
    fn line(&self, d: &Value) -> String {
        match self.kind(d) {
            "surat" => letter_fields(d).into_iter().map(|[_, v]| v).filter(|v| v != "-").collect::<Vec<_>>().join(", "),
            "booking" => format!("{} · {} orang", slot(d), d["people"].as_i64().unwrap_or(0)),
            _ => d["question"].as_str().unwrap_or("").to_owned(),
        }
    }
}

async fn load(db: &SqlitePool, id: &str) -> Result<Req, AppError> {
    sqlx::query_as::<_, Req>(&format!("{SELECT} WHERE r.id = ?1")).bind(id).fetch_optional(db).await?.ok_or(AppError::NotFound)
}

async fn timeline(db: &SqlitePool, id: &str) -> Result<Vec<(i64, String, String, String)>, AppError> {
    Ok(sqlx::query_as("SELECT at, actor, tool, result FROM audit_log WHERE request_id = ?1 ORDER BY id").bind(id).fetch_all(db).await?)
}

async fn audit_staf(db: &SqlitePool, r: &Req, tool: &str, result: &str) -> Result<(), AppError> {
    sqlx::query("INSERT INTO audit_log (student_id, request_id, actor, tool, result) VALUES (?1, ?2, 'staf', ?3, ?4)")
        .bind(&r.student_id).bind(&r.id).bind(tool).bind(result)
        .execute(db)
        .await?;
    Ok(())
}

/// Laporan kerusakan yang terhubung ke permintaan: (ruang, kategori, urgensi, status, teknisi, pelapor)
async fn report_of(db: &SqlitePool, d: &Value) -> Result<Option<(String, String, String, String, String, i64)>, AppError> {
    let Some(id) = d["report_id"].as_str() else { return Ok(None) };
    Ok(sqlx::query_as(
        "SELECT r.room, r.category, r.urgency, r.status, u.name, r.reporters FROM reports r JOIN users u ON u.id = r.assignee WHERE r.id = ?1",
    )
    .bind(id)
    .fetch_optional(db)
    .await?)
}

/* ---------- mahasiswa ---------- */

/// Riwayat permintaan milik mahasiswa yang login.
#[utoipa::path(get, path = "/api/requests", responses((status = 200)))]
pub async fn mine(State(s): State<AppState>, me: CurrentUser) -> Result<Json<Vec<Value>>, AppError> {
    me.require(Role::Mahasiswa)?;
    let rows = sqlx::query_as::<_, Req>(&format!("{SELECT} WHERE r.student_id = ?1 ORDER BY r.created_at DESC"))
        .bind(&me.user.id)
        .fetch_all(&s.db)
        .await?;
    let mut out = Vec::with_capacity(rows.len());
    for r in &rows {
        let d = r.data();
        let meta = match (r.kind(&d), r.status.as_str()) {
            (_, "cancelled") => "Dibatalkan".into(),
            (_, "rejected") => d["reject_reason"].as_str().unwrap_or("Ditolak staf").to_owned(),
            ("surat", "approved" | "done") => format!("{} · disetujui {}", d["letter_no"].as_str().unwrap_or(""), d["approved_by"].as_str().unwrap_or("staf")),
            ("surat", "pending_approval") => match letter_fields(&d).first() {
                Some([_, v]) => format!("{v} · menunggu staf"),
                None => "Menunggu staf".into(),
            },
            ("surat" | "booking", "needs_info") => "Menunggu data dari kamu".into(),
            ("surat", _) => "Sedang diproses agent".into(),
            ("booking", "approved") => format!("{} · terkonfirmasi", slot(&d)),
            ("booking", _) => format!("{} · menunggu staf", slot(&d)),
            ("laporan", _) => match report_of(&s.db, &d).await? {
                Some((_, _, _, _, tech, n)) => format!("Ditugaskan ke {tech} · {n} pelapor"),
                None => "Laporan kerusakan".into(),
            },
            ("tiket", "done") => format!("Dijawab {}", d["unit"].as_str().unwrap_or("unit")),
            _ => format!("{} · {}", d["category"].as_str().unwrap_or(""), d["unit"].as_str().unwrap_or("")),
        };
        out.push(json!({
            "id": r.id,
            "worker": r.worker,
            "kind": r.kind(&d),
            "title": r.display_title(&d),
            "status": r.status,
            "time": when(r.created_at),
            "meta": meta,
            "active": !matches!(r.status.as_str(), "approved" | "rejected" | "done" | "cancelled"),
        }));
    }
    Ok(Json(out))
}

/// Detail permintaan: pemiliknya atau staf. Dipakai halaman riwayat, cetak surat, dan app Android.
#[utoipa::path(get, path = "/api/requests/{id}", params(("id" = String, Path)), responses((status = 200), (status = 404)))]
pub async fn detail(State(s): State<AppState>, me: CurrentUser, Path(id): Path<String>) -> Result<Json<Value>, AppError> {
    let r = load(&s.db, &id).await?;
    if r.student_id != me.user.id && me.user.role != Role::Staf {
        return Err(AppError::NotFound);
    }
    let d = r.data();
    let text = |k: &str| d[k].as_str().unwrap_or("-").to_owned();
    let fields: Vec<[String; 2]> = match r.kind(&d) {
        "surat" => letter_fields(&d),
        "booking" => vec![
            ["Ruang".into(), slot(&d)],
            ["Keperluan".into(), text("purpose")],
            ["Peserta".into(), format!("{} orang", d["people"].as_i64().unwrap_or(0))],
        ],
        "laporan" => match report_of(&s.db, &d).await? {
            Some((room, cat, urg, _, tech, n)) => vec![
                ["Laporan".into(), text("report_id")],
                ["Ruang".into(), room],
                ["Kategori".into(), format!("{cat} · urgensi {urg}")],
                ["Teknisi".into(), tech],
                ["Pelapor".into(), format!("{n} orang")],
            ],
            None => vec![],
        },
        _ => {
            let mut f = vec![["Kategori".into(), text("category")], ["Unit tujuan".into(), text("unit")], ["Pertanyaan".into(), text("question")]];
            if let Some(a) = d["answer"].as_str() {
                f.push(["Jawaban".into(), a.to_owned()]);
            }
            f
        }
    };

    // Waktu tiap status versi mahasiswa (tanpa nama tool).
    let mut steps = serde_json::Map::new();
    steps.insert("submitted".into(), json!(clock(r.created_at)));
    for (at, _, tool, result) in timeline(&s.db, &r.id).await? {
        let status = match tool.as_str() {
            "requestLetterDetails" | "checkRoomAvailability" => "needs_info",
            "generateLetterDraft" => "processing",
            "submitForApproval" => "pending_approval",
            "approveRequest" => "approved",
            "replyTicket" => "done",
            "rejectRequest" | "cancelBooking" | "rejectByPolicy" => "rejected",
            "updateReport" if result.starts_with("Mulai") => "processing",
            "updateReport" if result.starts_with("Selesai") => "done",
            _ => continue,
        };
        steps.insert(status.into(), json!(clock(at)));
    }

    Ok(Json(json!({
        "id": r.id,
        "worker": r.worker,
        "kind": r.kind(&d),
        "title": r.display_title(&d),
        "status": r.status,
        "fields": fields,
        "steps": steps,
        "letter": d["letter"],
        "letter_no": d["letter_no"],
        "approved_by": d["approved_by"],
        "approved_at": d["approved_at"],
        "reject_reason": d["reject_reason"],
        "student": { "name": r.name, "nim": r.nim, "prodi": r.prodi },
    })))
}

/* ---------- staf ---------- */

fn in_queue(r: &Req) -> bool {
    r.status == "pending_approval" || (r.worker == "helpdesk" && r.status == "submitted")
}

/// Antrean yang menunggu keputusan staf, lengkap dengan audit log agent.
#[utoipa::path(get, path = "/api/staff/queue", responses((status = 200)))]
pub async fn queue(State(s): State<AppState>, me: CurrentUser) -> Result<Json<Vec<Value>>, AppError> {
    me.require(Role::Staf)?;
    let rows = sqlx::query_as::<_, Req>(&format!(
        "{SELECT} WHERE r.status = 'pending_approval' OR (r.worker = 'helpdesk' AND r.status = 'submitted') ORDER BY r.created_at DESC"
    ))
    .fetch_all(&s.db)
    .await?;

    let mut out = Vec::with_capacity(rows.len());
    for r in rows {
        let d = r.data();
        let files: Vec<(String, String, String, i64, Option<String>)> =
            sqlx::query_as("SELECT id, name, mime, size, label FROM attachments WHERE request_id = ?1").bind(&r.id).fetch_all(&s.db).await?;
        let attachments: Vec<Value> = files
            .into_iter()
            .map(|(id, name, mime, size, label)| {
                let kind = mime.rsplit('/').next().unwrap_or("file").to_uppercase().replace("JPEG", "JPG");
                let ai = label.map(|l| format!(" · dicek AI: {l}")).unwrap_or_default();
                json!({ "id": id, "name": name, "meta": format!("{kind} · {} KB{ai}", size / 1024) })
            })
            .collect();
        let tl: Vec<Value> = timeline(&s.db, &r.id)
            .await?
            .into_iter()
            .map(|(at, actor, tool, result)| json!({ "time": clock(at), "actor": actor, "tool": tool, "result": result }))
            .collect();
        out.push(json!({
            "id": r.id,
            "worker": r.worker,
            "tab": match r.kind(&d) { "tiket" => "tiket", "booking" => "booking", _ => "surat" },
            "type": r.title,
            "name": r.name,
            "nim": r.nim,
            "prodi": r.prodi,
            "time": when(r.created_at),
            "mins": (now() - r.created_at) / 60,
            "line": r.line(&d),
            "summary": if r.summary.is_empty() { r.line(&d) } else { r.summary.clone() },
            "checks": d["checks"].as_array().cloned().unwrap_or_default(),
            "attachments": attachments,
            "letter": d["letter"],
            "timeline": tl,
        }));
    }
    Ok(Json(out))
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct DecideReq {
    pub approve: bool,
    /// Wajib saat menolak.
    pub reason: Option<String>,
    /// Wajib saat menjawab tiket helpdesk.
    pub answer: Option<String>,
}

fn required(v: &Option<String>, msg: &str) -> Result<String, AppError> {
    v.as_deref().map(str::trim).filter(|x| !x.is_empty()).map(str::to_owned).ok_or_else(|| AppError::Bad(msg.into()))
}

/// Approve / reject / jawab tiket. Hasilnya langsung dikirim ke chat mahasiswa.
#[utoipa::path(post, path = "/api/staff/requests/{id}/decide", request_body = DecideReq, params(("id" = String, Path)), responses((status = 200)))]
pub async fn decide(State(s): State<AppState>, me: CurrentUser, Path(id): Path<String>, Json(b): Json<DecideReq>) -> Result<Json<Value>, AppError> {
    me.require(Role::Staf)?;
    let r = load(&s.db, &id).await?;
    if !in_queue(&r) {
        return Err(AppError::Bad("Permintaan ini sudah diputuskan.".into()));
    }
    let d = r.data();
    let first = r.first_name().to_owned();
    let staf = me.user.name.clone();
    let kind = r.kind(&d);
    let at = clock(now());

    // (status baru, teks chat, card, patch data, tool audit, judul toast, isi toast)
    let (status, text, card, patch, tool, title, sub) = match (b.approve, kind) {
        (false, _) => {
            let reason = required(&b.reason, "Alasan penolakan wajib diisi.")?;
            if kind == "booking" {
                sqlx::query("UPDATE bookings SET status = 'released' WHERE request_id = ?1").bind(&r.id).execute(&s.db).await?;
            }
            (
                "rejected",
                format!("{} kamu belum disetujui staf. Alasannya: {reason}", r.display_title(&d)),
                None,
                json!({ "reject_reason": reason }),
                "rejectRequest",
                format!("{} {first} ditolak", r.title),
                format!("Alasan sudah dikirim ke {first} lewat chat."),
            )
        }
        (true, "surat") => {
            let (ym, n): (String, i64) = sqlx::query_as(
                "SELECT strftime('%Y/%m', 'now', '+7 hours'), (SELECT COUNT(*) FROM requests WHERE json_extract(data, '$.letter_no') IS NOT NULL)",
            )
            .fetch_one(&s.db)
            .await?;
            let no = format!("{}/{ym}/{:04}", letter_of(&d).prefix, 142 + n);
            (
                "approved",
                format!("{} kamu sudah disetujui. Suratnya bisa diunduh dari card ini atau dari Riwayat.", r.title),
                Some(json!({ "kind": "done", "state": "active", "data": { "letter_no": no, "title": r.title, "approved_by": staf, "approved_at": at, "request_id": r.id } })),
                json!({ "letter_no": no, "approved_by": staf, "approved_at": at }),
                "approveRequest",
                format!("{} {first} disetujui", r.title),
                format!("Nomor {no} terbit. {first} sudah diberi tahu lewat chat."),
            )
        }
        (true, "booking") => {
            sqlx::query("UPDATE bookings SET status = 'confirmed' WHERE request_id = ?1").bind(&r.id).execute(&s.db).await?;
            let code = d["chosen"]["code"].as_str().unwrap_or("Ruang").to_owned();
            (
                "approved",
                format!("Booking {} sudah dikonfirmasi {staf}. Sampai jumpa di ruangan!", slot(&d)),
                None,
                json!({ "approved_by": staf, "approved_at": at }),
                "approveRequest",
                format!("Booking {code} {first} dikonfirmasi"),
                format!("{code} terkonfirmasi. {first} sudah diberi tahu lewat chat."),
            )
        }
        (true, _) => {
            let answer = required(&b.answer, "Tulis jawaban untuk mahasiswa dulu.")?;
            let unit = d["unit"].as_str().unwrap_or("Unit terkait");
            (
                "done",
                format!("{unit} menjawab tiket {}:\n\n{answer}", r.id),
                None,
                json!({ "answer": answer, "approved_by": staf, "approved_at": at }),
                "replyTicket",
                format!("Tiket {first} dijawab"),
                format!("Jawaban sudah dikirim ke {first} lewat chat."),
            )
        }
    };

    let msg = insert_message(&s.db, &r.student_id, "agent", Some(&text), None, card.as_ref()).await?;
    let mut patch = patch;
    patch["decision_msg"] = json!(msg.id);
    patch["decided_at"] = json!(now());
    merge_data(&s.db, &r.id, patch).await?;
    sqlx::query("UPDATE requests SET status = ?2, updated_at = unixepoch() WHERE id = ?1").bind(&r.id).bind(status).execute(&s.db).await?;
    let verb = match tool {
        "rejectRequest" => "Ditolak",
        "replyTicket" => "Dijawab",
        _ => "Disetujui",
    };
    audit_staf(&s.db, &r, tool, &format!("{verb} {staf}")).await?;
    Ok(Json(json!({ "title": title, "sub": sub })))
}

/// Batalkan keputusan (tombol "Batalkan" di toast). Hanya dalam 2 menit.
#[utoipa::path(post, path = "/api/staff/requests/{id}/undo", params(("id" = String, Path)), responses((status = 200)))]
pub async fn undo(State(s): State<AppState>, me: CurrentUser, Path(id): Path<String>) -> Result<Json<Value>, AppError> {
    me.require(Role::Staf)?;
    let r = load(&s.db, &id).await?;
    let d = r.data();
    let fresh = d["decided_at"].as_i64().is_some_and(|t| now() - t <= 120);
    if !matches!(r.status.as_str(), "approved" | "rejected" | "done") || !fresh || d["cancelled"] == true {
        return Err(AppError::Bad("Keputusan ini sudah tidak bisa dibatalkan.".into()));
    }
    if let Some(mid) = d["decision_msg"].as_i64() {
        sqlx::query("DELETE FROM chat_messages WHERE id = ?1").bind(mid).execute(&s.db).await?;
    }
    if r.kind(&d) == "booking" {
        sqlx::query("UPDATE bookings SET status = 'held' WHERE request_id = ?1").bind(&r.id).execute(&s.db).await?;
    }
    let back = if r.worker == "helpdesk" { "submitted" } else { "pending_approval" };
    sqlx::query(
        "UPDATE requests SET status = ?2, updated_at = unixepoch(), \
         data = json_remove(data, '$.letter_no', '$.approved_by', '$.approved_at', '$.reject_reason', '$.answer', '$.decision_msg', '$.decided_at') WHERE id = ?1",
    )
    .bind(&r.id)
    .bind(back)
    .execute(&s.db)
    .await?;
    audit_staf(&s.db, &r, "undoDecision", &format!("Keputusan dibatalkan {}", me.user.name)).await?;
    Ok(Json(json!({ "ok": true })))
}

/// Permintaan yang ditolak otomatis oleh agent karena melanggar ketentuan layanan (14 hari terakhir),
/// supaya staf bisa memeriksa penolakan itu. Yang sudah dibuka lagi tidak ikut karena statusnya bukan `rejected`.
#[utoipa::path(get, path = "/api/staff/auto-rejected", responses((status = 200)))]
pub async fn auto_rejected(State(s): State<AppState>, me: CurrentUser) -> Result<Json<Vec<Value>>, AppError> {
    me.require(Role::Staf)?;
    let rows = sqlx::query_as::<_, Req>(&format!(
        "{SELECT} WHERE r.status = 'rejected' AND json_extract(r.data, '$.auto_rejected') = 1 AND r.updated_at >= ?1 ORDER BY r.updated_at DESC"
    ))
    .bind(now() - 14 * 86_400)
    .fetch_all(&s.db)
    .await?;
    let mut out = Vec::with_capacity(rows.len());
    for r in rows {
        let d = r.data();
        let rule = d["policy_rule"].as_str().unwrap_or("");
        let tl: Vec<Value> = timeline(&s.db, &r.id)
            .await?
            .into_iter()
            .map(|(at, actor, tool, result)| json!({ "time": clock(at), "actor": actor, "tool": tool, "result": result }))
            .collect();
        out.push(json!({
            "id": r.id,
            "worker": r.worker,
            "type": r.display_title(&d),
            "name": r.name,
            "nim": r.nim,
            "prodi": r.prodi,
            "time": when(r.created_at),
            "rule": rule,
            "rule_label": POLICY.iter().find(|(k, _)| *k == rule).map_or("Ketentuan layanan", |p| p.1),
            "reason": d["reject_reason"],
            "summary": if r.summary.is_empty() { r.line(&d) } else { r.summary.clone() },
            "reviewed_by": d["reviewed_by"],
            "timeline": tl,
        }));
    }
    Ok(Json(out))
}

#[derive(Deserialize, utoipa::ToSchema)]
pub struct ReviewReq {
    /// true = batalkan penolakan otomatis, false = penolakan benar (dicatat).
    pub reopen: bool,
}

/// Tinjau penolakan otomatis. Dibuka lagi: surat dan booking kembali `needs_info` (mahasiswa lanjut lewat chat),
/// tiket masuk antrean staf. Mahasiswa dikabari lewat chat.
#[utoipa::path(post, path = "/api/staff/requests/{id}/review", request_body = ReviewReq, params(("id" = String, Path)), responses((status = 200)))]
pub async fn review(State(s): State<AppState>, me: CurrentUser, Path(id): Path<String>, Json(b): Json<ReviewReq>) -> Result<Json<Value>, AppError> {
    me.require(Role::Staf)?;
    let r = load(&s.db, &id).await?;
    let d = r.data();
    if r.status != "rejected" || d["auto_rejected"] != true {
        return Err(AppError::Bad("Permintaan ini bukan penolakan otomatis yang bisa ditinjau.".into()));
    }
    let staf = me.user.name.clone();
    let first = r.first_name().to_owned();
    if !b.reopen {
        merge_data(&s.db, &r.id, json!({ "reviewed_by": staf, "reviewed_at": now() })).await?;
        audit_staf(&s.db, &r, "reviewRejection", &format!("Penolakan otomatis dikonfirmasi {staf}")).await?;
        return Ok(Json(json!({ "title": "Penolakan dikonfirmasi", "sub": format!("Permintaan {first} tetap ditolak.") })));
    }
    let back = if r.worker == "helpdesk" { "submitted" } else { "needs_info" };
    sqlx::query(
        "UPDATE requests SET status = ?2, updated_at = unixepoch(), \
         data = json_remove(json_set(data, '$.policy_override', json('true'), '$.reviewed_by', ?3), '$.auto_rejected', '$.reject_reason', '$.decided_at') WHERE id = ?1",
    )
    .bind(&r.id)
    .bind(back)
    .bind(&staf)
    .execute(&s.db)
    .await?;
    let next = if back == "submitted" { "Pertanyaanmu sekarang masuk antrean unit terkait." } else { "Kamu bisa melanjutkannya lewat chat." };
    let text = format!("{} sudah ditinjau ulang oleh {staf}. Penolakan otomatis dibatalkan. {next}", r.display_title(&d));
    insert_message(&s.db, &r.student_id, "agent", Some(&text), None, None).await?;
    audit_staf(&s.db, &r, "reopenRequest", &format!("Penolakan otomatis dibatalkan {staf}")).await?;
    Ok(Json(json!({ "title": "Penolakan dibatalkan", "sub": format!("{first} sudah diberi tahu lewat chat.") })))
}

/// Batalkan permintaan oleh mahasiswa pemiliknya. Hanya selama belum selesai
/// (belum disetujui/ditolak/selesai/dibatalkan). Tahan ruang ikut dilepas,
/// antrean staf ikut kosong karena queue hanya berisi status pending_approval.
#[utoipa::path(post, path = "/api/requests/{id}/cancel", params(("id" = String, Path)), responses((status = 200)))]
pub async fn cancel(State(s): State<AppState>, me: CurrentUser, Path(id): Path<String>) -> Result<Json<Value>, AppError> {
    me.require(Role::Mahasiswa)?;
    let r = load(&s.db, &id).await?;
    if r.student_id != me.user.id {
        return Err(AppError::NotFound);
    }
    if !matches!(r.status.as_str(), "submitted" | "needs_info" | "processing" | "pending_approval") {
        return Err(AppError::Bad("Permintaan ini sudah selesai dan tidak bisa dibatalkan.".into()));
    }
    sqlx::query("UPDATE requests SET status = 'cancelled', updated_at = unixepoch() WHERE id = ?1").bind(&r.id).execute(&s.db).await?;
    sqlx::query("UPDATE bookings SET status = 'released' WHERE request_id = ?1 AND status = 'held'").bind(&r.id).execute(&s.db).await?;
    sqlx::query("INSERT INTO audit_log (student_id, request_id, actor, tool, result) VALUES (?1, ?2, 'mahasiswa', 'cancel', ?3)")
        .bind(&r.student_id).bind(&r.id).bind(format!("{} dibatalkan {}", r.title, me.user.name))
        .execute(&s.db).await?;
    Ok(Json(json!({ "ok": true, "status": "cancelled" })))
}

/* ---------- metrik dampak ---------- */

/// Perkiraan menit kerja manual staf per jenis pekerjaan yang diambil alih agent.
/// Asumsi awal, kalibrasi dengan data waktu layanan kampus sebenarnya.
const MANUAL_MINUTES: [(&str, i64); 6] = [
    ("submitForApproval", 12), // cek profil, cek syarat, ketik draft surat / cek jadwal ruang
    ("answerWithCitation", 5), // jawab pertanyaan aturan akademik
    ("reportDamage", 5),       // catat laporan, cari teknisi, gabung laporan dobel
    ("createTicket", 3),       // triase pertanyaan ke unit yang tepat
    ("checkRoomAvailability", 4),
    ("checkLetterRequirements", 3),
];

/// Metrik hari ini dari audit log: berapa yang selesai tanpa staf dan berapa waktu staf yang dihemat.
#[utoipa::path(get, path = "/api/staff/metrics", responses((status = 200)))]
pub async fn metrics(State(s): State<AppState>, me: CurrentUser) -> Result<Json<Value>, AppError> {
    me.require(Role::Staf)?;
    let t0 = today_start();
    let count = |sql: &'static str| {
        let db = s.db.clone();
        async move { sqlx::query_scalar::<_, i64>(sql).bind(t0).fetch_one(&db).await }
    };

    let surat = count("SELECT COUNT(*) FROM requests WHERE created_at >= ?1 AND worker = 'surat'").await?;
    let tiket = count("SELECT COUNT(*) FROM requests WHERE created_at >= ?1 AND worker = 'helpdesk'").await?;
    let laporan = count("SELECT COUNT(*) FROM requests WHERE created_at >= ?1 AND worker = 'fasilitas' AND json_extract(data, '$.report_id') IS NOT NULL").await?;
    let booking = count("SELECT COUNT(*) FROM requests WHERE created_at >= ?1 AND worker = 'fasilitas' AND json_extract(data, '$.report_id') IS NULL").await?;
    let jawaban = count("SELECT COUNT(*) FROM audit_log WHERE at >= ?1 AND tool = 'answerWithCitation'").await?;
    // ditahan agent: syarat belum terpenuhi atau ditolak otomatis karena melanggar ketentuan
    let ditahan = count("SELECT COUNT(*) FROM audit_log WHERE at >= ?1 AND ((tool = 'checkLetterRequirements' AND result LIKE 'Belum terpenuhi%') OR tool = 'rejectByPolicy')").await?;
    let ke_staf = count("SELECT COUNT(*) FROM audit_log WHERE at >= ?1 AND tool IN ('submitForApproval', 'createTicket')").await?;
    let avg: Option<f64> = sqlx::query_scalar(
        "SELECT AVG(a.at - r.created_at) FROM audit_log a JOIN requests r ON r.id = a.request_id WHERE a.at >= ?1 AND a.tool = 'submitForApproval'",
    )
    .bind(t0)
    .fetch_one(&s.db)
    .await?;

    let mut saved = 0;
    for (tool, minutes) in MANUAL_MINUTES {
        let n: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM audit_log WHERE at >= ?1 AND tool = ?2").bind(t0).bind(tool).fetch_one(&s.db).await?;
        saved += n * minutes;
    }

    let (calls, input, output, cached): (i64, i64, i64, i64) =
        sqlx::query_as("SELECT COUNT(*), COALESCE(SUM(input), 0), COALESCE(SUM(output), 0), COALESCE(SUM(cached), 0) FROM llm_usage WHERE at >= ?1")
            .bind(t0)
            .fetch_one(&s.db)
            .await?;

    // Selesai otomatis: dijawab dengan sumber, laporan langsung ke teknisi, atau ditahan dengan alasan jelas.
    let auto = jawaban + laporan + ditahan;
    let handled = auto + ke_staf;
    let total = surat + tiket + laporan + booking + jawaban;
    Ok(Json(json!({
        "tokens": {
            "calls": calls,
            "input": input,
            "output": output,
            "cache_pct": if input > 0 { cached * 100 / input } else { 0 },
            "per_request": if total > 0 { (input + output) / total } else { 0 },
        },
        "total": total,
        "by": { "surat": surat, "tiket": tiket, "booking": booking, "laporan": laporan, "jawaban": jawaban },
        "avg_minutes": avg.map(|s| ((s / 60.0).round() as i64).max(1)),
        "auto": auto,
        "handled": handled,
        "auto_pct": if handled > 0 { auto * 100 / handled } else { 0 },
        "saved_minutes": saved,
    })))
}

#[derive(Deserialize)]
pub struct DailyQuery {
    days: Option<i64>,
}

/// Tren harian (WIB) untuk chart di /staf/metrik. Rumus sama dengan metrics(), dipecah per hari; hari kosong tetap muncul (0).
#[utoipa::path(get, path = "/api/staff/metrics/daily", params(("days" = Option<i64>, Query, description = "1-90, default 30")), responses((status = 200)))]
pub async fn metrics_daily(State(s): State<AppState>, me: CurrentUser, Query(q): Query<DailyQuery>) -> Result<Json<Vec<Value>>, AppError> {
    me.require(Role::Staf)?;
    let days = q.days.unwrap_or(30).clamp(1, 90);
    let first = day_of(now()) - days + 1;
    let since = today_start() - (days - 1) * 86_400;
    // (hari, worker, ada report_id, jumlah); hari = day_of(created_at) dalam SQL (WIB = +25200 detik)
    let reqs: Vec<(i64, String, bool, i64)> = sqlx::query_as(
        "SELECT (created_at + 25200) / 86400, worker, json_extract(data, '$.report_id') IS NOT NULL, COUNT(*)          FROM requests WHERE created_at >= ?1 GROUP BY 1, 2, 3",
    )
    .bind(since)
    .fetch_all(&s.db)
    .await?;
    let audit: Vec<(i64, i64, i64)> = sqlx::query_as(
        "SELECT (at + 25200) / 86400, SUM(tool = 'answerWithCitation'),          SUM((tool = 'checkLetterRequirements' AND result LIKE 'Belum terpenuhi%') OR tool = 'rejectByPolicy') FROM audit_log WHERE at >= ?1 GROUP BY 1",
    )
    .bind(since)
    .fetch_all(&s.db)
    .await?;

    let out = (first..first + days)
        .map(|d| {
            let n = |w: &str, report: bool| reqs.iter().filter(|r| r.0 == d && r.1 == w && (w != "fasilitas" || r.2 == report)).map(|r| r.3).sum::<i64>();
            let (surat, tiket, laporan, booking) = (n("surat", false), n("helpdesk", false), n("fasilitas", true), n("fasilitas", false));
            let (jawaban, ditahan) = audit.iter().find(|a| a.0 == d).map_or((0, 0), |a| (a.1, a.2));
            json!({
                "date": iso(d),
                "total": surat + tiket + laporan + booking + jawaban,
                "auto": jawaban + laporan + ditahan,
                "surat": surat, "tiket": tiket, "booking": booking, "laporan": laporan,
            })
        })
        .collect();
    Ok(Json(out))
}

/// Angka publik untuk halaman /uptime: tanpa login, hanya hitungan (tanpa data pribadi).
pub async fn public_stats(State(s): State<AppState>) -> Result<Json<Value>, AppError> {
    let week = now() - 7 * 86_400;
    let count = |sql: &'static str, since: i64| {
        let db = s.db.clone();
        async move { sqlx::query_scalar::<_, i64>(sql).bind(since).fetch_one(&db).await }
    };

    let requests = count("SELECT COUNT(*) FROM requests WHERE created_at >= ?1", 0).await?;
    let requests_week = count("SELECT COUNT(*) FROM requests WHERE created_at >= ?1", week).await?;
    let answers = count("SELECT COUNT(*) FROM audit_log WHERE at >= ?1 AND tool = 'answerWithCitation'", 0).await?;
    let fixed_week = count("SELECT COUNT(*) FROM reports WHERE status = 'selesai' AND updated_at >= ?1", week).await?;
    // rumus "selesai tanpa staf" sama dengan metrics(), tapi untuk 7 hari terakhir
    let auto = count(
        "SELECT COUNT(*) FROM audit_log WHERE at >= ?1 AND (tool IN ('answerWithCitation', 'reportDamage', 'rejectByPolicy') OR (tool = 'checkLetterRequirements' AND result LIKE 'Belum terpenuhi%'))",
        week,
    )
    .await?;
    let to_staff = count("SELECT COUNT(*) FROM audit_log WHERE at >= ?1 AND tool IN ('submitForApproval', 'createTicket')", week).await?;

    Ok(Json(json!({
        "requests": requests,
        "requests_week": requests_week,
        "answers": answers,
        "fixed_week": fixed_week,
        "auto_pct_week": if auto + to_staff > 0 { auto * 100 / (auto + to_staff) } else { 0 },
    })))
}
