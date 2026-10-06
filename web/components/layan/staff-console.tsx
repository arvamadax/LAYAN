"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import { ArrowDownWideNarrow, ArrowLeft, Bot, Check, CircleAlert, ExternalLink, Inbox, Maximize2, MousePointerClick, Reply, RotateCcw, Search, ShieldAlert, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { api, post } from "@/lib/api"
import type { Check as CheckT, Worker } from "@/lib/data"
import { TopBar } from "./app-bar"
import { LetterPaper, type LetterBody } from "./letter"
import { StatusBadge, WorkerTile } from "./primitives"

type QueueItem = {
  id: string
  worker: Worker
  tab: "surat" | "tiket" | "booking"
  type: string
  name: string
  nim: string | null
  prodi: string | null
  time: string
  mins: number
  line: string
  summary: string
  checks: CheckT[]
  attachments: { id: string; name: string; meta: string }[]
  letter: LetterBody | null
  timeline: { time: string; actor: string; tool: string; result: string }[]
}

const TABS = [
  ["semua", "Semua"],
  ["surat", "Surat"],
  ["tiket", "Tiket"],
  ["booking", "Booking"],
] as const
type Tab = (typeof TABS)[number][0]

const hours = (m: number) => (m >= 60 ? `${(m / 60).toFixed(1).replace(".", ",")} jam` : `${m} mnt`)

export function StaffTabs() {
  const pathname = usePathname()
  const tabs = [
    { label: "Antrean", href: "/staf" },
    { label: "Ditolak otomatis", href: "/staf/tinjau" },
    { label: "Metrik", href: "/staf/metrik" },
  ] as const
  return (
    <nav aria-label="Navigasi staf" className="flex flex-none items-center gap-1 border-b bg-card px-4 sm:px-6">
      {tabs.map((t) => {
        const on = pathname === t.href
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on || undefined}
            className={cn(
              "flex h-12 items-center px-3 text-[14px] font-semibold transition-colors",
              on ? "text-foreground shadow-[inset_0_-2px_0_var(--primary)]" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}

function Toast({ ok, title, sub, onUndo }: { ok: boolean; title: string; sub: string; onUndo: () => void }) {
  return (
    <div className="flex w-[400px] animate-toast-in items-start gap-3 rounded-lg bg-[#16181A] py-3.5 pl-4 pr-3.5 text-white shadow-toast">
      <span className={cn("mt-px grid size-[22px] flex-none place-items-center rounded-full text-[#16181A]", ok ? "bg-[#34C3A5]" : "bg-[#FF8A80]")}>
        {ok ? <Check className="size-[13px]" strokeWidth={3} /> : <X className="size-[13px]" strokeWidth={3} />}
      </span>
      <div className="flex flex-1 flex-col gap-[3px]">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-[13px] leading-[18px] text-[#C4C9CD]">{sub}</span>
      </div>
      <button type="button" onClick={onUndo} className="flex-none cursor-pointer px-1 py-0.5 text-[13px] font-bold text-[#34C3A5] hover:underline">
        Batalkan
      </button>
    </div>
  )
}

function Detail({ item, busy, onApprove, onReject, onReply, onBack }: { item: QueueItem; busy: boolean; onApprove: () => void; onReject: () => void; onReply: () => void; onBack: () => void }) {
  const ticket = item.worker === "helpdesk"
  const last = item.timeline.length - 1
  return (
    <>
      <div className="sticky top-0 z-10 flex flex-none flex-wrap items-center gap-x-4 gap-y-3 border-b bg-card px-4 py-4 sm:px-6">
        <button type="button" onClick={onBack} aria-label="Kembali ke antrean" className="grid size-11 flex-none place-items-center rounded-[12px] hover:bg-muted lg:hidden">
          <ArrowLeft className="size-[22px]" />
        </button>
        <WorkerTile worker={item.worker} size={44} />
        <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-[-0.01em]">{item.type}</h2>
            <StatusBadge status={item.worker === "helpdesk" ? "submitted" : "pending_approval"} />
          </div>
          <span className="text-[13px] text-muted-foreground">
            {item.name} · <span className="font-mono text-xs">{item.nim}</span> · {item.prodi} · masuk {item.time} ·{" "}
            <span className="font-mono text-xs">{item.id}</span>
          </span>
        </div>
        <div className="flex flex-none gap-2">
          <Button variant="destructive-outline" className="px-3.5 active:scale-[0.98]" onClick={onReject} disabled={busy}>
            <X />
            Tolak
          </Button>
          <Button className="px-[18px] active:scale-[0.98]" onClick={ticket ? onReply : onApprove} disabled={busy}>
            {ticket ? <Reply /> : <Check />}
            {ticket ? "Balas" : "Setujui"}
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-7 overflow-auto p-6">
          <section className="flex flex-col gap-2.5">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Bot className="size-4" />
              Ringkasan dari agent
            </h3>
            <p className="max-w-[640px] text-pretty text-[15px] leading-6">{item.summary}</p>
          </section>

          {item.checks.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <h3 className="text-sm font-bold">Hasil cek syarat</h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
                {item.checks.map((c) => (
                  <div key={c.label} className={cn("flex items-start gap-2.5 rounded-md border px-3 py-2.5", c.ok ? "bg-card" : "border-destructive-border bg-destructive-soft/40")}>
                    <span className={cn("grid size-5 flex-none place-items-center rounded-full [&_svg]:size-3", c.ok ? "bg-ok-bg text-ok" : "bg-destructive-soft text-destructive")}>
                      {c.ok ? <Check /> : <X />}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-semibold">{c.label}</span>
                      <span className={cn("text-xs", c.ok ? "text-muted-foreground" : "text-destructive")}>{c.note}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {item.attachments.length > 0 && (
            <section className="flex flex-col gap-2.5">
              <h3 className="text-sm font-bold">Lampiran</h3>
              <div className="flex flex-wrap gap-2">
                {item.attachments.map((f) => (
                  <a key={f.id} href={`/api/attachments/${f.id}`} target="_blank" rel="noreferrer" className="flex w-[260px] items-center gap-3 rounded-[12px] border p-2.5 hover:border-primary">
                    <div className="relative flex h-[60px] w-12 flex-none flex-col gap-[3px] rounded-[6px] border bg-background px-[5px] py-1.5">
                      <span className="h-1.5 w-[70%] rounded-[1px] bg-dash" />
                      <span className="h-0.5 bg-input" />
                      <span className="h-0.5 bg-input" />
                      <span className="h-0.5 w-[60%] bg-input" />
                      <span className="absolute bottom-1 left-1 rounded-[3px] bg-[#B3261E] px-[3px] py-px font-mono text-[7px] font-semibold text-white">
                        {f.meta.split(" ")[0]}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[13px] font-semibold">{f.name}</span>
                      <span className="text-xs text-muted-foreground">{f.meta}</span>
                    </div>
                    <ExternalLink className="size-4 flex-none text-muted-foreground" />
                  </a>
                ))}
              </div>
            </section>
          )}

          {item.letter && (
            <section className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">Pratinjau draft surat</h3>
                <a href={`/surat/${item.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:text-primary-hover">
                  <Maximize2 className="size-3.5" />
                  Buka PDF
                </a>
              </div>
              <div className="flex justify-center rounded-[12px] bg-muted p-6">
                <LetterPaper letter={item.letter} student={item} />
              </div>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4 overflow-auto border-t bg-panel p-6 lg:border-l lg:border-t-0">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-bold">Linimasa aksi agent</h3>
            <span className="text-xs text-muted-foreground">{item.timeline.length} aksi · tercatat di audit log</span>
          </div>
          <ol className="flex flex-col">
            {item.timeline.map((t, i) => (
              <li key={i} className="grid grid-cols-[16px_minmax(0,1fr)] gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className="mt-[3px] size-3 flex-none rounded-full border-2"
                    style={i === last ? { background: "var(--status-pending_approval-dot)", borderColor: "var(--status-pending_approval-dot)" } : { background: "var(--card)", borderColor: "var(--status-approved-dot)" }}
                  />
                  <span className="my-[3px] w-[1.5px] flex-1 bg-border" />
                </div>
                <div className="flex min-w-0 flex-col gap-[3px] pb-[18px]">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{t.time}</span>
                    <span className="truncate font-mono text-[13px] font-semibold">{t.tool}</span>
                    {t.actor !== "agent" && <span className="text-[11px] font-semibold uppercase text-muted-foreground">{t.actor}</span>}
                  </div>
                  <span className="text-[13px] leading-[18px] text-soft-foreground">{t.result}</span>
                </div>
              </li>
            ))}
            <li className="grid grid-cols-[16px_minmax(0,1fr)] gap-3">
              <div className="flex justify-center">
                <span className="mt-[3px] size-3 rounded-full border-2 border-dashed border-violet-dot bg-card" />
              </div>
              <div className="flex flex-col gap-[3px]">
                <span className="text-[13px] font-semibold text-violet">Menunggu keputusan staf</span>
                <span className="text-xs text-muted-foreground">{ticket ? "Balas atau tolak tiket" : "Setujui atau tolak pengajuan"}</span>
              </div>
            </li>
          </ol>
        </aside>
      </div>
    </>
  )
}

function QueueSkeleton() {
  return (
    <div aria-label="Memuat antrean">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 border-b px-4 py-3.5">
          <span className="size-8 animate-pulse rounded-[9px] bg-muted" />
          <span className="flex flex-col gap-2">
            <span className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
            <span className="h-3 w-full animate-pulse rounded bg-muted" />
          </span>
        </div>
      ))}
    </div>
  )
}

export function StaffConsole() {
  const [items, setItems] = useState<QueueItem[] | null>(null)
  const [loadError, setLoadError] = useState("")
  const [tab, setTab] = useState<Tab>("semua")
  const [q, setQ] = useState("")
  const [oldestFirst, setOldestFirst] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [dialog, setDialog] = useState<"reject" | "reply" | null>(null)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(
    () =>
      api<QueueItem[]>("/staff/queue").then(
        (xs) => {
          setItems(xs)
          setLoadError("")
        },
        (e: Error) => setLoadError(e.message),
      ),
    [],
  )

  useEffect(() => {
    load()
    // Item baru dari agent muncul tanpa reload halaman.
    const t = setInterval(() => document.visibilityState === "visible" && load(), 5000)
    return () => clearInterval(t)
  }, [load])

  const live = items ?? []
  // antrean urut dari yang paling lama menunggu; cari menyaring nama/NIM di klien
  const needle = q.trim().toLowerCase()
  const visible = live
    .filter((x) => tab === "semua" || x.tab === tab)
    .filter((x) => !needle || x.name.toLowerCase().includes(needle) || (x.nim ?? "").toLowerCase().includes(needle))
    .sort((a, b) => (oldestFirst ? b.mins - a.mins : a.mins - b.mins))
  const cur = visible.find((x) => x.id === selected) ?? visible[0]
  const first = cur?.name.split(" ")[0] ?? "mahasiswa"
  const counts = { semua: live.length, surat: 0, tiket: 0, booking: 0 }
  live.forEach((x) => counts[x.tab]++)

  async function decide(approve: boolean, text = "") {
    if (!cur) return
    setBusy(true)
    try {
      const id = cur.id
      const next = visible.find((q) => q.id !== id)?.id ?? null
      const reply = approve && cur.worker === "helpdesk"
      const res = await post<{ title: string; sub: string }>(`/staff/requests/${id}/decide`, {
        approve,
        reason: approve ? undefined : text.trim(),
        answer: reply ? text.trim() : undefined,
      })
      setDialog(null)
      setReason("")
      setSelected(next)
      setItems((xs) => xs?.filter((x) => x.id !== id) ?? xs)
      load()
      toast.custom(
        (t) => (
          <Toast
            ok={approve}
            title={res.title}
            sub={res.sub}
            onUndo={async () => {
              toast.dismiss(t)
              try {
                await post(`/staff/requests/${id}/undo`)
                setSelected(id)
                load()
              } catch (e) {
                toast.error((e as Error).message)
              }
            }}
          />
        ),
        { duration: 6000 },
      )
    } catch (e) {
      toast.error((e as Error).message)
      load()
    } finally {
      setBusy(false)
    }
  }

  const chips = [
    { label: "Lampiran tidak valid", text: `Lampiran belum sesuai atau belum mencantumkan nama ${first}. Upload dokumen yang benar, lalu ajukan ulang lewat chat.` },
    { label: "Data tidak sesuai", text: "Data di permintaan berbeda dengan dokumen pendukung. Cek ulang isiannya, lalu ajukan ulang lewat chat." },
    { label: "Di luar ketentuan", text: "Permintaan ini di luar ketentuan yang berlaku. Silakan datang ke Layanan Akademik di jam kerja untuk dibantu." },
  ]

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <TopBar section="Staff Console" themeToggle />
      <StaffTabs />

      <div className="grid flex-1 grid-cols-1 gap-4 px-4 pb-4 pt-4 sm:px-6 lg:h-[calc(100dvh-160px)] lg:min-h-[560px] lg:grid-cols-[400px_minmax(0,1fr)] lg:pt-4">
        <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card", selected && cur ? "hidden lg:flex" : "flex")}>
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v as Tab)
              setSelected(null)
            }}
            className="gap-3 border-b px-4 pt-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Antrean persetujuan</h2>
              <button
                type="button"
                onClick={() => setOldestFirst((v) => !v)}
                aria-pressed={oldestFirst}
                aria-label={oldestFirst ? "Urutkan: terbaru dulu" : "Urutkan: terlama dulu"}
                title={oldestFirst ? "Urutkan: terbaru dulu" : "Urutkan: terlama dulu"}
                className="flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowDownWideNarrow className="size-3.5" />
                {oldestFirst ? "Terlama" : "Terbaru"}
              </button>
            </div>
            <TabsList variant="line" className="h-auto gap-1 p-0">
              {TABS.map(([k, label]) => (
                <TabsTrigger
                  key={k}
                  value={k}
                  className="h-11 flex-none gap-1.5 rounded-none px-2.5 text-[13px] font-semibold text-muted-foreground after:hidden data-[state=active]:text-foreground data-[state=active]:shadow-[inset_0_-2px_0_var(--primary)]! dark:data-[state=active]:border-transparent"
                >
                  {label}
                  <span className={cn("inline-grid h-[18px] min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold", tab === k ? "bg-ink text-ink-foreground" : "bg-muted text-muted-foreground")}>
                    {counts[k]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="border-b px-4 py-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama atau NIM…"
                aria-label="Cari nama atau NIM"
                className="h-11 bg-background pl-9"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {loadError && (
              <div role="alert" className="flex items-start gap-2 border-b bg-destructive-soft/60 px-4 py-2.5 text-[13px] text-destructive">
                <CircleAlert className="mt-px size-4 flex-none" />
                {loadError}
              </div>
            )}
            {items === null && !loadError && <QueueSkeleton />}
            {visible.map((x) => {
              const on = x.id === cur?.id
              return (
                <button
                  key={x.id}
                  type="button"
                  aria-current={on || undefined}
                  onClick={() => setSelected(x.id)}
                  className={cn(
                    "grid w-full cursor-pointer grid-cols-[32px_minmax(0,1fr)] gap-3 border-b px-4 py-3.5 text-left",
                    on ? "bg-accent shadow-[inset_3px_0_0_var(--primary)]" : "hover:bg-background",
                  )}
                >
                  <WorkerTile worker={x.worker} size={32} />
                  <span className="flex min-w-0 flex-col gap-[3px]">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold">{x.name}</span>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">menunggu {hours(x.mins)}</span>
                    </span>
                    <span className="text-xs font-semibold" style={{ color: `var(--worker-${x.worker})` }}>{x.type}</span>
                    <span className="truncate text-[13px] text-soft-foreground">{x.prodi ? `${x.prodi} · ` : ""}{x.line}</span>
                  </span>
                </button>
              )
            })}
            {items !== null && visible.length === 0 && (
              <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
                <span className="grid size-12 place-items-center rounded-lg bg-accent text-primary">
                  <Inbox className="size-6" />
                </span>
                <span className="text-base font-bold">{needle ? "Tidak ada hasil" : "Antrean kosong"}</span>
                <span className="max-w-[260px] text-pretty text-[13px] leading-[19px] text-muted-foreground">
                  {needle ? `Tidak ada yang cocok dengan “${q.trim()}”. Coba nama atau NIM lain.` : "Semua permintaan sudah diputuskan. Item baru dari agent akan muncul di sini."}
                </span>
              </div>
            )}
          </div>
        </section>

        <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card", selected && cur ? "flex" : "hidden lg:flex")}>
          {cur ? (
            <Detail key={cur.id} item={cur} busy={busy} onApprove={() => decide(true)} onReject={() => setDialog("reject")} onReply={() => setDialog("reply")} onBack={() => setSelected(null)} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2.5 p-10 text-center text-muted-foreground">
              <span className="grid size-12 place-items-center rounded-lg bg-muted">
                <MousePointerClick className="size-[22px] text-icon" />
              </span>
              <span className="text-[15px] font-semibold text-foreground">Belum ada item dipilih</span>
              <span className="text-[13px]">Detail permintaan, cek syarat, dan audit log tampil di sini.</span>
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={!!dialog && !!cur}
        onOpenChange={(o) => {
          if (!o) {
            setDialog(null)
            setReason("")
          }
        }}
      >
        <DialogContent showCloseButton={false} className="w-[500px] max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-[16px] border-0 p-0 shadow-e2 sm:max-w-[500px]">
          <div className="flex flex-col gap-1.5 px-6 pt-[22px]">
            <div className="flex items-start justify-between gap-4">
              <DialogTitle className="text-lg font-bold">{dialog === "reply" ? `Balas tiket ${cur?.id}` : `Tolak ${cur?.type}?`}</DialogTitle>
              <button type="button" aria-label="Tutup" onClick={() => setDialog(null)} className="-mr-2 -mt-1.5 grid size-8 cursor-pointer place-items-center rounded-[8px] hover:bg-muted">
                <X className="size-4 text-muted-foreground" />
              </button>
            </div>
            <DialogDescription className="text-sm leading-5 text-muted-foreground">
              {dialog === "reply" ? `Jawaban dikirim ke ${first} lewat chat. Pertanyaan: ${cur?.summary}` : `Alasan dikirim ke ${first} lewat chat, bersama langkah berikutnya.`}
            </DialogDescription>
          </div>
          <div className="flex flex-col gap-3 px-6 py-[18px]">
            <div className={cn("flex flex-wrap gap-1.5", dialog === "reply" && "hidden")}>
              {chips.map((c) => (
                <button key={c.label} type="button" onClick={() => setReason(c.text)} className="inline-flex h-11 cursor-pointer items-center rounded-full border border-input px-3 text-[13px] font-medium hover:bg-muted">
                  {c.label}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold">
                {dialog === "reply" ? "Jawaban" : "Alasan penolakan"} <span className="text-destructive">*</span>
              </span>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={dialog === "reply" ? "Tulis jawaban yang jelas, sebut sumber atau langkahnya" : "Tulis alasan dan apa yang perlu dilakukan mahasiswa"}
              />
              <span className="text-xs text-muted-foreground">
                {dialog === "reply" ? "Wajib diisi. Mahasiswa menerima jawaban ini apa adanya." : "Wajib diisi. Minimal sebut alasan dan langkah berikutnya."}
              </span>
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t bg-background px-6 py-3.5">
            <Button variant="ghost" className="px-3.5" onClick={() => setDialog(null)}>
              Batal
            </Button>
            {dialog === "reply" ? (
              <Button disabled={!reason.trim() || busy} onClick={() => decide(true, reason)}>
                <Reply />
                Kirim jawaban
              </Button>
            ) : (
              <Button variant="destructive" disabled={!reason.trim() || busy} onClick={() => decide(false, reason)}>
                Tolak permintaan
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ---------- Ditolak otomatis: penolakan agent karena melanggar ketentuan layanan ---------- */

type AutoRejected = {
  id: string
  worker: Worker
  type: string
  name: string
  nim: string | null
  prodi: string | null
  time: string
  rule: string
  rule_label: string
  reason: string
  summary: string
  reviewed_by: string | null
  timeline: { time: string; actor: string; tool: string; result: string }[]
}

/** Staf memeriksa penolakan otomatis: tetap ditolak (dicatat) atau dibatalkan (mahasiswa dikabari lewat chat). */
export function AutoRejectedReview() {
  const [items, setItems] = useState<AutoRejected[] | null>(null)
  const [loadError, setLoadError] = useState("")
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(
    () =>
      api<AutoRejected[]>("/staff/auto-rejected").then(
        (xs) => {
          setItems(xs)
          setLoadError("")
        },
        (e: Error) => setLoadError(e.message),
      ),
    [],
  )

  useEffect(() => {
    load()
    const t = setInterval(() => document.visibilityState === "visible" && load(), 10000)
    return () => clearInterval(t)
  }, [load])

  async function review(id: string, reopen: boolean) {
    setBusy(id)
    try {
      const res = await post<{ title: string; sub: string }>(`/staff/requests/${id}/review`, { reopen })
      toast.success(res.title, { description: res.sub })
      load()
    } catch (e) {
      toast.error((e as Error).message)
      load()
    } finally {
      setBusy(null)
    }
  }

  const open = (items ?? []).filter((x) => !x.reviewed_by).length

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <TopBar section="Staff Console" themeToggle />
      <StaffTabs />
      <main className="mx-auto flex w-full max-w-[880px] flex-col gap-4 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold tracking-[-0.01em]">Ditolak otomatis</h1>
          <p className="max-w-[640px] text-pretty text-sm leading-[21px] text-muted-foreground">
            Agent menolak permintaan yang jelas melanggar ketentuan layanan, misalnya mengajukan atas nama orang lain atau meminta isi surat yang tidak benar.
            Periksa alasannya. Kalau keliru, batalkan penolakan dan mahasiswa dikabari lewat chat. 14 hari terakhir{items ? ` · ${open} belum ditinjau` : ""}.
          </p>
        </div>

        {loadError && (
          <div role="alert" className="flex items-start gap-2 rounded-md bg-destructive-soft/60 px-4 py-2.5 text-[13px] text-destructive">
            <CircleAlert className="mt-px size-4 flex-none" />
            {loadError}
          </div>
        )}
        {items === null && !loadError && <QueueSkeleton />}
        {items !== null && items.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-card px-8 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-lg bg-accent text-primary">
              <Inbox className="size-6" />
            </span>
            <span className="text-base font-bold">Belum ada penolakan otomatis</span>
            <span className="max-w-[300px] text-pretty text-[13px] leading-[19px] text-muted-foreground">Permintaan yang ditolak agent karena melanggar ketentuan akan muncul di sini.</span>
          </div>
        )}

        {items?.map((x) => (
          <article key={x.id} className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start gap-3">
              <WorkerTile worker={x.worker} size={40} />
              <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold">{x.type}</h2>
                  <StatusBadge status="rejected" />
                </div>
                <span className="text-[13px] text-muted-foreground">
                  {x.name} · <span className="font-mono text-xs">{x.nim}</span>{x.prodi ? ` · ${x.prodi}` : ""} · {x.time} · <span className="font-mono text-xs">{x.id}</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Permintaan mahasiswa</span>
              <p className="text-pretty text-[15px] leading-6">{x.summary || "-"}</p>
            </div>

            <div className="flex items-start gap-2.5 rounded-md border border-destructive-border bg-destructive-soft/40 px-3 py-2.5">
              <ShieldAlert className="mt-px size-4 flex-none text-destructive" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold">{x.rule_label}</span>
                <span className="text-xs text-destructive">{x.reason}</span>
              </div>
            </div>

            <details className="group text-[13px]">
              <summary className="flex min-h-11 cursor-pointer items-center gap-1.5 font-semibold text-muted-foreground hover:text-foreground">
                <Bot className="size-4" />
                Linimasa aksi agent ({x.timeline.length})
              </summary>
              <ol className="mt-1 flex flex-col gap-2 border-l pl-4">
                {x.timeline.map((t, i) => (
                  <li key={i} className="flex flex-col gap-0.5">
                    <span className="flex items-baseline gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{t.time}</span>
                      <span className="font-mono text-[13px] font-semibold">{t.tool}</span>
                      {t.actor !== "agent" && <span className="text-[11px] font-semibold uppercase text-muted-foreground">{t.actor}</span>}
                    </span>
                    <span className="text-soft-foreground">{t.result}</span>
                  </li>
                ))}
              </ol>
            </details>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
              {x.reviewed_by ? (
                <span className="mr-auto flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <Check className="size-4 text-ok" />
                  Penolakan dikonfirmasi {x.reviewed_by}
                </span>
              ) : (
                <Button variant="outline" size="card" disabled={busy === x.id} onClick={() => review(x.id, false)}>
                  <Check />
                  Penolakan benar
                </Button>
              )}
              <Button size="card" disabled={busy === x.id} onClick={() => review(x.id, true)}>
                <RotateCcw />
                Batalkan penolakan
              </Button>
            </div>
          </article>
        ))}
      </main>
    </div>
  )
}
