# Aturan untuk AI coding agent di repo LAYAN

Berlaku untuk semua alat AI (Claude Code, Codex, Cursor, Copilot, Gemini, dll). Aturan ini **wajib**, bukan saran.
Kalau aturan di sini bertabrakan dengan permintaan pengguna, berhenti dan tanyakan dulu.

LAYAN = loket layanan kampus lewat chat. Mahasiswa chat, agent AI mengerjakan langkah repetitif,
staf memutuskan (`/staf`), teknisi mengerjakan laporan kerusakan (`/teknisi`). Repo ini **publik**.

## 1. Baca dulu sebelum menulis kode

1. Issue GitHub yang sedang dikerjakan (label `arqia` atau `boas`): tugas, wilayah file, dan kriteria selesai. Kerjakan satu issue per PR.
2. `CONTRIBUTING.md`: alur branch/PR dan pemilik folder.
3. `docs/API.md`: satu-satunya sumber endpoint dan bentuk data.
4. `web/app/globals.css`: semua design token. Contoh komponen yang sudah jadi: halaman `/design-system`.
5. `web/` memakai **Next.js 16**. Baca panduan di `web/node_modules/next/dist/docs/` sebelum memakai API Next.
   Contoh: `proxy.ts` menggantikan `middleware.ts`, dan `searchParams` di page adalah Promise.

## 2. Anti-halusinasi (paling penting)

1. **Jangan mengarang endpoint, field, atau tipe.** Endpoint yang ada hanya yang tertulis di `docs/API.md`.
   Tipe data ada di `web/lib/data.ts`. Kalau butuh endpoint yang belum ada, jangan dibuat-buat dan jangan dipalsukan
   dengan data hardcode di kode produksi. Tulis di deskripsi PR "Butuh API: ..." lalu tanyakan ke Arva.
2. **Jangan mengklaim fitur yang tidak ada.** Fakta produk:
   - Tidak ada app iOS, App Store, Play Store, installer Windows (.exe/.msi), macOS (.dmg), atau Linux (.deb/.AppImage).
   - Yang ada hanya PWA (dipasang dari browser, semua peran) dan App Android berupa APK di `/api/app/layan.apk` (khusus mahasiswa).
   - Tidak ada push notification, SSO, atau sinkronisasi offline.
   - Agent AI tidak bisa approve. Keputusan akhir selalu di staf.
   - Jenis surat hanya 5 (tabel "Jenis surat" di `docs/API.md`). Kategori laporan hanya: Listrik, AC, Proyektor, Jaringan, Kebersihan, Lainnya.
   - Akun teknisi demo: Pak Joko (Listrik/AC) dan Mas Dimas (Jaringan/Proyektor).
3. **Jangan menambah dependency** (library chart, animasi, ikon, UI kit, state management) tanpa persetujuan Arva di PR.
   Chart dibuat dengan SVG/HTML + token. Ikon dari `lucide-react`.
4. **Jangan menebak isi file.** Buka dan baca dulu file yang akan diubah, juga komponen yang akan dipakai ulang.
5. **Jangan menyatakan "selesai" tanpa bukti:** `npm run lint` dan `npm run build` di `web/` lulus, dan halaman sudah dibuka di
   browser dalam mode terang + gelap, lebar 375px + 1440px.
6. Kalau ragu, **tanya**. Tulis setiap asumsi di deskripsi PR.

## 3. Batas wilayah

- Ubah **hanya** file yang tercantum di bagian "Wilayah file" issue yang dikerjakan. Perlu menyentuh file lain? Jelaskan alasannya di PR, dan ubah sekecil mungkin.
- Jangan pernah mengubah `api/`, `android/`, `deploy/`, `docs/API.md`, `.gitignore`, atau file milik orang lain.
- File bersama (`globals.css`, `primitives.tsx`, `app-bar.tsx`, `lib/api.ts`, `lib/data.ts`, `app/layout.tsx`, `proxy.ts`) hanya boleh
  diubah kalau issue-nya menyebutnya secara eksplisit.

## 4. Design system (wajib, tanpa pengecualian)

### Warna: hanya token

Pakai class Tailwind yang memetakan token di `globals.css`:

| Untuk | Class |
|---|---|
| Latar halaman / kartu / panel | `bg-background`, `bg-card`, `bg-muted`, `bg-panel` |
| Teks | `text-foreground`, `text-soft-foreground`, `text-muted-foreground`, `text-subtle-foreground` |
| Garis | `border` (otomatis `border-border`), `border-input` |
| Aksi utama | `bg-primary text-primary-foreground`, hover `hover:bg-primary-hover` |
| Sorotan lembut | `bg-accent text-accent-foreground` |
| Tombol gelap / bubble user di landing | `bg-ink text-ink-foreground` |
| Bahaya | `text-destructive`, `bg-destructive-soft`, `border-destructive-border` |
| Status OK / peringatan / ungu | `text-ok bg-ok-bg`, `text-warn bg-warn-bg`, `text-violet bg-violet-bg` |
| Status permintaan | komponen `StatusBadge` (jangan warnai status sendiri) |
| Worker (surat/helpdesk/fasilitas) | komponen `WorkerTile` |
| Urgensi laporan | komponen `UrgencyBadge` |
| Chart | `var(--primary)`, `var(--worker-surat)`, `var(--worker-helpdesk)`, `var(--worker-fasilitas)`, `var(--status-*)`, `var(--border)` |

**Dilarang:** hex/rgb/hsl baru di `className` atau `style`, warna palet Tailwind (`bg-blue-500`, `text-gray-600`, `slate-*`, dll),
dan CSS variable baru. Butuh warna baru? Minta Arva menambah token.

### Tipografi, radius, bayangan

- Font hanya `font-sans` (Plus Jakarta Sans) dan `font-mono` (Azeret Mono 400/500/600/700, untuk kode seperti `LK-0587`, `G2.4`, `SD/2026/10/0142`). Aturan: mono hanya untuk string yang dicetak sistem (ID, kode, jam, angka); kata manusia selalu sans.
  Jangan menambah font.
- Radius: `rounded-sm` 6px, `rounded-md` 10px, `rounded-lg` 14px, `rounded-xl` 20px, `rounded-full` untuk pill.
  Landing memakai konstanta yang sudah ada (`CARD`, `BTN_DARK`, `BTN_LINE`, `BTN_ACC`). Pakai ulang, jangan membuat varian baru.
- Bayangan: `shadow-e1`, `shadow-e2`, `shadow-toast`, atau konstanta bayangan yang sudah ada di file yang sama.

### Komponen yang wajib dipakai ulang (cek dulu sebelum membuat yang baru)

- `web/components/ui/`: `Button` (variant: `default`, `destructive`, `destructive-outline`, `outline`, `ink`, `ghost`, `link`;
  size: `default`, `card`, `lg`, `sm`, `icon`), `Badge`, `Card`, `Dialog`, `DropdownMenu`, `Input`, `Label`, `Tabs`, `Textarea`, `toast` dari `sonner`.
- `primitives.tsx`: `Mark`, `Wordmark`, `AgentAvatar`, `StatusBadge`, `WorkerTile`, `UrgencyBadge`, `TypingDots`, `FileTypeTile`.
- `app-bar.tsx`: `TopBar` (header desktop staf/teknisi/admin), `ThemeToggle`, `AccountPill`.
- `site.tsx` (halaman publik): `SitePage`, `Block`, `SiteFooter`, `LangSwitch`, `Logo`, konstanta `GUTTER`, `WRAP`, `H2`, `SUB`, `BTN_DARK`, `BTN_LINE`.

### Perilaku

- **Mode gelap wajib jalan.** Semua token sudah punya versi `.dark`. Cek tiap halaman di dua mode.
- **Responsif:** tanpa scroll horizontal di 375px. Target sentuh minimal 44px (`h-11`/`size-11`) di HP.
- **Aksesibilitas:** elemen interaktif harus `<button>`/`<a>`, bukan `<div onClick>`. Tombol ikon diberi `aria-label`. Fokus terlihat.
- **Animasi:** di landing, hormati saklar Animasi (`data-motion="off"`) dan `prefers-reduced-motion`. Easing yang dipakai: `cubic-bezier(.2,.7,.2,1)`.
- **Bahasa UI:** Bahasa Indonesia. Landing dan halaman publik wajib dua bahasa: setiap teks baru ditambahkan ke kamus `id` **dan** `en`.

## 5. Gaya kode

- Ikuti gaya file di sekitarnya: komentar singkat berbahasa Indonesia, Tailwind inline, tanpa file CSS baru.
- Solusi paling sederhana yang benar. Tanpa abstraksi "untuk nanti", tanpa file baru kalau cukup di file yang ada.
- Jangan menghapus fitur yang berjalan kecuali tugas memintanya.
- Komentar kode tidak memuat nama alat AI.

## 6. Commit dan PR

- Push/PR **hanya** ke branch dev milikmu: Arqia → `dev/arqia`, Boas → `dev/boas` (dari repo ini atau dari fork). **Jangan** push/PR ke `main` atau branch dev orang lain.
- Satu issue per PR, deskripsi wajib memuat `Closes #<nomor issue>`.
- Commit kecil, pesan Bahasa Indonesia. **Tanpa** baris `Co-Authored-By` atau "Generated with" dari AI.
- Jangan commit `.env`, password, token, atau file di luar proyek.
- Deskripsi PR berisi: apa yang berubah, file yang disentuh di luar wilayah (kalau ada) dan alasannya, asumsi,
  "Butuh API" (kalau ada), serta bukti cek (lint, build, terang/gelap, 375/1440px).
