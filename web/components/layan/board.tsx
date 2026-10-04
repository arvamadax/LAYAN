"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import type { LucideIcon } from "lucide-react"
import { Check, ChevronDown, CircleAlert, CircleCheck, CircleEllipsis, ListFilter, Play, Projector, Snowflake, SprayCan, TriangleAlert, Users, Wifi, X, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { api, post } from "@/lib/api"
import { TECHS, type Category, type Report, type ReportStatus, type Tech } from "@/lib/data"
import { AccountPill, ThemeToggle, TopBar } from "./app-bar"
import { TechTabs } from "./tech-tabs"
import { Mark, UrgencyBadge } from "./primitives"
import { useStore } from "./store"

const CAT_ICON: Record<Category, LucideIcon> = {
  Listrik: Zap, AC: Snowflake, Proyektor: Projector, Jaringan: Wifi, Kebersihan: SprayCan, Lainnya: CircleEllipsis,
}
const COLUMNS: { key: ReportStatus; label: string; dot: string }[] = [
  { key: "baru", label: "Baru", dot: "var(--icon)" },
  { key: "dikerjakan", label: "Dikerjakan", dot: "#2F74E0" },
  { key: "eskalasi", label: "Eskalasi", dot: "var(--status-rejected-dot)" },
  { key: "selesai", label: "Selesai", dot: "var(--ink)" },
]

// Perpindahan yang diizinkan sesuai alur (docs/API.md).
const NEXT: Record<ReportStatus, ReportStatus[]> = {
  baru: ["dikerjakan"],
  dikerjakan: ["selesai", "eskalasi"],
  eskalasi: ["selesai"],
  selesai: [],
}
const RANK = { Tinggi: 0, Sedang: 1, Rendah: 2 }

function Meta({ r, large }: { r: Report; large?: boolean }) {
  const Icon = CAT_ICON[r.category]
  const s = large ? "size-3.5" : "size-[13px]"
  return (
    <div className={cn("flex items-center gap-3 text-muted-foreground", large ? "text-[13px]" : "text-xs")}>
      <span className="flex items-center gap-1">
        <Icon className={s} />
        {r.category}
      </span>
      <span className={cn("flex items-center gap-1", r.reporters > 1 ? "font-bold text-foreground" : "font-medium")}>
        <Users className={s} />
        {r.reporters} pelapor
      </span>
      <span className="ml-auto">{r.time}</span>
    </div>
  )
}

function KanbanCard({ r, onDragStart, onAction, busy }: { r: Report; onDragStart: () => void; onAction: (status: ReportStatus, note?: string) => void; busy: boolean }) {
  const t = TECHS[r.assignee as Tech] ?? { bg: "var(--muted)", fg: "var(--foreground)" }
  const initials = r.tech.split(" ").map((w) => w[0]).join("")
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move"
        e.dataTransfer.setData("text/plain", r.id)
        onDragStart()
      }}
      className={cn(
        "flex cursor-grab flex-col gap-2.5 rounded-md border bg-card p-3 hover:border-dash hover:shadow-e1 active:cursor-grabbing",
        r.status === "selesai" && "opacity-72",
        r.status === "eskalasi" && "border-destructive-border bg-destructive-soft/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold">{r.room}</span>
        <UrgencyBadge urgency={r.urgency} />
      </div>
      <span className="text-sm font-semibold leading-5">{r.title}</span>
      {r.photo && (
        // eslint-disable-next-line @next/next/no-img-element -- foto dari API Rust, bukan aset statis
        <img src={`/api/attachments/${r.photo}`} alt={`Foto kerusakan ${r.room}`} className="h-[92px] w-full rounded-[8px] object-cover" draggable={false} />
      )}
      {r.note && (
        <span className="flex items-start gap-1.5 rounded-[8px] bg-destructive-soft px-2.5 py-2 text-xs leading-[17px] text-destructive">
          <TriangleAlert className="mt-px size-3.5 flex-none" />
          Eskalasi: {r.note}
        </span>
      )}
      <Meta r={r} />
      <div className="flex items-center gap-2 border-t pt-2.5">
        <span className="grid size-[22px] place-items-center rounded-full text-[9px] font-bold" style={{ background: t.bg, color: t.fg }}>
          {initials}
        </span>
        <span className="flex-1 text-xs font-medium">{r.tech}</span>
        <span className="font-mono text-[11px] text-subtle-foreground">{r.id}</span>
      </div>
      {r.status === "baru" && (
        <Button size="sm" onClick={() => onAction("dikerjakan")} disabled={busy}>
          <Play />
          Terima
        </Button>
      )}
      {r.status === "dikerjakan" && (
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={() => onAction("eskalasi")} disabled={busy}>
            <TriangleAlert />
            Eskalasi
          </Button>
          <Button size="sm" onClick={() => onAction("selesai")} disabled={busy}>
            <Check />
            Tandai selesai
          </Button>
        </div>
      )}
      {r.status === "eskalasi" && (
        <Button size="sm" onClick={() => onAction("selesai")} disabled={busy}>
          <Check />
          Tandai selesai
        </Button>
      )}
    </div>
  )
}

// Tombol aksi yang sama untuk kartu HP.
function CardActions({ r, onAction, busy }: { r: Report; onAction: (status: ReportStatus, note?: string) => void; busy: boolean }) {
  if (r.status === "baru")
    return (
      <Button size="lg" onClick={() => onAction("dikerjakan")} disabled={busy}>
        <Play />
        Terima
      </Button>
    )
  if (r.status === "dikerjakan")
    return (
      <div className="grid grid-cols-2 gap-2">
        <Button size="lg" variant="outline" onClick={() => onAction("eskalasi")} disabled={busy}>
          <TriangleAlert />
          Eskalasi
        </Button>
        <Button size="lg" onClick={() => onAction("selesai")} disabled={busy}>
          <Check />
          Tandai selesai
        </Button>
      </div>
    )
  if (r.status === "eskalasi")
    return (
      <Button size="lg" onClick={() => onAction("selesai")} disabled={busy}>
        <Check />
        Tandai selesai
      </Button>
    )
  return null
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" className="flex gap-0.5 rounded-md bg-muted p-[3px]">
      {options.map(([k, label]) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          onClick={() => onChange(k)}
          className={cn(
            "inline-flex h-8 cursor-pointer items-center rounded-[8px] px-3 text-[13px] font-semibold",
            value === k ? "bg-card shadow-[0_1px_2px_rgba(22,24,26,.1)]" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function Board() {
  const { me } = useStore()
  const [reports, setReports] = useState<Report[] | null>(null)
  const [error, setError] = useState("")
  const [justDone, setJustDone] = useState<Set<string>>(new Set())
  const [scope, setScope] = useState<"semua" | "saya">("semua")
  const [cat, setCat] = useState<Category | "Semua">("Semua")
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<ReportStatus | null>(null)
  const [reason, setReason] = useState("")
  const [escalate, setEscalate] = useState<Report | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => api<Report[]>("/reports").then(setReports, (e: Error) => setError(e.message)), [])
  useEffect(() => {
    load()
    // laporan baru dari agent masuk tanpa reload
    const t = setInterval(() => document.visibilityState === "visible" && load(), 10000)
    return () => clearInterval(t)
  }, [load])

  // Optimis: kartu langsung pindah, dikembalikan kalau API menolak.
  async function move(id: string, status: ReportStatus, note?: string) {
    const before = reports
    const from = before?.find((r) => r.id === id)?.status
    if (!from || from === status) return
    if (!NEXT[from].includes(status)) {
      toast.error("Perpindahan tidak diizinkan", { description: "Kartu hanya boleh maju mengikuti alur: Baru → Dikerjakan → (Eskalasi) → Selesai." })
      return
    }
    setBusy(true)
    setReports((rs) => rs?.map((r) => (r.id === id ? { ...r, status, note: status === "eskalasi" ? (note ?? r.note) : r.note } : r)) ?? rs)
    try {
      const res = await post<{ notified: number }>(`/reports/${id}/status`, note ? { status, note } : { status })
      if (status === "selesai") {
        setJustDone((s) => new Set(s).add(id))
        toast.success(`${id} selesai`, { description: res.notified ? `${res.notified} pelapor sudah dikabari lewat chat.` : "Status tersimpan." })
      } else if (status === "eskalasi") {
        toast.success(`${id} dieskalasi`, { description: res.notified ? `${res.notified} pelapor sudah dikabari lewat chat.` : "Menunggu pengadaan." })
      }
    } catch (e) {
      setReports(before)
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // Tombol Eskalasi selalu lewat Dialog (alasan wajib, minimal 10 huruf — aturan API).
  function askEscalate(r: Report) {
    setReason("")
    setEscalate(r)
  }

  const act = (r: Report, status: ReportStatus, note?: string) => (status === "eskalasi" && !note ? askEscalate(r) : move(r.id, status, note))
  const all = reports ?? []
  const group = (list: Report[]) =>
    COLUMNS.map((c) => {
      const cards = list.filter((r) => r.status === c.key)
      if (c.key !== "selesai") cards.sort((a, b) => RANK[a.urgency] - RANK[b.urgency])
      return { ...c, cards }
    })

  const desktopList = all.filter((r) => (scope === "semua" || r.assignee === me?.id) && (cat === "Semua" || r.category === cat))

  // Grup kolom mobile: abaikan yang kosong supaya tidak ada judul tanpa isi.
  const mobileGroups = group(all.filter((r) => r.assignee === me?.id)).filter((g) => g.cards.length > 0)
  const open = all.filter((r) => r.status !== "selesai")

  return (
    <>
      {/* ---------- desktop ---------- */}
      <div className="hidden h-screen min-h-[720px] flex-col lg:flex">
        <TopBar section="Board Teknisi" themeToggle />
        <TechTabs />
        <div className="flex flex-none items-center gap-4 px-6 pb-4 pt-5">
          <div className="flex flex-1 flex-col gap-0.5">
            <h1 className="text-[22px] font-bold tracking-[-0.01em]">Laporan kerusakan</h1>
            <span className="text-[13px] text-muted-foreground">
              {open.length} laporan terbuka · {open.reduce((s, r) => s + r.reporters, 0)} pelapor, sudah digabung agent
            </span>
          </div>
          <Segmented value={scope} onChange={setScope} options={[["semua", "Semua teknisi"], ["saya", "Tugas saya"]]} />
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-3 text-[13px] font-semibold outline-none hover:bg-background focus-visible:ring-[3px] focus-visible:ring-accent">
              <ListFilter className="size-[15px]" />
              Kategori: {cat}
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuRadioGroup value={cat} onValueChange={(v) => setCat(v as Category | "Semua")}>
                {(["Semua", ...Object.keys(CAT_ICON)] as const).map((c) => (
                  <DropdownMenuRadioItem key={c} value={c}>
                    {c}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {error && (
          <p role="alert" className="mx-6 mb-3 flex items-center gap-2 rounded-md bg-destructive-soft/60 px-3 py-2 text-[13px] text-destructive">
            <CircleAlert className="size-4" />
            {error}
          </p>
        )}
        <div className={cn("grid min-h-0 flex-1 grid-cols-4 gap-4 px-6 pb-6", !reports && "animate-pulse")}>
          {group(desktopList).map((col) => (
            <section
              key={col.key}
              aria-label={col.label}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(col.key)
              }}
              onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(null)}
              onDrop={(e) => {
                e.preventDefault()
                const id = e.dataTransfer.getData("text/plain") || dragId
                const r = desktopList.find((x) => x.id === id)
                if (id && r) {
                  // Drag ke Eskalasi selalu lewat Dialog (alasan wajib); sisanya ikut aturan NEXT (+ toast).
                  if (col.key === "eskalasi") askEscalate(r)
                  else move(id, col.key)
                }
                setOver(null)
                setDragId(null)
              }}
              className={cn("flex min-h-0 flex-col rounded-lg bg-muted transition-shadow", over === col.key && "shadow-[inset_0_0_0_2px_var(--primary)]")}
            >
              <div className="flex items-center gap-2 px-3.5 pb-2.5 pt-3.5">
                <span className="size-2 rounded-full" style={{ background: col.dot }} />
                <h2 className="text-sm font-bold">{col.label}</h2>
                <span className="rounded-full bg-card px-2 py-px text-xs font-bold text-muted-foreground">{col.cards.length}</span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto px-2.5 pb-2.5">
                {col.cards.map((r) => (
                  <KanbanCard key={r.id} r={r} onDragStart={() => setDragId(r.id)} onAction={(s, n) => act(r, s, n)} busy={busy} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* ---------- mobile: tugas teknisi ---------- */}
      <div className="mx-auto flex h-dvh max-w-[480px] flex-col bg-background sm:border-x lg:hidden">
        <header className="flex h-14 flex-none items-center gap-2.5 pl-4 pr-3">
          <Mark />
          <span className="flex-1 text-[17px] font-extrabold tracking-[0.06em]">LAYAN</span>
          <AccountPill />
          <ThemeToggle />
        </header>
        <div className="flex flex-none flex-col gap-0.5 px-4 pb-3 pt-1">
          <h1 className="text-[22px] font-bold tracking-[-0.01em]">Tugas saya</h1>
          <span className="text-[13px] text-muted-foreground">{me?.name} · {me?.unit}</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto px-4 pb-4">
          {mobileGroups.map((g) => (
            <section key={g.key} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-0.5">
                <span className="size-2 rounded-full" style={{ background: g.dot }} />
                <h2 className="text-sm font-bold">{g.label}</h2>
                <span className="text-xs font-bold text-muted-foreground">{g.cards.length}</span>
              </div>
              {g.cards.map((r) => (
                <div key={r.id} className={cn("flex flex-col gap-2.5 rounded-lg border bg-card p-3.5", r.status === "eskalasi" && "border-destructive-border")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-base font-semibold">{r.room}</span>
                    <UrgencyBadge urgency={r.urgency} large />
                  </div>
                  <span className="text-[15px] font-semibold leading-[21px]">{r.title}</span>
                  <Meta r={r} large />
                  {r.photo && (
                    // eslint-disable-next-line @next/next/no-img-element -- foto dari API Rust, bukan aset statis
                    <img src={`/api/attachments/${r.photo}`} alt={`Foto kerusakan ${r.room}`} className="h-[140px] w-full rounded-[8px] object-cover" draggable={false} />
                  )}
                  {r.note && (
                    <span className="flex items-start gap-1.5 rounded-[8px] bg-destructive-soft px-2.5 py-2 text-xs leading-[17px] text-destructive">
                      <TriangleAlert className="mt-px size-3.5 flex-none" />
                      Eskalasi: {r.note}
                    </span>
                  )}
                  <CardActions r={r} onAction={(s, n) => act(r, s, n)} busy={busy} />
                  {r.status === "selesai" && (
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ok">
                      <CircleCheck className="size-[15px]" />
                      {justDone.has(r.id) ? "Selesai barusan · pelapor diberi tahu" : `Selesai ${r.updated}`}
                    </span>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
      <Dialog
        open={!!escalate}
        onOpenChange={(o) => {
          if (!o) setEscalate(null)
        }}
      >
        <DialogContent showCloseButton={false} className="w-[480px] max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-[16px] border-0 p-0 shadow-e2 sm:max-w-[480px]">
          <div className="flex flex-col gap-1.5 px-6 pt-[22px]">
            <div className="flex items-start justify-between gap-4">
              <DialogTitle className="text-lg font-bold">Eskalasi {escalate?.id}?</DialogTitle>
              <button type="button" aria-label="Tutup" onClick={() => setEscalate(null)} className="-mr-2 -mt-1.5 grid size-11 cursor-pointer place-items-center rounded-[8px] hover:bg-muted">
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
            <DialogDescription className="text-sm leading-5 text-muted-foreground">
              Untuk sarana yang benar-benar rusak dan perlu penggantian atau pengadaan. Pelapor dikabari lewat chat.
            </DialogDescription>
          </div>
          <div className="px-6 py-[18px]">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold">
                Alasan eskalasi <span className="text-destructive">*</span>
              </span>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Contoh: kompresor AC jebol, perlu ganti unit baru"
                autoFocus
              />
              <span className={cn("text-xs", reason.trim() && reason.trim().length < 10 ? "font-semibold text-destructive" : "text-muted-foreground")}>
                {reason.trim() ? `${reason.trim().length}/10 huruf minimal` : "Wajib diisi, minimal 10 huruf."}
              </span>
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t bg-background px-6 py-3.5">
            <Button variant="ghost" className="px-3.5" onClick={() => setEscalate(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={reason.trim().length < 10 || busy}
              onClick={() => {
                const r = escalate
                if (!r) return
                setEscalate(null)
                move(r.id, "eskalasi", reason.trim())
              }}
            >
              <TriangleAlert />
              Eskalasi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
