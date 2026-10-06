"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  CalendarClock, CircleEllipsis, Projector, SprayCan, Wifi, Zap, Camera, Check, CircleAlert, CircleCheck, Download, ExternalLink, Eye,
  FileCheck2, History, Hourglass, Phone, Quote, Snowflake, Ticket, Upload, Wrench, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Check as CheckT, Urgency, Worker } from "@/lib/data"
import { FileTypeTile, StatusBadge, UrgencyBadge, WorkerTile, formatSize } from "./primitives"

/* ---------- dasar ---------- */

export function CardShell({
  worker, icon, title, right, children, className,
}: {
  worker: Worker; icon?: LucideIcon; title: string; right?: ReactNode; children?: ReactNode; className?: string
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card", className)}>
      <div className="flex items-center gap-2.5 border-b px-3.5 py-3">
        <WorkerTile worker={worker} icon={icon} />
        <span className="flex-1 text-sm font-semibold">{title}</span>
        {right}
      </div>
      {children}
    </div>
  )
}

/** Card yang sudah dijawab collapse jadi satu baris. */
export function CollapsedCard({
  worker, icon, title, note = "Terkirim", tone = "ok",
}: { worker: Worker; icon?: LucideIcon; title: string; note?: string; tone?: "ok" | "warn" | "muted" }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border bg-card px-3.5 py-3">
      <WorkerTile worker={worker} icon={icon} />
      <span className="flex-1 text-sm font-semibold">{title}</span>
      <span
        className={cn(
          "flex items-center gap-1 text-xs font-semibold",
          tone === "ok" && "text-ok",
          tone === "warn" && "text-warn",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {tone === "ok" && <Check className="size-3.5" />}
        {note}
      </span>
    </div>
  )
}

export function Field({
  label, helper, error, ...props
}: { label: string; helper?: string; error?: string } & React.ComponentProps<"input">) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold">{label}</span>
      <Input aria-invalid={!!error || undefined} {...props} />
      {error ? (
        <span className="flex items-center gap-1.5 text-xs text-destructive">
          <CircleAlert className="size-3.5" />
          {error}
        </span>
      ) : (
        helper && <span className="text-xs text-muted-foreground">{helper}</span>
      )}
    </label>
  )
}

function KeyValue({ rows, className }: { rows: [string, ReactNode][]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 text-sm", className)}>
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <span className="text-muted-foreground">{k}</span>
          <span className="font-medium">{v}</span>
        </div>
      ))}
    </div>
  )
}

/* ---------- 1 · Form data kurang ---------- */

/** Field form surat dari server (`LETTERS` di api/src/tools.rs). */
export type FormField = { key: string; label: string; placeholder?: string; helper?: string }

// card form dari sebelum field dikirim server (data kosong) selalu dispensasi
const LEGACY_FIELDS: FormField[] = [
  { key: "activity", label: "Nama kegiatan", placeholder: "Gemastik 2026" },
  { key: "courses", label: "Mata kuliah yang terlewat", placeholder: "Struktur Data, Sistem Digital", helper: "Pisahkan dengan koma. Dosen pengampu aku isi otomatis." },
]

export function FormCard({ fields, onSubmit }: { fields?: FormField[]; onSubmit?: (v: Record<string, string>) => void }) {
  const list = fields?.length ? fields : LEGACY_FIELDS
  const [values, setValues] = useState<Record<string, string>>({})
  const valid = list.every((f) => values[f.key]?.trim())
  return (
    <CardShell worker="surat" title="Lengkapi data surat" right={<span className="text-xs font-semibold text-muted-foreground">{list.length} field</span>}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onSubmit?.(Object.fromEntries(list.map((f) => [f.key, values[f.key].trim()])))
        }}
      >
        <div className="flex flex-col gap-3.5 p-3.5">
          <div className="flex items-center gap-2 rounded-[8px] bg-muted px-2.5 py-2 text-xs text-muted-foreground">
            <CircleCheck className="size-3.5 flex-none text-ok" />
            Nama, NIM, prodi sudah terisi dari profil
          </div>
          {list.map((f) => (
            <Field
              key={f.key}
              label={f.label}
              placeholder={f.placeholder ? `Contoh: ${f.placeholder}` : undefined}
              helper={f.helper || undefined}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            />
          ))}
        </div>
        <div className="px-3.5 pb-3.5">
          <Button type="submit" size="card" className="w-full" disabled={!valid}>Kirim</Button>
        </div>
      </form>
    </CardShell>
  )
}

/* ---------- 2 · Upload lampiran ---------- */

const ACCEPT = ["application/pdf", "image/jpeg", "image/png"]
const MAX = 5 * 1024 * 1024
export const UPLOAD_INPUT_ID = "ly-upload"

/** `onUpload` mengembalikan pesan error kalau gagal. */
export function UploadCard({ title = "Bukti kegiatan", onUpload }: { title?: string; onUpload?: (f: File) => Promise<string | void> }) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  function pick(f?: File) {
    if (!f) return
    if (!ACCEPT.includes(f.type)) return setError("Format belum didukung. Pakai PDF, JPG, atau PNG.")
    if (f.size > MAX) return setError("File lebih dari 5 MB. Kecilkan dulu atau foto ulang.")
    setError("")
    setFile(f)
  }

  return (
    <CardShell
      worker="surat"
      title={title}
      right={file ? <span className="text-xs text-muted-foreground">PDF, JPG, PNG · 5 MB</span> : <StatusBadge status="needs_info" />}
    >
      <input
        id={UPLOAD_INPUT_ID}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="sr-only"
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = ""
        }}
      />
      <div className="p-3.5">
        {file ? (
          <div className="flex items-center gap-3 rounded-[12px] border bg-background px-3 py-2.5">
            <FileTypeTile name={file.name} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold">{file.name}</span>
              <span className="text-xs text-muted-foreground">{formatSize(file.size)} · siap di-upload</span>
            </div>
          </div>
        ) : (
          <label
            htmlFor={UPLOAD_INPUT_ID}
            className="flex cursor-pointer flex-col items-center gap-2 rounded-[12px] border-[1.5px] border-dashed border-dash bg-background px-4 py-[22px] text-center hover:border-primary"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              pick(e.dataTransfer.files[0])
            }}
          >
            <span className="grid size-10 place-items-center rounded-[11px] border bg-card">
              <Upload className="size-5" />
            </span>
            <span className="text-[15px] font-semibold">Pilih file atau ambil foto</span>
            <span className="text-xs text-muted-foreground">PDF, JPG, PNG · maks 5 MB</span>
          </label>
        )}
        {error && (
          <span className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
            <CircleAlert className="size-3.5" />
            {error}
          </span>
        )}
      </div>
      <div className={cn("px-3.5 pb-3.5", file && "grid grid-cols-2 gap-2")}>
        {file && (
          <Button variant="outline" size="card" asChild>
            <label htmlFor={UPLOAD_INPUT_ID}>Ganti file</label>
          </Button>
        )}
        <Button
          size="card"
          className="w-full"
          disabled={!file || busy}
          onClick={async () => {
            if (!file || !onUpload) return
            setBusy(true)
            setError((await onUpload(file)) ?? "")
            setBusy(false)
          }}
        >
          <Upload />
          {busy ? "Mengupload…" : "Upload"}
        </Button>
      </div>
    </CardShell>
  )
}

/* ---------- 3 · Cek syarat ---------- */

// `policy` = penolakan otomatis karena melanggar ketentuan layanan (rejectByPolicy), bukan syarat surat
export function ChecksCard({ checks, footer, policy }: { checks: CheckT[]; footer?: { note: string }; policy?: boolean }) {
  const failed = checks.filter((c) => !c.ok).length
  return (
    <CardShell
      worker="surat"
      title={policy ? "Cek ketentuan layanan" : "Hasil cek syarat"}
      right={
        <span className={cn("text-xs font-semibold", failed ? "text-destructive" : "text-ok")}>
          {policy ? "Ditolak otomatis" : failed ? `${failed} belum terpenuhi` : `${checks.length} dari ${checks.length}`}
        </span>
      }
    >
      <div className="px-3.5 py-1.5">
        {checks.map((c, i) => (
          <div key={c.label} className={cn("flex items-start gap-2.5 py-2.5", i > 0 && "border-t")}>
            <span
              className={cn(
                "grid size-5 flex-none place-items-center rounded-full [&_svg]:size-3",
                c.ok ? "bg-ok-bg text-ok" : "bg-destructive-soft text-destructive",
              )}
            >
              {c.ok ? <Check /> : <X />}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">{c.label}</span>
              <span className={cn("text-xs leading-[17px]", c.ok ? "text-muted-foreground" : "text-destructive")}>{c.note}</span>
            </div>
          </div>
        ))}
      </div>
      {footer && (
        <>
          <div className="border-t bg-background px-3.5 py-3 text-[13px] leading-[18px] text-soft-foreground">{footer.note}</div>
          <div className="flex justify-end border-t px-3.5 py-3">
            <Button variant="outline" asChild>
              <a href="tel:+620000000000">
                <Phone />
                Hubungi akademik
              </a>
            </Button>
          </div>
        </>
      )}
    </CardShell>
  )
}

/* ---------- 4 · Preview draft ---------- */

export function DraftThumb() {
  return (
    <div className="flex h-32 w-[92px] flex-none flex-col gap-[5px] rounded-[4px] border bg-white px-[9px] py-2.5 shadow-e1">
      <div className="flex items-center gap-1 border-b border-[#16181A] pb-[5px]">
        <span className="size-2.5 rounded-[2px] bg-[#C9C8C1]" />
        <span className="h-[3px] flex-1 rounded-[1px] bg-[#C9C8C1]" />
      </div>
      <span className="my-[3px] h-[3px] w-3/5 self-center rounded-[1px] bg-[#16181A]" />
      {["100%", "100%", "80%", "100%", "100%", "65%"].map((w, i) => (
        <span key={i} className={cn("h-0.5 bg-[#D9D8D2]", i === 3 && "mt-[3px]")} style={{ width: w }} />
      ))}
      <span className="mt-auto h-2 w-[26px] self-end rounded-[2px] border border-dashed border-[#8561DE]" />
    </div>
  )
}

export function DraftCard({
  title = "Surat Dispensasi",
  meta = "Gemastik 2026 · 10–12 Okt · 2 mata kuliah",
  requestId = "REQ-2026-0931",
}: { title?: string; meta?: string; requestId?: string }) {
  return (
    <CardShell worker="surat" title="Draft surat">
      <div className="flex gap-3.5 p-3.5">
        <DraftThumb />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-[15px] font-bold leading-5">{title}</span>
          <span className="text-[13px] leading-[18px] text-muted-foreground">{meta}</span>
          <span className="text-xs font-medium text-muted-foreground">Draft · 1 halaman</span>
          <StatusBadge status="pending_approval" className="mt-auto" />
        </div>
      </div>
      <div className="px-3.5 pb-3.5">
        <Button variant="outline" size="card" className="w-full" asChild>
          <Link href={`/surat/${requestId}`}>
            <Eye />
            Lihat PDF
          </Link>
        </Button>
      </div>
    </CardShell>
  )
}

/* ---------- 5 · Jawaban helpdesk ---------- */

export type Answer = { headline: string; explanation: string; source_title: string; source_section: string }
const SAMPLE_ANSWER: Answer = {
  headline: "Maksimal 22 SKS",
  explanation: "IP 3,00 sampai 3,49 boleh mengambil hingga 22 SKS. Mulai IP 3,50 bisa sampai 24 SKS.",
  source_title: "Pedoman Akademik",
  source_section: "Bab Beban Studi · Pasal (placeholder)",
}

export function AnswerCard({ data = SAMPLE_ANSWER, onTicket, ticketed }: { data?: Answer; onTicket?: () => void; ticketed?: boolean }) {
  return (
    <CardShell worker="helpdesk" title="Jawaban">
      <div className="flex flex-col gap-2 p-3.5">
        <span className="text-[22px] font-bold leading-7 tracking-[-0.01em]">{data.headline}</span>
        <span className="text-pretty text-sm leading-[21px] text-soft-foreground">{data.explanation}</span>
      </div>
      <div className="mx-3.5 mb-3.5 flex items-start gap-2.5 rounded-md border bg-background px-3 py-2.5">
        <Quote className="mt-0.5 size-4 flex-none" style={{ color: "var(--worker-helpdesk)" }} />
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-[13px] font-semibold">{data.source_title}</span>
          <span className="text-xs text-muted-foreground">{data.source_section}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3.5 py-3">
        {/* Catatan: dokumen sumber asli belum masuk, tombol nonaktif sampai ada URL */}
        <Button variant="link" disabled title="Dokumen asli belum tersedia">
          <ExternalLink className="size-[15px]" />
          Buka sumber
        </Button>
        <Button variant="outline" className="px-3 text-[13px]" onClick={onTicket} disabled={ticketed}>
          Masih bingung? Buat tiket
        </Button>
      </div>
    </CardShell>
  )
}

/* ---------- 6 · Tiket dibuat ---------- */

export type Ticket = { ticket_id: string; category: string; unit: string; eta: string }
const SAMPLE_TICKET: Ticket = { ticket_id: "TKT-2026-0318", category: "Beban studi / SKS", unit: "Bagian Akademik Fakultas", eta: "1 hari kerja" }

export function TicketCard({ data = SAMPLE_TICKET }: { data?: Ticket }) {
  return (
    <CardShell worker="helpdesk" icon={Ticket} title="Tiket dibuat" right={<StatusBadge status="submitted" />}>
      <div className="flex flex-col gap-3 p-3.5">
        <span className="font-mono text-lg font-semibold tracking-[.01em]">{data.ticket_id}</span>
        <KeyValue rows={[["Kategori", data.category], ["Unit tujuan", data.unit], ["Perkiraan", data.eta]]} />
      </div>
      <div className="px-3.5 pb-3.5">
        <Button variant="outline" size="card" className="w-full" asChild>
          <Link href="/app/riwayat">
            <History />
            Lihat di riwayat
          </Link>
        </Button>
      </div>
    </CardShell>
  )
}

/* ---------- 7 · Pilihan ruangan ---------- */

export type Room = { code: string; time: string; shifted?: boolean; cap: string; fac: string }
export const ROOMS: Room[] = [
  { code: "G1.2", time: "13.00–15.00", cap: "30 orang", fac: "Proyektor, AC, whiteboard" },
  { code: "F2.3", time: "13.00–15.00", cap: "40 orang", fac: "Proyektor, AC" },
  { code: "G2.4", time: "15.00–17.00", shifted: true, cap: "25 orang · ruang rapat", fac: "TV, AC. Jam digeser 2 jam" },
]
export type RoomsData = { date_label: string; options: Room[] }

export function RoomsCard({
  data = { date_label: "Jumat, 2 Okt", options: ROOMS },
  onPick,
}: {
  data?: RoomsData
  onPick?: (r: Room) => void
}) {
  const [sel, setSel] = useState(data.options[0]?.code)
  return (
    <CardShell worker="fasilitas" title="Pilih ruangan" right={<span className="text-xs text-muted-foreground">{data.date_label}</span>}>
      <div role="radiogroup" aria-label="Pilihan ruangan" className="flex flex-col gap-2 p-2.5">
        {data.options.map((r) => {
          const on = r.code === sel
          return (
            <button
              key={r.code}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setSel(r.code)}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-[12px] p-3 text-left",
                on ? "border-2 border-primary bg-accent p-[11px]" : "border bg-card hover:bg-background",
              )}
            >
              <span className={cn("mt-px grid size-5 flex-none place-items-center rounded-full", on ? "border-2 border-primary" : "border-[1.5px] border-dash")}>
                {on && <span className="size-2.5 rounded-full bg-primary" />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-[15px] font-semibold">{r.code}</span>
                  <span className={cn("text-[13px] font-semibold", r.shifted && "text-warn")}>{r.time}</span>
                </span>
                <span className="text-xs leading-[17px] text-muted-foreground">
                  {r.cap} · {r.fac}
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <div className="px-3.5 pb-3.5 pt-1">
        <Button size="card" className="w-full active:scale-[0.98]" onClick={() => onPick?.(data.options.find((r) => r.code === sel)!)}>
          Pilih {sel}
        </Button>
      </div>
    </CardShell>
  )
}

/* ---------- 8 · Booking ditahan ---------- */

export type Held = { request_id: string; code: string; time: string; dn: string; dd: string; mm: string; purpose: string; people: number; until: string }
const SAMPLE_HELD: Held = { request_id: "", code: "G1.2", time: "13.00–15.00", dn: "JUM", dd: "2", mm: "Okt", purpose: "Rapat himpunan", people: 20, until: "Rabu 09.20" }

export function BookingHeldCard({ data = SAMPLE_HELD, onCancel }: { data?: Held; onCancel?: () => void }) {
  return (
    <CardShell worker="fasilitas" icon={CalendarClock} title="Booking ditahan">
      <div className="flex items-center gap-3.5 p-3.5">
        <div className="w-16 flex-none overflow-hidden rounded-md border text-center">
          <div className="py-[3px] text-[11px] font-bold tracking-[.04em] text-white" style={{ background: "#B4541A" }}>{data.dn}</div>
          <div className="pt-1 text-2xl font-bold leading-7">{data.dd}</div>
          <div className="pb-[5px] text-[11px] text-muted-foreground">{data.mm}</div>
        </div>
        <div className="flex flex-1 flex-col gap-[3px]">
          <span className="font-mono text-lg font-semibold">{data.code}</span>
          <span className="text-sm font-medium">{data.time}</span>
          <span className="text-xs text-muted-foreground">
            {data.purpose} · {data.people} orang
          </span>
        </div>
      </div>
      <div className="mx-3.5 mb-3.5 flex items-start gap-2.5 rounded-md bg-violet-bg px-3 py-2.5 text-[13px] leading-[18px] text-hold">
        <Hourglass className="mt-px size-4 flex-none" />
        <span>
          <b className="font-bold">Ditahan 24 jam, menunggu konfirmasi.</b> Lepas otomatis {data.until} kalau belum dikonfirmasi.
        </span>
      </div>
      <div className="flex justify-end border-t px-3.5 py-3">
        <Button variant="ghost" className="px-3 text-destructive hover:bg-destructive-soft" onClick={onCancel}>
          Batalkan booking
        </Button>
      </div>
    </CardShell>
  )
}

/* ---------- 9 · Laporan kerusakan ---------- */

const CAT_ICON: Record<string, LucideIcon> = {
  Listrik: Zap, AC: Snowflake, Proyektor: Projector, Jaringan: Wifi, Kebersihan: SprayCan, Lainnya: CircleEllipsis,
}

export type ReportData = {
  report_id: string; room: string; category: string; urgency: Urgency; tech: string; initials: string; reporters: number; merged: boolean
}
const SAMPLE_REPORT: ReportData = { report_id: "LK-0587", room: "F2.3", category: "AC", urgency: "Sedang", tech: "Pak Joko", initials: "PJ", reporters: 3, merged: true }

/** `onPhoto` mengembalikan pesan error kalau gagal. */
export function ReportCard({ data = SAMPLE_REPORT, onPhoto }: { data?: ReportData; onPhoto?: (f: File) => Promise<string | void> }) {
  const [photos, setPhotos] = useState(0)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const Icon = CAT_ICON[data.category] ?? CircleEllipsis
  const inputId = `ly-photo-${data.report_id}`
  return (
    <CardShell worker="fasilitas" icon={Wrench} title="Laporan kerusakan" right={<span className="font-mono text-xs text-muted-foreground">{data.report_id}</span>}>
      <KeyValue
        className="gap-y-2 p-3.5"
        rows={[
          ["Ruang", <span key="r" className="font-mono font-semibold">{data.room}</span>],
          ["Kategori", <span key="k" className="flex items-center gap-1.5"><Icon className="size-3.5" />{data.category}</span>],
          ["Urgensi", <UrgencyBadge key="u" urgency={data.urgency} large />],
          [
            "Teknisi",
            <span key="t" className="flex items-center gap-2">
              <span className="grid size-[22px] place-items-center rounded-full border bg-muted text-[10px] font-bold">{data.initials}</span>
              {data.tech}
            </span>,
          ],
        ]}
      />
      {data.reporters > 1 && (
        <div className="mx-3.5 mb-3.5 flex items-center gap-2.5 rounded-md bg-muted px-3 py-2.5 text-[13px] leading-[18px]">
          <span className="flex flex-none">
            {["#FBEBDF", "#E2F2EE", "#16181A"].slice(0, Math.min(3, data.reporters)).map((c, i) => (
              <span key={c} className={cn("size-[22px] rounded-full border-2 border-muted", i && "-ml-2")} style={{ background: c }} />
            ))}
          </span>
          <span>
            <b className="font-bold">{data.reporters} orang melaporkan hal yang sama.</b> {data.merged ? "Laporanmu aku gabungkan." : "Laporan sudah digabung."}
          </span>
        </div>
      )}
      <div className="px-3.5 pb-3.5">
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png"
          capture="environment"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ""
            if (!f || !onPhoto) return
            setBusy(true)
            const err = await onPhoto(f)
            setBusy(false)
            setError(err ?? "")
            if (!err) setPhotos((n) => n + 1)
          }}
        />
        <Button variant="outline" size="card" className="w-full" asChild disabled={busy}>
          <label htmlFor={inputId}>
            <Camera />
            {busy ? "Mengupload…" : photos ? `${photos} foto ditambahkan` : "Tambah foto"}
          </label>
        </Button>
        {error && (
          <span className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
            <CircleAlert className="size-3.5" />
            {error}
          </span>
        )}
      </div>
    </CardShell>
  )
}

/* ---------- 10 · Surat selesai ---------- */

export type LetterDone = { letter_no: string; title: string; approved_by: string; approved_at: string; request_id: string }
const SAMPLE_DONE: LetterDone = { letter_no: "SD/2026/10/0142", title: "Surat Dispensasi", approved_by: "Ibu Sari", approved_at: "10.02", request_id: "REQ-2026-0931" }

export function LetterDoneCard({ data = SAMPLE_DONE }: { data?: LetterDone }) {
  return (
    <CardShell worker="surat" icon={FileCheck2} title="Surat selesai" right={<StatusBadge status="approved" />}>
      <div className="flex flex-col gap-1 p-3.5">
        <span className="text-xs text-muted-foreground">Nomor surat</span>
        <span className="font-mono text-lg font-semibold">{data.letter_no}</span>
        <span className="mt-1.5 text-[13px] text-muted-foreground">
          {data.title} · disetujui {data.approved_by}, {data.approved_at}
        </span>
      </div>
      <div className="px-3.5 pb-3.5">
        <Button size="card" className="w-full" asChild>
          <Link href={`/surat/${data.request_id}`}>
            <Download />
            Unduh PDF
          </Link>
        </Button>
      </div>
    </CardShell>
  )
}
