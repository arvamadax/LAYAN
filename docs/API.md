# Kontrak API LAYAN

Sumber kebenaran: kode di `api/src/` (route di `api/src/main.rs`). Spesifikasi OpenAPI otomatis ada di `GET /api/openapi.json`,
tapi baru mencakup sebagian request body. Dokumen ini yang dipakai PWA (`web/`) dan App Android (`android/`).
Client TS ada di `web/lib/api.ts`, client Kotlin di `android/.../data/Api.kt`, keduanya ditulis tangan.

**Perubahan kontrak** (nama field, endpoint, arti status) harus lewat PR yang menyentuh `api/` **dan** dokumen ini.

## Autentikasi

| Klien | Cara |
|---|---|
| PWA | Cookie `layan_session` (HttpOnly). Browser memanggil `/api/*` di domain yang sama, Next.js meneruskan ke Rust (`next.config.ts` rewrites). |
| Android | `Authorization: Bearer <token>` dari respons login. |

Error selalu `{ "error": "pesan siap tampil ke pengguna" }` dengan status 4xx/5xx.

## Endpoint

| Method | Path | Peran | Isi |
|---|---|---|---|
| GET | `/api/health` | publik | `"ok"` |
| GET | `/api/openapi.json` | publik | spesifikasi OpenAPI |
| POST | `/api/auth/login` | publik | body `{identifier, password}` (NIM atau email) → `{token, user}` |
| POST | `/api/auth/logout` | login | 204, cookie dihapus |
| GET | `/api/me` | login | `User` = `{id, role, name, email, nim, prodi, unit}`; `role` = `mahasiswa` \| `staf` \| `teknisi` |
| GET | `/api/chat` | mahasiswa | riwayat pesan: `ChatMessage[]` |
| POST | `/api/chat` | mahasiswa | body `{text}` (maks 2000 huruf) → **stream SSE** |
| DELETE | `/api/chat` | mahasiswa | mulai percakapan baru: hapus bubble + state agent (permintaan di Riwayat dan audit log tetap) → 204 |
| POST | `/api/chat/action` | mahasiswa | body `{message_id, action, payload}`; `action` = `submit` \| `upload` \| `ticket` \| `resume` (lanjutkan pengajuan tertunda; `message_id` diabaikan, `payload.request_id` wajib) → **stream SSE** |
| POST | `/api/attachments` | mahasiswa | multipart, satu file PDF/JPG/PNG ≤ 5 MB → `{id, name, size}`. Gambar diklasifikasi LLM (lihat Klasifikasi lampiran) |
| GET | `/api/attachments/{id}` | pemilik, staf, teknisi | isi file |
| GET | `/api/requests` | mahasiswa | riwayat permintaan: `[{id, worker, kind, title, status, time, meta, active}]` |
| POST | `/api/requests/{id}/cancel` | mahasiswa | batalkan permintaan milik sendiri yang belum selesai → `{ok, status}` |
| GET | `/api/requests/{id}` | mahasiswa | detail: `{id, worker, kind, title, status, fields, steps, letter, letter_no, approved_by, approved_at, reject_reason, student}` |
| GET | `/api/staff/queue` | staf | antrean: `[{id, worker, tab, type, name, nim, prodi, time, mins, line, summary, checks, attachments, letter, timeline, ...}]` |
| POST | `/api/staff/requests/{id}/decide` | staf | body `{approve, reason?, answer?}`; `reason` wajib saat menolak, `answer` wajib saat menjawab tiket |
| POST | `/api/staff/requests/{id}/undo` | staf | batalkan keputusan |
| GET | `/api/staff/auto-rejected` | staf | permintaan yang ditolak otomatis agent karena melanggar ketentuan, 14 hari terakhir, terbaru dulu: `[{id, worker, type, name, nim, prodi, time, rule, rule_label, reason, summary, reviewed_by, timeline}]`; `reviewed_by` terisi kalau staf sudah mengonfirmasi penolakannya |
| POST | `/api/staff/requests/{id}/review` | staf | body `{reopen}` → `{title, sub}`. `reopen: false` = penolakan benar (dicatat). `reopen: true` = penolakan dibatalkan: surat dan booking kembali `needs_info` (mahasiswa lanjut lewat chat), tiket kembali `submitted` (masuk antrean); mahasiswa dikabari lewat chat. Hanya untuk permintaan `rejected` yang ditolak otomatis |
| GET | `/api/staff/metrics` | staf | `{tokens, total, by, avg_minutes, auto, handled, auto_pct, saved_minutes}` |
| GET | `/api/staff/metrics/daily?days=30` | staf | tren harian WIB, hari kosong tetap ada (0), urut lama ke baru: `[{date: "YYYY-MM-DD", total, auto, surat, tiket, booking, laporan}]`; `days` 1-90, default 30. Rumus `total`/`auto` sama dengan `/api/staff/metrics` |
| GET | `/api/reports` | staf, teknisi | kartu laporan kerusakan, terbaru dulu: `[{id, room, title, category, urgency, status, assignee, tech, reporters, photo, note, time, updated, created_at, updated_at}]`; `created_at`/`updated_at` detik unix, `note` alasan eskalasi atau null |
| POST | `/api/reports/{id}/status` | teknisi | body `{status, note?}` → `{ok, notified}`. Alur: `baru→dikerjakan` (Terima), `dikerjakan→selesai`, `dikerjakan→eskalasi`, `eskalasi→selesai`; lainnya 400. `note` wajib saat `eskalasi` (≥ 10 huruf). Pelapor dikabari lewat chat saat `selesai` dan `eskalasi`; permintaannya berstatus `processing` selama eskalasi |
| GET | `/api/admin/overview` | admin | pemantauan: `{activity: [{at, ip, action, detail, name, email, role}], users: [{name, email, role, ai_calls, tokens, chats, requests, ips, last}], requests}` |
| GET | `/api/public/stats` | publik | hitungan tanpa data pribadi untuk halaman `/uptime` (khusus admin): `{requests, requests_week, answers, fixed_week, auto_pct_week}` |
| GET | `/api/app/latest` | publik | rilis App Android terbaru (404 kalau belum ada), lihat di bawah |
| GET | `/api/app/layan.apk` | publik | file APK terbaru; dipakai tombol "Unduh Android" di landing |

Peran yang salah dijawab 403. Detail field lengkap: lihat `json!` di `api/src/requests.rs` dan `api/src/board.rs`.

## Status permintaan

`submitted` → `processing` → `needs_info` / `pending_approval` → `approved` / `rejected` → `done`
(`cancelled` = dibatalkan mahasiswa, terminal; `rejected` = ditolak staf, atau ditolak otomatis agent kalau
`data.auto_rejected` = true, lihat "Ketentuan layanan")
(label Indonesia ada di `web/lib/data.ts`, `STATUS_LABEL`).

## Stream SSE (`POST /api/chat`, `POST /api/chat/action`)

Respons `text/event-stream`. Tiap event punya nama dan `data` JSON:

| Event | data |
|---|---|
| `status` | `{label, steps, step}` progres langkah agent (checklist di UI) |
| `message` | `{message: ChatMessage}` pesan baru dari agent |
| `update` | `{id, state}` ubah state action card yang sudah ada |
| `error` | `{message}` |
| `done` | selalu event terakhir |

`ChatMessage` = `{id, sender: "user"|"agent", text, file: {name,size}|null, card: Card|null, time}`.

## Action card

`Card` = `{kind, state, data}`; `state` = `active` \| `submitted` \| `skipped` \| `cancelled`.
Ada 10 `kind`: `form`, `upload`, `checks`, `draft`, `answer`, `ticket` (`api/src/tools.rs`),
`rooms`, `held`, `report` (`api/src/fasilitas.rs`), `done` (`api/src/requests.rs`).
Bentuk `data` tiap kind: lihat produsen di file tersebut dan renderer di `web/components/layan/action-cards.tsx`
(PWA) atau `android/.../ui/Cards.kt` (Android).

`checks`: `data = {checks: [{ok, label, note}], footer: {note}|null, policy?}`. `policy: true` berarti card ini hasil
penolakan otomatis karena melanggar ketentuan layanan (judul "Cek ketentuan layanan"), bukan cek syarat surat.

### Card surat (`form`, `upload`)

Isian surat ditentukan server, klien cukup merender ulang:

- `form`: `data = {title, fields: [{key, label, placeholder, helper}]}`. Aksi `submit` mengirim `payload` berisi
  `{<key>: "nilai", ...}` untuk setiap field. Khusus `courses` (dispensasi), isinya dipisah koma.
- `upload`: `data = {title}`, judul lampiran yang diminta (mis. "Bukti kegiatan", "Proposal penelitian").

## Ketentuan layanan (penolakan otomatis)

Agent boleh menolak langsung permintaan yang **jelas** melanggar ketentuan (tool `rejectByPolicy`, daftar di `POLICY`
`api/src/tools.rs`). Kalau ragu, agent tidak menolak dan staf yang memutuskan. Penolakan tercatat di audit log,
muncul di `/staf/tinjau`, dan bisa dibatalkan staf (`POST /api/staff/requests/{id}/review`).

| `rule` | Ketentuan |
|---|---|
| `identitas` | Mengajukan atas nama orang lain atau memakai NIM, akun, atau data orang lain |
| `data_palsu` | Meminta isi yang tidak benar: kegiatan fiktif, tanggal dimundurkan, IPK/nilai diubah, tanda tangan/stempel dipalsukan |
| `tujuan_terlarang` | Tujuan yang melanggar hukum atau aturan kampus: judi, miras, kampanye politik praktis, berjualan tanpa izin |
| `pelecehan` | Isi kasar, ancaman, pelecehan, atau SARA |

Data permintaan: `{auto_rejected: true, policy_rule, reject_reason}`; setelah dibuka lagi: `{policy_override: true, reviewed_by}`.
Metrik menghitung `rejectByPolicy` sebagai "selesai tanpa staf" (sama seperti syarat yang tidak terpenuhi).

## Jenis surat

Semua jenis memakai worker `surat`, alur tool yang sama, dan bentuk surat `{title, body1, body2}`. Definisinya ada di
`LETTERS` (`api/src/tools.rs`). `requests.data.type` menyimpan key-nya; permintaan lama tanpa `type` dianggap dispensasi.

| `type` | Surat | Prefiks nomor | Lampiran | Syarat tambahan |
|---|---|---|---|---|
| `dispensasi` | Surat Dispensasi | `SD` | Bukti kegiatan | - |
| `aktif` | Surat Keterangan Aktif Kuliah | `SKA` | - | - |
| `magang` | Surat Pengantar Magang/KP | `SPM` | - | semester ≥ 5 |
| `penelitian` | Surat Izin Penelitian/Survei | `SIP` | Proposal penelitian | - |
| `beasiswa` | Surat Rekomendasi Beasiswa | `SRB` | - | IPK ≥ 3,00 |

Syarat umum semua jenis: status aktif dan UKT lunas. Detail permintaan (`GET /api/requests/{id}`) dan antrean staf
menampilkan isian surat sebagai `fields: [[label, nilai], ...]`.

## Klasifikasi lampiran

Setiap JPG/PNG yang diupload dikirim ke LLM (`Llm::classify_image`, `api/src/llm.rs`) dan diberi label di
`attachments.label`: `dokumen`, `foto`, atau `lainnya`.

- `tidak_pantas` (ketelanjangan, seksual, kekerasan, atau diblokir filter keamanan provider): upload ditolak 400, file tidak disimpan.
- Lampiran surat (`requestAttachment`) wajib berlabel `dokumen`, selain itu aksi `upload` ditolak dengan pesan untuk upload ulang.
- Foto laporan kerusakan cukup lolos cek `tidak_pantas`.
- Label `NULL` (PDF, agent mock, atau LLM gagal) tetap diterima; staf memeriksa saat approve. Antrean staf menampilkan
  label di `meta` lampiran (`... · dicek AI: dokumen`).

## Admin dan log akses

Peran `admin` hanya membuka `/admin`. Login (berhasil dan gagal), chat ke AI, aksi card, dan upload dicatat di
`access_log` beserta IP pengguna (`CF-Connecting-IP` dari Cloudflare Tunnel, cadangan `X-Forwarded-For`).
Akun admin, juri, dan teknisi ada di `api/accounts.json` (di-gitignore, contoh di `accounts.example.json`).

## Update App Android

`GET /api/app/latest` mengembalikan isi `latest.json` yang ditulis `deploy/release-android.sh`:

```json
{ "versionCode": 2, "versionName": "1.1", "notes": "…", "sha256": "…", "minVersionCode": 0, "url": "/api/app/layan.apk?v=2" }
```

App membandingkan `versionCode` dengan versinya sendiri, mengunduh `url`, mencocokkan `sha256`, lalu membuka installer.
Versi terpasang di bawah `minVersionCode` mendapat dialog wajib (tanpa tombol "Nanti").
