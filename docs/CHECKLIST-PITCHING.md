# Daftar cek sebelum pitching (±30 menit)

Jalankan berurutan, dari laptop yang akan dipakai di venue. Tujuannya: tahu lebih awal kalau ada yang rusak.

## 1. Server hidup (5 menit)

1. Buka https://layan.codewithus.me. Halaman utama harus muncul.
2. Buka https://layan.codewithus.me/api/health. Jawabannya `ok`.
3. Buka https://layan.codewithus.me/version. Nilai `v` harus sama dengan commit terbaru di `main`.
4. Kalau salah satunya gagal, jalankan di terminal (minta password sudo):

```bash
ssh -t home-server-cf "sudo systemctl restart layan-api layan-web && systemctl is-active layan-api layan-web"
```

Jangan restart `cloudflared` menjelang pitching: semua situs dan SSH putus sekitar 2 menit.

## 2. Semua akun bisa masuk (10 menit)

Masuk di `/login` satu per satu, lalu pastikan halaman tujuannya terbuka.

| Akun | Halaman yang harus terbuka |
|---|---|
| Mahasiswa demo (Raka) | `/app` |
| Staf demo (Sari) | `/staf` dan `/staf/metrik` |
| Teknisi demo (Pak Joko) | `/teknisi` dan `/teknisi/rekap` |
| Satu set akun juri (mahasiswa, staf, teknisi) | halamannya masing-masing |

Login gagal terus dari satu IP selama 10 menit akan diblokir sementara (batas 10 kali, balasan 429). Kalau terkunci, tunggu 10 menit atau ganti jaringan.

## 3. AI memakai LLM asli, bukan agent tiruan (5 menit)

1. Masuk sebagai mahasiswa demo, kirim satu pertanyaan akademik ke chat.
2. Masuk sebagai staf, buka `/staf/metrik`, lihat kartu "Token AI per permintaan".
3. Angka "panggilan LLM" harus bertambah. Kalau tetap, kuota LLM habis atau error dan agent tiruan yang menjawab. Cek kuota di https://aistudio.google.com/apikey sebelum lanjut.

## 4. Alur utama berjalan (10 menit)

Ikuti [DEMO.md](../DEMO.md) sampai selesai satu kali, di HP dan laptop. Perhatikan:

- Draft surat muncul dan nomor surat terbit setelah staf menyetujui.
- Laporan kerusakan muncul di Board teknisi, dan status berubah saat diterima.
- Untuk mengulang dari awal, reset data demo dengan perintah di bagian Persiapan DEMO.md.

## 5. Cadangan kalau demo langsung gagal

- Hotspot HP sebagai jaringan cadangan. Tes sebelum naik panggung.
- Rekaman layar satu alur penuh (surat, keputusan staf, laporan kerusakan) dan tangkapan layar tiap langkah, disimpan di laptop tanpa perlu internet.
- Server di rumah: pastikan listrik dan internet di sana tidak sedang dimatikan.

## Rollback web ke versi sebelumnya

Deploy web menyimpan versi lama di `~/layan-web.old`.

```bash
ssh -t home-server-cf "rm -rf ~/layan-web.bad && mv ~/layan-web ~/layan-web.bad && mv ~/layan-web.old ~/layan-web && sudo systemctl restart layan-web"
```

## Backup database

API menyimpan salinan harian di `~/layan/api/backups/` (7 hari terakhir). Untuk memulihkan, hentikan `layan-api`, hapus `layan.db-wal` dan `layan.db-shm` di folder itu, salin file yang dipilih menjadi `~/layan/api/layan.db`, lalu jalankan lagi.
