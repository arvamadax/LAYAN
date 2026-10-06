//! Provider LLM tiruan: aturan sederhana yang memanggil tool dengan urutan yang sama
//! seperti LLM sungguhan. Dipakai saat belum ada API key, dan sebagai cadangan demo.

use std::collections::HashMap;

use serde_json::{json, Value};

use crate::llm::{assistant_call, assistant_text};

fn has(text: &str, words: &[&str]) -> bool {
    words.iter().any(|w| text.contains(w))
}

/// Jenis surat dari kata kunci (key di tools::LETTERS). "aktif kuliah untuk beasiswa" tetap surat aktif.
fn letter_type(said: &str) -> &'static str {
    if has(said, &["aktif kuliah", "keterangan aktif", "surat aktif"]) {
        "aktif"
    } else if has(said, &["magang", "kerja praktik", "kerja praktek", " kp ", "pengantar"]) {
        "magang"
    } else if has(said, &["penelitian", "survei", "survey", "riset"]) {
        "penelitian"
    } else if has(said, &["rekomendasi", "beasiswa"]) {
        "beasiswa"
    } else {
        "dispensasi"
    }
}

/// Pelanggaran ketentuan yang dinyatakan sendiri oleh mahasiswa: (ketentuan, layanan, alasan).
/// Yang samar tidak ditolak di sini; staf yang memutuskan.
fn policy_hit(said: &str) -> Option<(&'static str, &'static str, &'static str)> {
    let service = if has(said, &["booking", "pinjam ruang", "pesan ruang", "sewa ruang"]) { "ruang" } else { "surat" };
    if has(said, &["atas nama teman", "atas nama orang lain", "pakai nim teman", "nim temanku", "pakai akun teman", "buat temanku tapi"]) {
        Some(("identitas", service, "Kamu meminta layanan untuk orang lain atau memakai data orang lain."))
    } else if has(said, &["tanggal mundur", "dimundurkan", "backdate", "kegiatan fiktif", "lomba fiktif", "surat palsu", "palsukan", "naikkan ipk", "ubah ipk", "ganti nilai", "tanda tangan palsu"]) {
        Some(("data_palsu", service, "Kamu meminta isi yang tidak sesuai kenyataan."))
    } else if service == "ruang" && has(said, &["judi", "miras", "minuman keras", "kampanye politik", "kampanye caleg", "taruhan"]) {
        Some(("tujuan_terlarang", service, "Ruang diminta untuk kegiatan yang dilarang aturan kampus."))
    } else {
        None
    }
}

const LETTER_WORDS: [&str; 13] =
    ["surat", "izin", "dispensasi", "lomba", "aktif kuliah", "magang", "kerja praktik", "pengantar", "penelitian", "survei", "riset", "rekomendasi", "beasiswa"];

/// "10–12 Oktober" / "14 Okt" dari teks bebas. Kosong kalau tidak ketemu.
fn dates(text: &str) -> String {
    const BULAN: [&str; 12] = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
    let words: Vec<&str> = text.split_whitespace().collect();
    for (i, w) in words.iter().enumerate() {
        let lw = w.to_lowercase();
        if let Some(b) = BULAN.iter().find(|b| lw.starts_with(&b[..3.min(b.len())])) {
            if i > 0 && words[i - 1].chars().next().is_some_and(|c| c.is_ascii_digit()) {
                let mut name = b.to_string();
                name[..1].make_ascii_uppercase();
                return format!("{} {name}", words[i - 1]);
            }
        }
    }
    String::new()
}

/// IP pertama di teks, mis. "3,2" -> 3.2
fn ip(text: &str) -> Option<f64> {
    let c: Vec<char> = text.chars().collect();
    (1..c.len().saturating_sub(1)).find_map(|i| {
        if (c[i] == ',' || c[i] == '.') && c[i - 1].is_ascii_digit() && c[i + 1].is_ascii_digit() && (i < 2 || !c[i - 2].is_ascii_digit()) {
            let frac: String = c[i + 1..].iter().take_while(|d| d.is_ascii_digit()).collect();
            format!("{}.{frac}", c[i - 1]).parse().ok()
        } else {
            None
        }
    })
}

/// Kode ruang seperti "F2.3" atau "G2.4".
fn room(text: &str) -> Option<String> {
    text.split(|c: char| c.is_whitespace() || c == ',' || c == '?' || c == '!')
        .map(|w| w.trim_end_matches('.'))
        .find(|w| {
            let c: Vec<char> = w.chars().collect();
            c.len() >= 4 && c[0].is_ascii_alphabetic() && c[1].is_ascii_digit() && c[2] == '.' && c[3].is_ascii_digit()
        })
        .map(str::to_uppercase)
}

fn category(t: &str) -> &'static str {
    if has(t, &["ac ", " ac", "pendingin"]) { "AC" }
    else if has(t, &["proyektor", "hdmi", "layar"]) { "Proyektor" }
    else if has(t, &["wifi", "wi-fi", "internet", "jaringan"]) { "Jaringan" }
    else if has(t, &["lampu", "listrik", "stopkontak", "colokan"]) { "Listrik" }
    else if has(t, &["wastafel", "toilet", "kotor", "sampah", "mampet"]) { "Kebersihan" }
    else { "Lainnya" }
}

/// Dua jam pertama di teks: "13.00–15.00" -> ("13:00", "15:00")
fn times(text: &str) -> Option<(String, String)> {
    let c: Vec<char> = text.chars().collect();
    let mut found = vec![];
    let mut i = 0;
    while i + 3 < c.len() {
        let two = c[i].is_ascii_digit() && c[i + 1].is_ascii_digit();
        let at = if two { i + 2 } else { i + 1 };
        if c[i].is_ascii_digit() && at + 2 < c.len() + 1 && at < c.len() && (c[at] == '.' || c[at] == ':')
            && c.get(at + 1).is_some_and(|d| d.is_ascii_digit()) && c.get(at + 2).is_some_and(|d| d.is_ascii_digit())
            && (i == 0 || !c[i - 1].is_ascii_digit())
        {
            let h: String = c[i..at].iter().collect();
            let m: String = c[at + 1..at + 3].iter().collect();
            found.push(format!("{:0>2}:{m}", h));
            i = at + 3;
        } else {
            i += 1;
        }
    }
    (found.len() >= 2).then(|| (found[0].clone(), found[1].clone()))
}

/// Angka sebelum kata "orang".
fn people(text: &str) -> Option<i64> {
    let w: Vec<&str> = text.split_whitespace().collect();
    w.windows(2).find(|p| p[1].starts_with("orang")).and_then(|p| p[0].parse().ok())
}

/// Nama hari -> tanggal terdekat setelah hari ini.
fn date(text: &str) -> Option<String> {
    let today = crate::util::day_of(crate::util::now());
    if text.contains("besok") {
        return Some(crate::util::iso(today + 1));
    }
    let wanted = crate::util::HARI.iter().position(|h| text.contains(&h.to_lowercase()))?;
    let now = crate::util::weekday(today) as i64;
    let ahead = (wanted as i64 - now).rem_euclid(7);
    Some(crate::util::iso(today + if ahead == 0 { 7 } else { ahead }))
}

fn sks_for(ip: f64) -> (&'static str, &'static str) {
    match ip {
        x if x < 2.0 => ("Maksimal 18 SKS", "IP kurang dari 2,00"),
        x if x < 3.0 => ("Maksimal 20 SKS", "IP 2,00 sampai 2,99"),
        x if x < 3.5 => ("Maksimal 22 SKS", "IP 3,00 sampai 3,49"),
        _ => ("Maksimal 24 SKS", "Mulai IP 3,50"),
    }
}

/// Dua kalimat penjelasan: kalimat yang memuat `anchor` dan kalimat sesudahnya.
fn explain(body: &str, anchor: Option<&str>) -> String {
    let sentences: Vec<&str> = body.split(". ").map(|s| s.trim_end_matches('.')).collect();
    let start = anchor.and_then(|a| sentences.iter().position(|s| s.contains(a))).unwrap_or(0);
    sentences.iter().skip(start).take(2).map(|s| format!("{s}.")).collect::<Vec<_>>().join(" ")
}

pub fn next(tr: &[Value]) -> Value {
    let n = tr.len();
    let call = |name: &str, args: Value| assistant_call(format!("mock-{n}"), name, args);

    let Some(u) = tr.iter().rposition(|m| m["role"] == "user") else {
        return assistant_text("Halo! Ceritakan saja keperluanmu.");
    };
    let said = tr[u]["content"].as_str().unwrap_or("").to_lowercase();

    // Nama tool untuk setiap id, lalu hasil tool sejak pesan user terakhir.
    let names: HashMap<&str, &str> = tr
        .iter()
        .filter_map(|m| m["tool_calls"].as_array())
        .flatten()
        .filter_map(|c| Some((c["id"].as_str()?, c["function"]["name"].as_str()?)))
        .collect();
    let done: Vec<(&str, Value)> = tr[u..]
        .iter()
        .filter(|m| m["role"] == "tool")
        .filter_map(|m| {
            let name = names.get(m["tool_call_id"].as_str()?)?;
            Some((*name, serde_json::from_str(m["content"].as_str()?).unwrap_or(Value::Null)))
        })
        .collect();
    let result = |tool: &str| done.iter().rev().find(|(t, _)| *t == tool).map(|(_, v)| v.clone()).unwrap_or(Value::Null);

    match done.last().map(|(t, _)| *t) {
        None if said.starts_with("[aksi]") => {
            let question = tr[..u]
                .iter()
                .rev()
                .filter(|m| m["role"] == "user")
                .filter_map(|m| m["content"].as_str())
                .find(|t| !t.starts_with("[aksi]"))
                .unwrap_or("Pertanyaan akademik");
            call("createTicket", json!({ "category": "Beban studi / SKS", "unit": "Bagian Akademik Fakultas", "question": question }))
        }
        None if policy_hit(&said).is_some() => {
            let (rule, service, reason) = policy_hit(&said).unwrap_or_default();
            let request: String = tr[u]["content"].as_str().unwrap_or("").chars().take(120).collect();
            let letter = letter_type(&format!(" {said} "));
            call("rejectByPolicy", json!({ "rule": rule, "service": service, "letter_type": letter, "request": request, "reason": reason }))
        }
        None if has(&said, &LETTER_WORDS) => call("getStudentProfile", json!({})),
        None if has(&said, &["sks", " ip ", "ipk", "cuti", "nilai", "aturan", "krs", "ukt", "masa studi", "konversi"]) => {
            call("searchKnowledgeBase", json!({ "query": said }))
        }
        None if has(&said, &["rusak", "mati", "bocor", "mampet", "kedip", "tidak menyala", "berasap", "putus", "lapor"]) => {
            let Some(code) = room(tr[u]["content"].as_str().unwrap_or("")) else {
                return assistant_text("Di ruang mana kerusakannya? Sebutkan kodenya, misalnya F2.3.");
            };
            let raw = tr[u]["content"].as_str().unwrap_or("").trim();
            let mut title: String = raw.chars().take(60).collect();
            if let Some(f) = title.get_mut(..1) {
                f.make_ascii_uppercase();
            }
            let urgency = if has(&said, &["berasap", "percik", "korslet", "banjir", "api"]) { "Tinggi" } else { "Sedang" };
            call("reportDamage", json!({ "room": code, "title": title, "category": category(&said), "urgency": urgency }))
        }
        None if has(&said, &["booking", "pinjam ruang", "pesan ruang", "sewa ruang"]) => {
            let (Some(day), Some((start, end))) = (date(&said), times(&said)) else {
                return assistant_text("Siap. Hari apa, jam berapa sampai jam berapa, dan untuk berapa orang?");
            };
            let preferred = room(tr[u]["content"].as_str().unwrap_or("")).or_else(|| said.contains("rapat").then(|| "G2.4".to_owned()));
            let purpose = if said.contains("rapat") { "Rapat himpunan" } else { "Kegiatan mahasiswa" };
            call(
                "findRooms",
                json!({ "date": day, "start": start, "end": end, "people": people(&said).unwrap_or(10), "purpose": purpose, "preferred_room": preferred }),
            )
        }
        None => assistant_text(
            "Aku bisa bantu surat akademik (dispensasi, aktif kuliah, magang, penelitian, rekomendasi beasiswa), aturan akademik, booking ruang, atau lapor kerusakan. Coba ceritakan lebih spesifik ya.",
        ),

        Some("getStudentProfile") => {
            let key = letter_type(&format!(" {said} "));
            let title = crate::tools::LETTERS.iter().find(|l| l.key == key).map_or("surat", |l| l.title);
            call(
                "requestLetterDetails",
                json!({
                    "type": key,
                    "message": format!("Siap. Aku buatkan {title} ya. Data profil kamu sudah aku ambil. Tinggal lengkapi datanya:"),
                    "dates": if key == "dispensasi" { dates(tr[u]["content"].as_str().unwrap_or("")) } else { String::new() },
                }),
            )
        }
        // lampiran hanya untuk jenis surat yang memintanya (hasil requestLetterDetails menyebut langkah berikutnya)
        Some("requestLetterDetails") if result("requestLetterDetails")["langkah_berikutnya"].as_str().is_some_and(|s| s.contains("requestAttachment")) => {
            call("requestAttachment", json!({}))
        }
        Some("requestLetterDetails") => call("checkLetterRequirements", json!({})),
        Some("requestAttachment") => call("checkLetterRequirements", json!({})),
        Some("checkLetterRequirements") if result("checkLetterRequirements")["lolos"] == true => call("generateLetterDraft", json!({})),
        Some("generateLetterDraft") => {
            let p = result("getStudentProfile");
            let d = result("requestLetterDetails");
            let first = p["nama"].as_str().unwrap_or("Mahasiswa").split(' ').next().unwrap_or("Mahasiswa").to_owned();
            let list: Vec<String> = d["courses"].as_array().into_iter().flatten().filter_map(|c| c.as_str().map(str::to_owned)).collect();
            let when = d["dates"].as_str().filter(|s| !s.is_empty()).map(|s| format!(" pada {s}")).unwrap_or_default();
            let jenis = d["jenis"].as_str().unwrap_or("Surat Dispensasi");
            let summary = if jenis == "Surat Dispensasi" {
                format!(
                    "{first} minta Surat Dispensasi untuk mengikuti {}{when}. Mata kuliah terlewat: {}. Syarat terpenuhi dan bukti kegiatan sudah diterima.",
                    d["activity"].as_str().unwrap_or("kegiatan"),
                    crate::tools::join_id(&list),
                )
            } else {
                let skip = ["jenis", "dates", "langkah_berikutnya"];
                let isi: Vec<&str> = d.as_object().into_iter().flatten().filter(|(k, _)| !skip.contains(&k.as_str())).filter_map(|(_, v)| v.as_str()).collect();
                format!("{first} minta {jenis}: {}. Semua syarat terpenuhi.", isi.join(", "))
            };
            call("submitForApproval", json!({ "summary": summary }))
        }

        Some("findRooms") if result("findRooms")["ruang"].is_string() => call("holdRoom", json!({})),
        Some("findRooms") => assistant_text("Semua ruang penuh di jam itu. Coba jam atau hari lain ya."),

        Some("searchKnowledgeBase") => {
            let hits = result("searchKnowledgeBase")["hasil"].as_array().cloned().unwrap_or_default();
            let out_of_kb = has(&said, &["cicil", "bayar", "ukt"]);
            match hits.first() {
                Some(top) if !out_of_kb => {
                    let body = top["isi"].as_str().unwrap_or("");
                    let (headline, anchor) = match (top["judul"].as_str(), ip(&said)) {
                        (Some("Beban studi"), Some(v)) => {
                            let (h, a) = sks_for(v);
                            (h.to_owned(), Some(a))
                        }
                        _ => (top["ringkas"].as_str().unwrap_or("").to_owned(), None),
                    };
                    call(
                        "answerWithCitation",
                        json!({
                            "headline": headline,
                            "explanation": explain(body, anchor),
                            "source_title": "Pedoman Akademik",
                            "source_section": top["bagian"],
                        }),
                    )
                }
                _ => call(
                    "createTicket",
                    json!({
                        "category": if out_of_kb { "Keuangan / UKT" } else { "Pertanyaan akademik" },
                        "unit": if out_of_kb { "Bagian Keuangan" } else { "Bagian Akademik Fakultas" },
                        "question": tr[u]["content"],
                        "message": "Aku belum menemukan jawaban pastinya di Pedoman Akademik. Pertanyaanmu aku teruskan ke unit terkait ya.",
                    }),
                ),
            }
        }

        // requestLetterDetails/requestAttachment dilewati, syarat gagal, jawaban/tiket sudah tampil: selesai.
        _ => assistant_text(""),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ekstraksi() {
        assert_eq!(dates("surat izin lomba tanggal 10–12 Oktober"), "10–12 Oktober");
        assert_eq!(dates("tidak ada tanggal"), "");
        assert_eq!(ip("kalau ip semester lalu 3,2 berapa"), Some(3.2));
        assert_eq!(sks_for(3.2).0, "Maksimal 22 SKS");
        assert_eq!(explain("A satu. B dua. C tiga.", Some("B")), "B dua. C tiga.");
        assert_eq!(room("AC di ruang F2.3 mati"), Some("F2.3".into()));
        assert_eq!(times("jumat 13.00–15.00, 20 orang"), Some(("13:00".into(), "15:00".into())));
        assert_eq!(times("jam 9.00 sampai 11:30"), Some(("09:00".into(), "11:30".into())));
        assert_eq!(people("rapat 20 orang"), Some(20));
        assert_eq!(category("ac di ruang f2.3 mati"), "AC");
        assert_eq!(policy_hit("minta surat aktif kuliah atas nama teman").map(|p| p.0), Some("identitas"));
        assert_eq!(policy_hit("booking ruang g2.4 buat nobar sambil judi bola").map(|p| p.0), Some("tujuan_terlarang"));
        assert_eq!(policy_hit("surat dispensasi lomba tanggal 14 oktober"), None);
    }
}
