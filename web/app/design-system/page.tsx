import type { ReactNode } from "react"
import {
  AnswerCard, BookingHeldCard, ChecksCard, DraftCard, FormCard, LetterDoneCard, ReportCard, RoomsCard, TicketCard, UploadCard,
} from "@/components/layan/action-cards"
import { AgentAvatar, Mark, StatusBadge, TypingDots, UrgencyBadge, WorkerTile } from "@/components/layan/primitives"
import { STATUS_LABEL, type Status, type Worker } from "@/lib/data"

export const metadata = { title: "Design System · LAYAN" }

const SWATCHES = [
  "background", "card", "muted", "border", "input", "foreground", "muted-foreground", "subtle-foreground",
  "primary", "primary-hover", "accent", "destructive",
]
const STATUS_DESC: Record<Status, string> = {
  submitted: "Baru masuk, belum diproses",
  processing: "Agent sedang bekerja",
  needs_info: "Menunggu mahasiswa melengkapi",
  pending_approval: "Ada di queue staf",
  approved: "Staf approve",
  rejected: "Staf reject, alasan wajib tampil",
  done: "Hasil sudah diterima mahasiswa",
  cancelled: "Dibatalkan mahasiswa sebelum selesai",
}
const WORKERS: [Worker, string, string][] = [
  ["surat", "Surat", "Surat Aktif Kuliah, Surat Dispensasi"],
  ["helpdesk", "Helpdesk", "Aturan akademik + sitasi, tiket"],
  ["fasilitas", "Fasilitas", "Booking ruang, laporan kerusakan"],
]
const TYPE: [string, string, string][] = [
  ["text-[32px] leading-[38px] font-bold tracking-[-0.02em]", "Halo, Raka", "display · 32/38 · 700"],
  ["text-2xl leading-[30px] font-bold tracking-[-0.01em]", "Approval queue", "heading-1 · 24/30 · 700"],
  ["text-lg leading-6 font-semibold", "Surat Dispensasi", "heading-2 · 18/24 · 600"],
  ["text-[15px] leading-[22px]", "Draft sudah aku kirim ke staf.", "body · 15/22 · 400"],
  ["text-sm leading-5", "Raka Pratama · Teknik Informatika", "body-sm · 14/20 · 400"],
  ["text-xs font-medium text-muted-foreground", "Masuk 09.15 · 3 menit lalu", "caption · 12/16 · 500"],
  ["font-mono text-[13px] leading-[18px] font-medium", "SD/2026/10/0142", "mono · 13/18 · 500"],
]

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-baseline gap-3">
        <span className="text-xs font-semibold text-subtle-foreground">{n}</span>
        <h2 className="text-[22px] font-bold tracking-[-0.01em]">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Swatches({ dark }: { dark?: boolean }) {
  return (
    <div className={dark ? "dark" : undefined}>
      <div className="grid grid-cols-4 gap-3 rounded-lg border bg-card p-6 text-foreground">
        <span className="col-span-4 text-sm font-semibold">{dark ? "Dark" : "Light"}</span>
        {SWATCHES.map((s) => (
          <div key={s} className="flex flex-col gap-1.5">
            <div className="h-[52px] rounded-md border border-black/10 dark:border-white/10" style={{ background: `var(--${s})` }} />
            <span className="font-mono text-[11px] text-muted-foreground">{s}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Gallery({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex w-full max-w-[390px] flex-col gap-2.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-start gap-2 rounded-xl border bg-background p-4">
        <AgentAvatar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <main className="mx-auto flex max-w-[1240px] flex-col gap-16 px-4 pb-24 pt-12 sm:px-8">
      <header className="flex flex-col gap-4 border-b pb-8">
        <div className="flex items-center gap-2.5">
          <Mark size={28} />
          <span className="text-[22px] font-extrabold tracking-[0.06em]">LAYAN</span>
        </div>
        <h1 className="text-[40px] font-bold leading-[46px] tracking-[-0.02em]">Design System v1</h1>
        <p className="max-w-[560px] text-pretty text-base text-muted-foreground">
          Satu bahasa visual untuk loket chat mahasiswa, Staff Console, dan board teknisi. Token ada di <code className="font-mono text-sm">app/globals.css</code>.
        </p>
      </header>

      <Section n="01" title="Warna">
        <div className="grid gap-5 lg:grid-cols-2">
          <Swatches />
          <Swatches dark />
        </div>
      </Section>

      <Section n="02" title="Status request">
        <div className="overflow-x-auto rounded-lg border bg-card">
          {(Object.keys(STATUS_LABEL) as Status[]).map((s, i) => (
            <div key={s} className={`grid min-w-[640px] grid-cols-[180px_220px_1fr_200px] items-center gap-4 px-5 py-3 ${i ? "border-t" : ""}`}>
              <span className="font-mono text-xs text-muted-foreground">{s}</span>
              <StatusBadge status={s} />
              <span className="text-sm">{STATUS_DESC[s]}</span>
              <span className="dark flex rounded-[8px] bg-card px-2 py-1.5">
                <StatusBadge status={s} />
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section n="03" title="Worker dan urgensi">
        <div className="grid gap-4 md:grid-cols-3">
          {WORKERS.map(([w, name, desc]) => (
            <div key={w} className="flex items-start gap-4 rounded-lg border bg-card p-5">
              <WorkerTile worker={w} size={40} />
              <div className="flex flex-col gap-1">
                <span className="text-[15px] font-bold">{name}</span>
                <span className="text-[13px] leading-[19px] text-muted-foreground">{desc}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <UrgencyBadge urgency="Rendah" />
          <UrgencyBadge urgency="Sedang" />
          <UrgencyBadge urgency="Tinggi" />
          <span className="ml-4 flex items-center gap-2.5 rounded-full border bg-card px-3.5 py-2 text-xs text-muted-foreground">
            <TypingDots />
            Mengecek syarat surat
          </span>
        </div>
      </Section>

      <Section n="04" title="Tipografi">
        <div className="rounded-lg border bg-card px-6 py-2">
          {TYPE.map(([cls, text, spec], i) => (
            <div key={spec} className={`flex items-baseline justify-between gap-4 py-4 ${i ? "border-t" : ""}`}>
              <span className={cls}>{text}</span>
              <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">{spec}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section n="05" title="Action cards · 10 varian">
        <div className="flex flex-wrap gap-8">
          <Gallery label="1 · Form data kurang"><FormCard /></Gallery>
          <Gallery label="2 · Upload lampiran"><UploadCard /></Gallery>
          <Gallery label="3 · Cek syarat · lolos">
            <ChecksCard checks={[{ ok: true, label: "Status aktif", note: "Semester 3, Ganjil 2026/2027" }, { ok: true, label: "UKT lunas", note: "Dibayar 14 Agu 2026" }, { ok: true, label: "Lampiran valid", note: "undangan_gemastik.pdf" }]} />
          </Gallery>
          <Gallery label="3 · Cek syarat · gagal (Bima)">
            <ChecksCard
              checks={[{ ok: true, label: "Status aktif", note: "Semester 5, Ganjil 2026/2027" }, { ok: false, label: "UKT lunas", note: "Tagihan Ganjil 2026/2027 belum dibayar. Jatuh tempo 30 Sep." }]}
              footer={{ note: "Kalau sudah bayar, kirim bukti bayar di sini dan aku cek ulang. Kalau ada kendala biaya, akademik bisa bantu." }}
            />
          </Gallery>
          <Gallery label="4 · Preview draft"><DraftCard /></Gallery>
          <Gallery label="5 · Jawaban helpdesk"><AnswerCard /></Gallery>
          <Gallery label="6 · Tiket dibuat"><TicketCard /></Gallery>
          <Gallery label="7 · Pilihan ruangan"><RoomsCard /></Gallery>
          <Gallery label="8 · Booking ditahan"><BookingHeldCard /></Gallery>
          <Gallery label="9 · Laporan kerusakan"><ReportCard /></Gallery>
          <Gallery label="10 · Surat selesai"><LetterDoneCard /></Gallery>
        </div>
      </Section>
    </main>
  )
}
