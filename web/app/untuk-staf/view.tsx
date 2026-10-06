"use client"

import Link from "next/link"
import { Block, BTN_DARK, CheckIcon, SitePage, useLang } from "@/components/layan/site"

// Tutorial Staff Console. Label mengikuti aplikasi setelah issue Arqia (#6):
// Antrean, Metrik, Setujui, Tolak, Balas, Batalkan.
const T = {
  id: {
    kicker: "Untuk staf",
    title: "Staf cukup memutuskan.",
    sub: "Agent mengerjakan langkah yang berulang: cek syarat, isi draf, cari ruang. Staf menerima pekerjaan yang sudah rapi, lalu memutuskan di tab Antrean.",
    cmpTitle: "Dulu dan dengan LAYAN",
    cmpHead: ["Layanan", "Dulu", "Dengan LAYAN"],
    cmp: [
      ["Surat akademik", "Mahasiswa datang ke loket, staf mengecek syarat dan mengetik surat satu per satu.", "Syarat dicek dan draf disusun agent. Staf tinggal menyetujui, nomor surat terbit otomatis."],
      ["Aturan akademik", "Pertanyaan yang sama dijawab berulang lewat chat pribadi.", "Dijawab dengan kutipan pedoman. Yang belum pasti masuk sebagai tiket ke unit."],
      ["Booking ruang", "Jadwal dicek manual, rawan bentrok.", "Bentrok dan kapasitas dicek otomatis, ruang ditahan 24 jam sambil menunggu konfirmasi."],
      ["Laporan kerusakan", "Kerusakan yang sama dilaporkan berkali-kali oleh banyak orang.", "Laporan dobel digabung dan langsung masuk ke teknisi dengan tingkat urgensi."],
    ],
    consoleTitle: "Staff Console",
    consoleSub: "Satu antrean untuk surat, tiket, dan booking. Setiap kartu datang dengan syarat yang sudah dicek.",
    consoleFeat: ["Syarat, lampiran, dan draf surat terlihat di satu kartu", "Setujui atau tolak dengan alasan, bisa dibatalkan", "Metrik harian: berapa yang selesai tanpa staf dan perkiraan waktu yang dihemat"],
    queue: [["Rina Ayu", "Surat dispensasi", "2 mnt"], ["Bagas P.", "Booking G2.4", "9 mnt"], ["Dewi S.", "Tiket akademik", "14 mnt"]],
    checks: ["Status aktif", "UKT lunas", "Lampiran ada"],
    approve: "Setujui", reject: "Tolak",
    sample: "Contoh tampilan",
    stepsTitle: "Cara memakai dalam 7 langkah",
    steps: [
      ["Masuk dengan akun staf", "Buka halaman Masuk, lalu masuk dengan akun staf. Kamu langsung diarahkan ke tab Antrean."],
      ["Buka tab Antrean", "Daftar permintaan terurut dari yang paling lama menunggu. Tiap baris menampilkan jenis, nama, prodi, dan lama menunggu. Tab Semua, Surat, Tiket, dan Booking punya badge jumlah, plus kolom cari nama atau NIM."],
      ["Pilih satu permintaan", "Item yang sedang dibuka terlihat jelas aktif. Di HP, ketuk item untuk membuka detail, lalu pakai tombol kembali untuk ke antrean."],
      ["Baca cek syarat, lampiran, dan preview surat", "Satu kartu berisi hasil cek syarat oleh agent, lampiran dari mahasiswa, dan preview draf surat yang sudah disusun."],
      ["Putuskan: Setujui, Tolak, atau Balas", "Setujui untuk menerbitkan surat. Tolak wajib disertai alasan. Tiket akademik dijawab dengan Balas."],
      ["Batalkan untuk membatalkan keputusan", "Keputusan yang baru diambil bisa dibatalkan lewat toast Batalkan."],
      ["Buka tab Metrik", "Ringkasan hasil kerja agent: berapa permintaan selesai otomatis, perkiraan waktu staf yang dihemat, dan token AI per permintaan."],
    ] as [string, string][],
    staff: "Masuk sebagai staf",
  },
  en: {
    kicker: "For staff",
    title: "Staff just decide.",
    sub: "The agent does the repetitive steps: checking requirements, drafting, finding rooms. Staff receive work that is already organized, then decide in the Queue tab.",
    cmpTitle: "Before and with LAYAN",
    cmpHead: ["Service", "Before", "With LAYAN"],
    cmp: [
      ["Academic letters", "Students come to the counter, staff check requirements and type each letter.", "The agent checks requirements and drafts. Staff just approve, the letter number is issued automatically."],
      ["Academic rules", "The same questions are answered again and again in private chats.", "Answered with handbook quotes. Unclear ones become tickets to the office."],
      ["Room booking", "Schedules are checked by hand and clash easily.", "Conflicts and capacity are checked automatically, rooms are held 24 hours pending confirmation."],
      ["Damage report", "The same damage is reported many times by many people.", "Duplicate reports are merged and go straight to a technician with an urgency level."],
    ],
    consoleTitle: "Staff Console",
    consoleSub: "One queue for letters, tickets, and bookings. Every card arrives with requirements already checked.",
    consoleFeat: ["Requirements, attachments, and the letter draft on one card", "Approve or reject with a reason, and undo", "Daily metrics: how many finished without staff and estimated time saved"],
    queue: [["Rina Ayu", "Dispensation letter", "2 min"], ["Bagas P.", "Booking G2.4", "9 min"], ["Dewi S.", "Academic ticket", "14 min"]],
    checks: ["Active status", "Tuition paid", "Attachment present"],
    approve: "Approve", reject: "Reject",
    sample: "Sample view",
    stepsTitle: "How to use it in 7 steps",
    steps: [
      ["Sign in with a staff account", "Open the sign-in page and sign in with a staff account. You land straight on the Queue tab."],
      ["Open the Queue tab", "Requests are sorted by longest waiting time. Each row shows the type, name, study program, and waiting time. The All, Letters, Tickets, and Bookings tabs have count badges, plus a name-or-ID search box."],
      ["Pick one request", "The open item is clearly highlighted. On phones, tap an item to open its detail, then use the back button to return to the queue."],
      ["Read the requirement check, attachments, and letter preview", "One card holds the agent's requirement check, the student's attachments, and the drafted letter preview."],
      ["Decide: Approve, Reject, or Reply", "Approve to issue the letter. Rejecting requires a reason. Academic tickets are answered with Reply."],
      ["Undo a decision", "A decision you just made can be undone from the Undo toast."],
      ["Open the Metrics tab", "A summary of the agent's work: how many requests finished automatically, estimated staff time saved, and AI tokens per request."],
    ] as [string, string][],
    staff: "Sign in as staff",
  },
}

export function StafView() {
  const lang = useLang()
  const t = T[lang]
  return (
    <SitePage lang={lang} kicker={t.kicker} title={t.title} sub={t.sub}>
      <Block title={t.cmpTitle}>
        <div className="overflow-hidden rounded-[24px] border bg-card">
          <div className="hidden grid-cols-[.8fr_1fr_1fr] gap-6 border-b bg-panel px-6 py-3 text-[11px] font-semibold uppercase tracking-[.08em] text-subtle-foreground md:grid">
            {t.cmpHead.map((h) => <span key={h}>{h}</span>)}
          </div>
          {t.cmp.map(([svc, before, after]) => (
            <div key={svc} className="grid gap-2 border-b px-6 py-5 last:border-b-0 md:grid-cols-[.8fr_1fr_1fr] md:gap-6">
              <span className="text-[16px] font-semibold">{svc}</span>
              <span className="text-[14.5px] leading-relaxed text-muted-foreground">{before}</span>
              <span className="flex items-start gap-2.5 text-[14.5px] leading-relaxed">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><CheckIcon size={11} /></span>
                {after}
              </span>
            </div>
          ))}
        </div>
      </Block>

      <Block title={t.consoleTitle} sub={t.consoleSub}>
        <div className="grid items-start gap-8 lg:grid-cols-[1.15fr_.85fr]">
          <div aria-label={t.sample} className="overflow-hidden rounded-[24px] border bg-card shadow-[0_50px_120px_-60px_rgba(22,24,26,.35)]">
            <div className="flex items-center justify-between border-b px-5 py-3.5">
              <span className="text-[14.5px] font-semibold">{t.consoleTitle}</span>
              <span className="rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{t.sample}</span>
            </div>
            <div className="grid sm:grid-cols-[.9fr_1.1fr]">
              <ul className="m-0 flex list-none flex-col border-b p-2 sm:border-r sm:border-b-0">
                {t.queue.map(([name, kind, mins], i) => (
                  <li key={name} className={`flex items-center justify-between gap-3 rounded-[14px] px-3 py-3 ${i === 0 ? "bg-accent" : ""}`}>
                    <span className="flex flex-col">
                      <span className="text-[14px] font-semibold">{name}</span>
                      <span className="text-[12.5px] text-muted-foreground">{kind}</span>
                    </span>
                    <span className="font-mono text-[11.5px] text-subtle-foreground">{mins}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-3 p-5">
                <span className="text-[15px] font-semibold">{t.queue[0][1]} · {t.queue[0][0]}</span>
                {t.checks.map((c) => (
                  <span key={c} className="flex items-center gap-2.5 text-[14px]">
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><CheckIcon size={11} /></span>
                    {c}
                  </span>
                ))}
                <div className="mt-2 flex gap-2">
                  <span className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">{t.approve}</span>
                  <span className="inline-flex h-10 items-center rounded-full border border-input px-4 text-sm font-medium">{t.reject}</span>
                </div>
              </div>
            </div>
          </div>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {t.consoleFeat.map((f) => (
              <li key={f} className="flex items-start gap-3 text-[16px] leading-relaxed">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><CheckIcon size={13} /></span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </Block>

      <Block title={t.stepsTitle}>
        <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
          {t.steps.map(([title, desc], i) => (
            <li key={title} className="flex gap-4 rounded-[20px] border bg-card p-5">
              <span aria-hidden className="text-xs font-semibold text-primary">0{i + 1}</span>
              <span className="flex flex-col gap-1.5">
                <span className="text-[16px] font-semibold">{title}</span>
                <span className="text-[14.5px] leading-relaxed text-muted-foreground">{desc}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/login?next=%2Fstaf" className={BTN_DARK}>{t.staff}</Link>
        </div>
      </Block>
    </SitePage>
  )
}
