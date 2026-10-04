"use client"

import Link from "next/link"
import { Block, BTN_DARK, SitePage, useLang } from "@/components/layan/site"

// Tutorial Board Teknisi. Label mengikuti aplikasi setelah issue Arqia (#8):
// Baru, Dikerjakan, Eskalasi, Selesai, Terima, Tandai selesai, Board, Rekap bulanan.
const T = {
  id: {
    kicker: "Untuk teknisi",
    title: "Laporan beres sampai tuntas.",
    sub: "Laporan kerusakan dari chat langsung jadi kartu di Board. Ruang, kategori, urgensi, dan jumlah pelapor sudah terisi.",
    boardTitle: "Board Teknisi",
    boardSub: "Empat kolom mengikuti alur kerja: Baru, Dikerjakan, Eskalasi, Selesai.",
    cols: ["Baru", "Dikerjakan", "Eskalasi", "Selesai"],
    cards: [[0, "Proyektor mati", "F2.3", "Sedang", 3], [0, "AC bocor", "G1.2", "Tinggi", 1], [1, "Wi-Fi putus", "F3.1", "Sedang", 2], [2, "Stopkontak berasap", "G2.4", "Tinggi", 1], [3, "Lampu kedip", "G2.4", "Rendah", 1]] as [number, string, string, string, number][],
    reporters: "pelapor",
    eskalasiNote: "Alasan: stopkontak meleleh, perlu penggantian.",
    sample: "Contoh tampilan",
    stepsTitle: "Cara memakai dalam 6 langkah",
    steps: [
      ["Masuk dengan akun teknisi", "Buka halaman Masuk, lalu masuk dengan akun teknisi. Kamu langsung diarahkan ke Board."],
      ["Laporan masuk di kolom Baru", "Setiap kartu berisi ruang, kategori, urgensi, dan jumlah pelapor. Laporan dobel sudah digabung, jadi tidak ada tiket berulang."],
      ["Tekan Terima", "Status laporan berubah menjadi Dikerjakan dan masuk antrean kerjamu."],
      ["Kerjakan laporannya", "Perbaiki sarana sesuai kategori dan urgensi yang tertulis di kartu."],
      ["Tandai selesai, atau Eskalasi", "Selesai: pelapor otomatis dikabari lewat chat. Eskalasi untuk sarana rusak berat yang perlu penggantian — wajib tulis alasan."],
      ["Buka tab Rekap bulanan", "Rekap laporan per ruang dalam sebulan, bisa disimpan sebagai PDF untuk laporan."],
    ] as [string, string][],
    tech: "Masuk sebagai teknisi",
  },
  en: {
    kicker: "For technicians",
    title: "Reports handled to completion.",
    sub: "Damage reports from the chat become cards on the Board right away. Room, category, urgency, and reporter count are already filled in.",
    boardTitle: "Technician Board",
    boardSub: "Four columns follow the workflow: New, In progress, Escalated, Done.",
    cols: ["New", "In progress", "Escalated", "Done"],
    cards: [[0, "Projector broken", "F2.3", "Medium", 3], [0, "AC leaking", "G1.2", "High", 1], [1, "Wi-Fi down", "F3.1", "Medium", 2], [2, "Smoking outlet", "G2.4", "High", 1], [3, "Flickering light", "G2.4", "Low", 1]] as [number, string, string, string, number][],
    reporters: "reporters",
    eskalasiNote: "Reason: outlet melted, needs replacement.",
    sample: "Sample view",
    stepsTitle: "How to use it in 6 steps",
    steps: [
      ["Sign in with a technician account", "Open the sign-in page and sign in with a technician account. You land straight on the Board."],
      ["Reports arrive in the New column", "Every card holds the room, category, urgency, and reporter count. Duplicate reports are already merged, so there are no repeated tickets."],
      ["Press Accept", "The report status becomes In progress and enters your work queue."],
      ["Do the repair", "Fix the facility according to the category and urgency on the card."],
      ["Mark done, or Escalate", "Done: the reporter is notified automatically via chat. Escalate facilities with heavy damage that need replacement — a reason is required."],
      ["Open the Monthly recap tab", "A per-room recap of the month's reports, printable to PDF for reporting."],
    ] as [string, string][],
    tech: "Sign in as technician",
  },
}

const URGENCY = ["bg-muted text-muted-foreground", "bg-warn-bg text-warn", "bg-destructive/10 text-destructive"]
const urgencyOf = (u: string) => URGENCY[["Rendah", "Low"].includes(u) ? 0 : ["Tinggi", "High"].includes(u) ? 2 : 1]

export function TeknisiView() {
  const lang = useLang()
  const t = T[lang]
  return (
    <SitePage lang={lang} kicker={t.kicker} title={t.title} sub={t.sub}>
      <Block title={t.boardTitle} sub={t.boardSub}>
        <div aria-label={t.sample} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {t.cols.map((col, ci) => (
            <div key={col} className="flex flex-col gap-2.5 rounded-[22px] bg-muted p-3">
              <span className={`flex items-center justify-between px-1.5 pt-1 text-[13px] font-semibold ${ci === 2 ? "rounded-lg bg-destructive-soft px-2.5 py-1 text-destructive" : ""}`}>
                {col}
                <span className="font-mono text-[11.5px] text-muted-foreground">{t.cards.filter((c) => c[0] === ci).length}</span>
              </span>
              {t.cards.filter((c) => c[0] === ci).map(([, title, room, urgency, n]) => (
                <div key={title} className="flex flex-col gap-2 rounded-[16px] border bg-card p-3.5">
                  <span className="text-[14.5px] font-semibold">{title}</span>
                  <span className="flex flex-wrap items-center gap-2 text-[12px]">
                    <span className="rounded-md bg-accent px-2 py-0.5 font-mono font-medium text-accent-foreground">{room}</span>
                    <span className={`rounded-full px-2 py-0.5 font-medium ${urgencyOf(urgency)}`}>{urgency}</span>
                    {n > 1 && <span className="text-muted-foreground">{n} {t.reporters}</span>}
                  </span>
                  {ci === 2 && <span className="text-[12.5px] italic text-muted-foreground">{t.eskalasiNote}</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </Block>

      <Block title={t.stepsTitle}>
        <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
          {t.steps.map(([title, desc], i) => (
            <li key={title} className="flex gap-4 rounded-[20px] border bg-card p-5">
              <span aria-hidden className="font-mono text-xs font-medium text-primary">0{i + 1}</span>
              <span className="flex flex-col gap-1.5">
                <span className="text-[16px] font-semibold">{title}</span>
                <span className="text-[14.5px] leading-relaxed text-muted-foreground">{desc}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/login?next=%2Fteknisi" className={BTN_DARK}>{t.tech}</Link>
        </div>
      </Block>
    </SitePage>
  )
}
