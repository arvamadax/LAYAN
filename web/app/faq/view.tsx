"use client"

import Link from "next/link"
import { Block, BTN_DARK, BTN_LINE, SitePage, useLang } from "@/components/layan/site"

// Jawaban di sini harus cocok dengan perilaku API (api/src/tools.rs, fasilitas.rs, docs/API.md).
const T = {
  id: {
    kicker: "FAQ",
    title: "Pertanyaan yang sering muncul.",
    sub: "Hal-hal yang biasanya ditanyakan sebelum mulai memakai LAYAN.",
    groups: [
      ["Memakai LAYAN", [
        ["Siapa yang bisa memakai LAYAN?", "Mahasiswa memakai chat untuk mengajukan layanan. Staf memakai Staff Console untuk menyetujui surat, menjawab tiket, dan mengonfirmasi booking. Teknisi memakai Board untuk mengerjakan laporan kerusakan."],
        ["Bagaimana cara masuk?", "Masuk dengan NIM atau email kampus beserta password akunmu. Halaman ini dan landing page bisa dijelajahi tanpa akun."],
        ["Layanan apa saja yang bisa diurus?", "Empat: surat akademik (dispensasi, keterangan aktif kuliah, pengantar magang/KP, izin penelitian, rekomendasi beasiswa), pertanyaan aturan akademik, booking ruang, dan laporan kerusakan fasilitas. Pertanyaan di luar itu ditolak dengan sopan supaya jawaban tetap fokus dan bisa dipertanggungjawabkan."],
        ["Bisa dipakai dari HP?", "Bisa. Pasang dari browser sebagai PWA, atau unduh App Android (khusus akun mahasiswa). Caranya ada di halaman Unduh."],
        ["Apakah ada app untuk iPhone, Windows, atau Linux?", "Tidak ada app di App Store, installer Windows, atau paket Linux. iPhone dan iPad dipasang sebagai PWA dari Safari (Bagikan, lalu Tambah ke Layar Utama); Windows dan Linux lewat PWA di Chrome atau Edge (ikon instal di kolom alamat). Android punya APK khusus mahasiswa, atau PWA lewat Chrome. Panduan per platform ada di halaman Unduh."],
      ]],
      ["Jawaban dan keputusan", [
        ["Bagaimana kalau AI salah menjawab?", "Jawaban aturan akademik selalu menyertakan bagian pedoman yang dikutip, jadi kamu bisa memeriksanya. Kalau jawabannya tidak ditemukan, LAYAN membuatkan tiket ke unit terkait, bukan menebak."],
        ["Apakah AI yang menyetujui surat?", "Tidak. Agent hanya mengecek syarat (status aktif, UKT, lampiran) dan menyusun draf. Persetujuan atau penolakan dilakukan staf. Nomor surat terbit otomatis setelah disetujui."],
        ["Berapa lama surat diproses?", "Tergantung antrean staf. Statusnya bisa dipantau di chat dan di halaman Riwayat, dari diajukan sampai selesai."],
        ["Apakah pedoman akademiknya resmi?", "Belum. Isi basis pengetahuan saat ini adalah contoh untuk demo. Daftar topiknya ada di halaman Keamanan & sumber."],
      ]],
      ["Ruang dan fasilitas", [
        ["Berapa lama ruang ditahan?", "Ruang yang kamu pilih ditahan 24 jam sambil menunggu konfirmasi staf. Bentrok jadwal dan kapasitas dicek otomatis, dan LAYAN menawarkan jam lain kalau penuh."],
        ["Bagaimana kalau kerusakan yang sama sudah dilaporkan orang lain?", "Laporan dobel digabung ke laporan yang sudah ada dan jumlah pelapornya bertambah, jadi teknisi tidak menerima tiket berulang."],
        ["File apa yang bisa dilampirkan?", "PDF, JPG, atau PNG, maksimal 5 MB per file. Lampiran hanya bisa dibuka olehmu, staf, dan teknisi."],
      ]],
    ] as [string, [string, string][]][],
    moreTitle: "Pertanyaanmu belum ada?",
    moreSub: "Tanyakan langsung ke LAYAN. Kalau tidak terjawab, LAYAN meneruskannya ke unit terkait sebagai tiket.",
    ask: "Tanya LAYAN", trust: "Keamanan & sumber",
  },
  en: {
    kicker: "FAQ",
    title: "Frequently asked questions.",
    sub: "Things people usually ask before they start using LAYAN.",
    groups: [
      ["Using LAYAN", [
        ["Who can use LAYAN?", "Students use the chat to request services. Staff use the Staff Console to approve letters, answer tickets, and confirm bookings. Technicians use the Board to work on damage reports."],
        ["How do I sign in?", "Sign in with your student ID (NIM) or campus email and your account password. This page and the landing page can be browsed without an account."],
        ["Which services are covered?", "Four: academic letters (dispensation, proof of enrollment, internship cover letter, research permit, scholarship recommendation), academic rule questions, room booking, and facility damage reports. Anything else is politely declined so answers stay focused and accountable."],
        ["Can I use it on my phone?", "Yes. Install it from the browser as a PWA, or download the Android app (student accounts only). See the Get the app page."],
        ["Is there an app for iPhone, Windows, or Linux?", "There is no App Store app, Windows installer, or Linux package. iPhone and iPad install it as a PWA from Safari (Share, then Add to Home Screen); Windows and Linux use a PWA in Chrome or Edge (install icon in the address bar). Android has an APK for students, or a PWA via Chrome. Per-platform guides are on the Get the app page."],
      ]],
      ["Answers and decisions", [
        ["What if the AI gets it wrong?", "Academic answers always include the quoted handbook section, so you can check it. If no answer is found, LAYAN opens a ticket to the right office instead of guessing."],
        ["Does the AI approve letters?", "No. The agent only checks requirements (active status, tuition, attachments) and drafts the letter. Staff approve or reject it. The letter number is issued automatically after approval."],
        ["How long does a letter take?", "It depends on the staff queue. You can track the status in the chat and on the History page, from submitted to done."],
        ["Is the academic handbook official?", "Not yet. The knowledge base currently holds sample content for the demo. The topic list is on the Trust & sources page."],
      ]],
      ["Rooms and facilities", [
        ["How long is a room held?", "The room you pick is held for 24 hours while staff confirm it. Schedule conflicts and capacity are checked automatically, and LAYAN offers other times when it is full."],
        ["What if someone already reported the same damage?", "Duplicate reports are merged into the existing one and its reporter count goes up, so technicians do not get repeated tickets."],
        ["What files can I attach?", "PDF, JPG, or PNG, up to 5 MB each. Attachments can only be opened by you, staff, and technicians."],
      ]],
    ] as [string, [string, string][]][],
    moreTitle: "Question not listed?",
    moreSub: "Ask LAYAN directly. If it cannot answer, LAYAN forwards it to the right office as a ticket.",
    ask: "Ask LAYAN", trust: "Trust & sources",
  },
}

export function FaqView() {
  const lang = useLang()
  const t = T[lang]
  return (
    <SitePage lang={lang} kicker={t.kicker} title={t.title} sub={t.sub}>
      {t.groups.map(([group, items]) => (
        <Block key={group} title={group}>
          <div className="divide-y rounded-[24px] border bg-card">
            {items.map(([q, a]) => (
              <details key={q} className="group px-[clamp(18px,2.4vw,28px)] [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[length:clamp(16px,1.3vw,18px)] font-semibold">
                  {q}
                  <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full border text-muted-foreground transition-transform duration-300 group-open:rotate-45">+</span>
                </summary>
                <p className="m-0 max-w-[720px] pb-6 text-[15.5px] leading-[1.65] text-soft-foreground">{a}</p>
              </details>
            ))}
          </div>
        </Block>
      ))}
      <Block title={t.moreTitle} sub={t.moreSub}>
        <div className="flex flex-wrap gap-3">
          <Link href="/app" className={BTN_DARK}>{t.ask}</Link>
          <Link href="/keamanan" className={BTN_LINE}>{t.trust}</Link>
        </div>
      </Block>
    </SitePage>
  )
}
