"use client"

import Link from "next/link"
import { Block, BTN_DARK, BTN_LINE, CheckIcon, SitePage, useLang } from "@/components/layan/site"

// Topik basis pengetahuan = isi tabel `kb` di api/migrations/0002_agent.sql. Ubah di sana, ubah juga di sini.
const T = {
  id: {
    kicker: "Keamanan & sumber",
    title: "Jawaban yang bisa kamu periksa.",
    sub: "LAYAN mengutip dokumen, bukan mengarang. Keputusan penting tetap di tangan staf, dan setiap langkah tercatat.",
    kbTitle: "Dari mana jawabannya",
    kbSub: "Pertanyaan aturan akademik dicari di Pedoman Akademik. Bagian yang dipakai ditampilkan bersama jawaban.",
    kbNote: "Isi basis pengetahuan saat ini adalah contoh untuk demo, bukan pedoman resmi kampus mana pun.",
    kb: [
      ["Beban studi", "Bab Beban Studi", "Maksimal 18 sampai 24 SKS, tergantung IP"],
      ["Cuti akademik", "Bab Status Mahasiswa", "Maksimal 2 semester, tidak berturut-turut"],
      ["Perbaikan nilai", "Bab Penilaian", "Ulang mata kuliahnya, nilai terbaik yang dipakai"],
      ["Konversi prestasi", "Bab Kegiatan Kemahasiswaan", "Bisa, besaran SKS ditetapkan prodi"],
      ["Dispensasi perkuliahan", "Bab Kehadiran", "Paling banyak 3 pertemuan per mata kuliah"],
      ["Masa studi", "Bab Masa Studi", "Paling lama 7 tahun"],
      ["Pengisian KRS", "Bab Registrasi", "Minggu sebelum kuliah, ubah paling lambat minggu kedua"],
    ],
    rulesTitle: "Batas yang dipegang AI",
    rules: [
      ["Hanya 4 layanan", "Surat akademik, aturan akademik, booking ruang, dan laporan kerusakan. Pertanyaan di luar itu ditolak dengan sopan."],
      ["Selalu dengan sumber", "Jawaban aturan akademik menyertakan bab dan bagian yang dikutip."],
      ["Tidak yakin, jadi tiket", "Kalau jawabannya tidak ada di pedoman, pertanyaan diteruskan ke unit terkait."],
      ["Staf yang memutuskan", "Agent mengecek syarat dan menyusun draf. Surat disetujui staf, booking dikonfirmasi staf."],
      ["Tetap jalan tanpa AI", "Kalau layanan AI error atau tidak merespons, agent berbasis aturan mengambil alih."],
    ],
    dataTitle: "Data kamu",
    dataSub: "Yang dijaga di sisi server, bukan sekadar disembunyikan di tampilan.",
    data: [
      "Sesi login disimpan di cookie HttpOnly, tidak bisa dibaca skrip di halaman.",
      "Hak akses dicek di server pada setiap permintaan: mahasiswa melihat pengajuannya sendiri, staf melihat antrean, teknisi melihat laporan.",
      "Lampiran hanya bisa dibuka pemiliknya, staf, dan teknisi. Format PDF, JPG, atau PNG, maksimal 5 MB.",
      "NIM dan status UKT tidak dikirim ke model AI. Pengecekan syarat dilakukan langsung di database.",
      "Setiap aksi agent dan manusia tercatat di audit log.",
    ],
    caution: "Pesan chat diproses oleh penyedia model AI untuk menyusun jawaban. Jangan kirim password atau data yang tidak diperlukan.",
    try: "Coba tanya aturan akademik", faq: "Baca FAQ",
  },
  en: {
    kicker: "Trust & sources",
    title: "Answers you can check.",
    sub: "LAYAN quotes documents instead of making things up. Important decisions stay with staff, and every step is logged.",
    kbTitle: "Where answers come from",
    kbSub: "Academic rule questions are searched in the Academic Handbook. The section used is shown with the answer.",
    kbNote: "The knowledge base currently holds sample content for the demo, not an official handbook of any campus.",
    kb: [
      ["Study load", "Chapter: Study Load", "18 to 24 credits max, depending on GPA"],
      ["Academic leave", "Chapter: Student Status", "Up to 2 semesters, not consecutive"],
      ["Grade improvement", "Chapter: Grading", "Retake the course, the best grade counts"],
      ["Achievement conversion", "Chapter: Student Activities", "Allowed, credits set by the study program"],
      ["Class dispensation", "Chapter: Attendance", "Up to 3 meetings per course"],
      ["Study period", "Chapter: Study Period", "7 years at most"],
      ["Course registration (KRS)", "Chapter: Registration", "The week before classes, changes by week two"],
    ],
    rulesTitle: "Limits the AI keeps",
    rules: [
      ["Only 4 services", "Academic letters, academic rules, room booking, and damage reports. Anything else is politely declined."],
      ["Always with a source", "Academic answers include the quoted chapter and section."],
      ["Unsure means a ticket", "If the answer is not in the handbook, the question goes to the right office."],
      ["Staff decide", "The agent checks requirements and drafts. Staff approve letters and confirm bookings."],
      ["Works without AI", "If the AI service fails or goes silent, a rule-based agent takes over."],
    ],
    dataTitle: "Your data",
    dataSub: "Protected on the server, not just hidden in the interface.",
    data: [
      "Your login session lives in an HttpOnly cookie that page scripts cannot read.",
      "Access is checked on the server for every request: students see their own requests, staff see the queue, technicians see reports.",
      "Attachments can only be opened by their owner, staff, and technicians. PDF, JPG, or PNG, up to 5 MB.",
      "Your student ID and tuition status are never sent to the AI model. Requirement checks run directly against the database.",
      "Every agent and human action is recorded in an audit log.",
    ],
    caution: "Chat messages are processed by an AI model provider to compose answers. Do not send passwords or data that is not needed.",
    try: "Ask about academic rules", faq: "Read the FAQ",
  },
}

export function KeamananView() {
  const lang = useLang()
  const t = T[lang]
  return (
    <SitePage lang={lang} kicker={t.kicker} title={t.title} sub={t.sub}>
      <Block title={t.kbTitle} sub={t.kbSub}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {t.kb.map(([title, section, gist]) => (
            <div key={title} className="flex flex-col gap-2 rounded-[20px] border bg-card p-5">
              <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-subtle-foreground">{section}</span>
              <span className="border-l-2 border-primary pl-3 text-[17px] font-semibold">{title}</span>
              <span className="text-[14px] text-muted-foreground">{gist}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-2xl bg-warn-bg px-4 py-3 text-[14px] text-warn">{t.kbNote}</p>
      </Block>

      <Block title={t.rulesTitle}>
        <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-2 lg:grid-cols-3">
          {t.rules.map(([title, desc], i) => (
            <li key={title} className="flex flex-col gap-2 rounded-[20px] border bg-card p-5">
              <span className="text-xs font-semibold text-primary">0{i + 1}</span>
              <span className="text-[17px] font-semibold">{title}</span>
              <span className="text-[14.5px] leading-relaxed text-muted-foreground">{desc}</span>
            </li>
          ))}
        </ol>
      </Block>

      <Block title={t.dataTitle} sub={t.dataSub}>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {t.data.map((d) => (
            <li key={d} className="flex items-start gap-3 text-[15.5px] leading-relaxed">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><CheckIcon size={13} /></span>
              {d}
            </li>
          ))}
        </ul>
        <p className="mt-6 max-w-[720px] border-l-2 border-input pl-4 text-[14.5px] text-muted-foreground">{t.caution}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/app?q=${encodeURIComponent(lang === "en" ? "What is the maximum length of academic leave?" : "Berapa batas maksimal cuti akademik?")}`} className={BTN_DARK}>{t.try}</Link>
          <Link href="/faq" className={BTN_LINE}>{t.faq}</Link>
        </div>
      </Block>
    </SitePage>
  )
}
