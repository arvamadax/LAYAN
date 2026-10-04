# LAYAN

Digital campus worker. Mahasiswa mengurus layanan kampus lewat satu loket chat,
agent AI mengerjakan langkah yang repetitif (cek syarat, isi draft, cari ruang kosong,
gabung laporan dobel), staf cukup memutuskan, dan teknisi mengerjakan laporan.

Demo: https://layan.codewithus.me

## Tiga worker

| Worker | Yang dikerjakan agent | Yang tetap di manusia |
|---|---|---|
| **Surat** | ambil profil, minta data dan bukti kegiatan, cek syarat (status aktif, UKT, lampiran), susun draft dari template | staf approve/reject, nomor surat terbit otomatis |
| **Helpdesk** | cari di Pedoman Akademik, jawab dengan sumber, buat tiket kalau tidak yakin | unit membalas tiket |
| **Fasilitas** | cek bentrok dan kapasitas ruang, tawarkan jam alternatif, tahan 24 jam; laporan kerusakan dobel digabung dan langsung ke teknisi | staf konfirmasi booking, teknisi mengerjakan laporan |

Setiap aksi agent dan manusia tercatat di audit log. Dari situ Staff Console menghitung
berapa permintaan selesai tanpa staf dan perkiraan waktu staf yang dihemat.

## Struktur

```
api/       Rust (Axum + SQLx + SQLite): auth, data, agent loop + tools, SSE
web/       Next.js: landing page (/), PWA (/app mahasiswa, /staf Staff Console, /teknisi Board)
android/   Kotlin + Jetpack Compose: App Android (mahasiswa saja)
docs/      Kontrak API (docs/API.md)
deploy/    systemd unit + skrip deploy ke home server (Cloudflare Tunnel)
```

PWA dan App Android adalah dua produk terpisah yang berbagi API yang sama. Pembagian kerja: [CONTRIBUTING.md](CONTRIBUTING.md).

Agent memakai LLM format chat completions (Gemini, DeepSeek, dll). Tanpa API key, agent
tiruan berbasis aturan mengambil alih, dan juga jadi cadangan kalau LLM error atau diam.

## Menjalankan lokal

```bash
cd api && cp .env.example .env && cargo run            # API :8080, akun demo dibuat otomatis
npm --prefix web install && npm --prefix web run dev   # PWA :3000, /api diteruskan ke Rust
```

## Akun demo & juri

Login di `/login` (server demo: https://layan.codewithus.me/login).

Akun demo lokal (password = `SEED_PASSWORD` di `api/.env`):

| Peran | NIM / Email | Halaman |
|---|---|---|
| Mahasiswa | `245150200111001` / `raka@mhs.layan.test` | /app |
| Mahasiswa | `nadia@mhs.layan.test` | /app |
| Staf | `sari@staf.layan.test` | /staf |
| Teknisi | `joko@staf.layan.test` | /teknisi |

Akun juri (server demo). Setiap juri memakai satu set (mahasiswa, staf, teknisi).
Password dibagikan terpisah ke masing-masing juri, tidak disimpan di repo publik ini.

| | Mahasiswa (/app) | Staf (/staf) | Teknisi (/teknisi) |
|---|---|---|---|
| Juri 1 | `juri1-mhs-hzccc@layan.test` | `juri1-staf-62jzg@layan.test` | `juri1-tek-r75p4@layan.test` |
| Juri 2 | `juri2-mhs-atxet@layan.test` | `juri2-staf-v6vy7@layan.test` | `juri2-tek-x6x6j@layan.test` |
| Juri 3 | `juri3-mhs-yustr@layan.test` | `juri3-staf-x5k5s@layan.test` | `juri3-tek-nh54f@layan.test` |

Cara kerja seed (`api/src/seed.rs`): tabel `users` hanya diisi saat masih kosong.
Kalau file `accounts.json` ada di folder `api/` (di-gitignore, jangan commit),
akun diambil dari file itu; kalau tidak ada, akun demo dibuat dengan satu
`SEED_PASSWORD`. Contoh format: `api/accounts.example.json`. Daftar lengkap
beserta password juri dan langkah pasang di server ada di `api/AKUN-juri.md`
(lokal saja, tidak di-commit).

## Android

Buka folder `android/` di Android Studio, atau:

```bash
cd android && ./gradlew assembleDebug
```

APK ada di `android/app/build/outputs/apk/debug/`. Alamat API diatur di `android/gradle.properties` (`layan.apiBase`).

Rencana dan progres: [PLAN.md](PLAN.md). Isi Pedoman Akademik di knowledge base adalah contoh, bukan dokumen resmi.
