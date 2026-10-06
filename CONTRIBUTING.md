# Cara berkontribusi

## Siapa memegang apa

| Folder | Pemilik |
|---|---|
| `api/`, `android/`, `deploy/`, `docs/`, `PLAN.md`, `DEMO.md` | Arva (backend + Android) |
| `web/app/app/**`, `web/app/surat/**`, `components/layan/{chat,action-cards,history,letter,letter-view}.tsx`, `web/app/design-system` | Arva: PWA mahasiswa |
| `web/app/staf/**`, `web/app/teknisi/**`, `components/layan/{staff-console,board}.tsx` | Arqia: Staff Console + Board Teknisi (issue label `arqia`) |
| `web/app/page.tsx` (landing), halaman publik (`faq`, `unduh`, `keamanan`, `untuk-staf`, `untuk-teknisi`), `components/layan/{landing,student-flows,site}.tsx` | Boas: landing + halaman publik (issue label `boas`) |
| `primitives.tsx`, `app-bar.tsx`, `globals.css`, `lib/api.ts`, `app/layout.tsx`, `proxy.ts` | bersama: PR kecil, di-review orang lain |

PWA dan App Android itu dua produk terpisah (tabel lengkapnya di `PLAN.md`). Keduanya hanya bertemu di API: `docs/API.md`.
Mengubah bentuk data dari API? Buka PR yang mengubah `api/` dan `docs/API.md` sekaligus.

## Alur kerja

1. Baca [`AGENTS.md`](AGENTS.md) (wajib juga untuk AI yang kamu pakai) dan issue yang ditugaskan ke kamu ([Issues](https://github.com/arvamadax/LAYAN/issues), label `arqia` / `boas`). Branch kerja masing-masing: **Arqia → `dev/arqia`**, **Boas → `dev/boas`**. Push (atau PR dari fork) hanya ke branch dev milikmu sendiri.
2. Commit kecil, satu issue per PR ke `dev/<nama>`, deskripsi PR wajib memuat `Closes #<nomor issue>`. Push/PR ke `main` atau ke branch dev orang lain ditandai gagal oleh workflow "Batas branch". Review oleh minimal satu orang lain; perubahan yang menyentuh kontrak API di-review Arva.
3. `main` dikunci: hanya Arva yang merge `dev/<nama>` → `main` (issue tertutup saat itu) dan deploy ke server.
4. Repo ini **publik**: jangan commit password, `.env`, keystore, atau file dari luar proyek. Pesan commit tanpa jejak alat AI (tanpa `Co-Authored-By` AI).

## Jalankan lokal (PWA saja, tanpa Rust)

```bash
cd web && npm install
API_URL=https://layan.codewithus.me npm run dev      # http://localhost:3000, /api diteruskan ke server demo
```

Data di server demo dipakai bersama: jangan hapus atau menghabiskan kuota AI dengan uji berulang. Login memakai akun demo
(NIM/email di `api/src/seed.rs`, password diminta ke Arva).

Kalau mau menjalankan API sendiri: lihat bagian "Menjalankan lokal" di `README.md`.

## Rilis App Android (Arva)

Sekali saja, di laptop yang merilis (keystore **jangan** di-commit, simpan cadangannya; kehilangan keystore = pengguna harus install ulang):

```bash
keytool -genkeypair -v -keystore android/layan-release.jks -alias layan -keyalg RSA -keysize 2048 -validity 10000
```

Lalu buat `android/keystore.properties`:

```properties
storeFile=layan-release.jks
storePassword=...
keyAlias=layan
keyPassword=...
```

Tiap rilis: naikkan `versionCode` (dan `versionName`) di `android/app/build.gradle.kts`, lalu
`NOTES="apa yang berubah" bash deploy/release-android.sh`. App yang terpasang menawarkan pembaruan saat dibuka.

## Catatan Next.js

`web/` memakai Next.js 16. Sebelum menulis kode, baca panduan yang sesuai di `web/node_modules/next/dist/docs/`
(misalnya `proxy.ts` menggantikan middleware). Sebelum PR: `npm run lint && npm run build`.

## Peta rute web

| Rute | Untuk |
|---|---|
| `/` | landing page (publik) |
| `/login` | masuk semua peran |
| `/app`, `/app/riwayat`, `/app/riwayat/[id]` | PWA mahasiswa |
| `/surat/[id]` | surat siap cetak |
| `/staf` | Staff Console |
| `/teknisi` | Board Teknisi |
| `/version` | id build untuk notifikasi update (jangan dihapus) |
