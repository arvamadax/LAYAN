# Skrip demo LAYAN (sekitar 7 menit)

Tema: agent AI sebagai digital worker kampus. Yang ditunjukkan: pekerjaan repetitif diambil agent,
staf hanya memutuskan, dan dampaknya terukur dari audit log.

## Persiapan (10 menit sebelum demo)

1. Reset data demo di server (akun dan laporan awal dibuat ulang otomatis):
   ```bash
   ssh -t home-server-cf "sudo systemctl stop layan-api && rm -f ~/layan/api/layan.db* && rm -rf ~/layan/api/uploads && sudo systemctl start layan-api"
   ```
2. Buka tiga layar:
   - HP: app LAYAN (atau https://layan.codewithus.me), login **Raka** `245150200111001`
   - Laptop tab 1: Staff Console, login `sari@staf.layan.test`
   - Laptop tab 2 (jendela samaran): Board Teknisi, login `joko@staf.layan.test`
3. Password akun demo server ada di `~/layan/api/.env` (baris `SEED_PASSWORD`). Siapkan satu PDF kecil di HP sebagai "undangan lomba".

## Alur

**1. Surat Dispensasi (Raka, HP)**
- Ketuk "Minta surat". Agent mengambil profil dan langsung menampilkan form. Mahasiswa tidak perlu mengisi nama, NIM, atau prodi.
- Isi "Gemastik 2026" dan "Struktur Data, Sistem Digital", lalu upload PDF.
- Tunjukkan checklist langkah yang berjalan sendiri: cek status aktif, UKT, lampiran → draft → kirim ke staf.
- Poin: *di loket biasa ini 10–15 menit kerja staf. Di sini staf belum menyentuh apa pun.*

**2. Keputusan staf (Staff Console)**
- Item Raka sudah ada di antrean: ringkasan dari agent, hasil cek syarat, lampiran, preview surat, dan timeline tool yang dipanggil agent.
- Klik **Approve**. Nomor surat terbit, dan HP Raka menerima "Surat selesai" dalam 5 detik. Buka surat → Simpan PDF.
- Poin: *keputusan tetap di manusia, pekerjaan menyiapkannya tidak.*

**3. Helpdesk (Raka)**
- "Batas maksimal SKS kalau IP semester lalu 3,2 berapa?" → jawaban "Maksimal 22 SKS" beserta bagian sumbernya.
- "Masih bingung? Buat tiket" → tiket masuk tab Tiket di Staff Console → **Balas** → jawaban muncul di chat Raka.

**4. Booking ruang (Raka atau akun Nadia)**
- "Mau booking ruang rapat Jumat 13.00–15.00, 20 orang".
- Agent tahu G2.4 bentrok (rapat dosen), lalu menawarkan G1.2, F2.3, atau G2.4 jam 15.00. Pilih → ruang ditahan 24 jam → staf konfirmasi.

**5. Laporan kerusakan (akun Bima)**
- "AC di ruang F2.3 mati, panas banget" → sudah ada laporan yang sama, jadi **digabung** (pelapor bertambah), bukan tiket baru.
- Di Board Teknisi, Pak Joko menggeser kartu ke Dikerjakan → Selesai. Bima dikabari otomatis lewat chat.

**6. Syarat tidak lolos (Bima)**
- Bima minta surat dispensasi → agent menahannya karena UKT belum lunas, dengan alasan dan langkah berikutnya.
- Poin: *kasus yang pasti ditolak tidak pernah sampai ke meja staf.*
- Raka menulis "minta surat aktif kuliah atas nama teman" → agent **menolak otomatis** karena melanggar ketentuan
  (card "Cek ketentuan layanan"). Di Staff Console tab **Ditolak otomatis**, staf bisa mengonfirmasi atau membatalkannya.

**7. Dampak (Staff Console, baris metrik)**
- Tunjukkan "Selesai otomatis" (persen tanpa staf) dan "Waktu staf dihemat". Keduanya dihitung dari audit log, bukan angka karangan.

## Kalau sesuatu macet

- LLM lambat/error: agent otomatis pindah ke mode aturan (mock) untuk langkah itu, jadi alur tetap jalan.
- Koneksi HP putus: banner offline muncul, progres tersimpan di server.
- Server: `ssh home-server-cf "systemctl is-active layan-api layan-web"`.
