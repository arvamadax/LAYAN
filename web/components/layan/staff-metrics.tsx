"use client"

import { useEffect, useState } from "react"
import { CircleAlert, RefreshCw } from "lucide-react"
import { api } from "@/lib/api"
import { TopBar } from "./app-bar"
import { StaffTabs } from "./staff-console"

type Metrics = {
  total: number
  by: { surat: number; tiket: number; booking: number; laporan: number; jawaban: number }
  avg_minutes: number | null
  auto: number
  handled: number
  auto_pct: number
  saved_minutes: number
  tokens: { calls: number; input: number; output: number; cache_pct: number; per_request: number }
}

type Day = { date: string; total: number; auto: number; surat: number; tiket: number; booking: number; laporan: number }

const hours = (m: number) => (m >= 60 ? `${(m / 60).toFixed(1).replace(".", ",")} jam` : `${m} mnt`)

// "2026-10-04" -> "4 Okt". Manual agar sama di server dan browser.
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
const shortDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${BULAN[m - 1] ?? ""}`
}

// Hari ini + jam sekarang (WIB) untuk keterangan kesegaran data.
const todayID = () => {
  const t = new Date(Date.now() + 7 * 3600 * 1000)
  const p = (n: number) => String(n).padStart(2, "0")
  return { date: `${t.getUTCDate()} ${BULAN[t.getUTCMonth()]} ${t.getUTCFullYear()}`, time: `${p(t.getUTCHours())}.${p(t.getUTCMinutes())}` }
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:p-5">
      <h2 className="text-[15px] font-bold">{title}</h2>
      {children}
    </section>
  )
}

function Summary({ label, value, note }: { label: string; value: React.ReactNode; note: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[12px] border bg-card px-4 py-3.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="font-mono text-[26px] font-bold leading-[30px] tracking-[-0.02em]">{value}</span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </div>
  )
}

/** Bar horizontal: label + batang + angka, terbaca tanpa hover. */
function Bars({ items, barTitle, auto }: { items: { label: string; value: number; color: string }[]; barTitle: string; auto?: (i: number) => number }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <div>
      <div className="flex flex-col gap-3" role="img" aria-label={barTitle}>
        {items.map((it, i) => {
          const a = auto?.(i) ?? 0
          return (
            <div key={it.label} className="grid grid-cols-[92px_minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:gap-3">
              <span className="truncate text-[13px] font-medium">{it.label}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full" style={{ width: `${(it.value / max) * 100}%`, background: it.color }} />
              </span>
              <span className="text-right font-mono text-[13px] font-bold">
                {it.value}
                {a > 0 && <span className="font-sans font-medium text-muted-foreground"> · {a} otomatis</span>}
              </span>
            </div>
          )
        })}
      </div>
      <table className="sr-only">
        <caption>{barTitle}</caption>
        <tbody>
          {items.map((it, i) => {
            const a = auto?.(i) ?? 0
            return (
              <tr key={it.label}>
                <th scope="row">{it.label}</th>
                <td>{a > 0 ? `${it.value} (${a} otomatis)` : `${it.value}`}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Proporsi selesai otomatis: angka hero + batang tumpuk + rincian. Satu pesan sekilas. */
function Proportion({ auto, handled, pct }: { auto: number; handled: number; pct: number }) {
  const staff = Math.max(0, handled - auto)
  const frac = handled > 0 ? auto / handled : 0
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 font-bold leading-none tracking-[-0.03em] text-[length:clamp(44px,6vw,64px)]">
        {pct}
        <span className="text-[0.55em]">%</span>
      </p>
      <p className="m-0 max-w-[440px] text-pretty text-[15px] leading-[1.55] text-muted-foreground">
        permintaan selesai tanpa staf hari ini
      </p>
      <div className="h-3.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${pct}% selesai otomatis dari ${handled} permintaan`}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${frac * 100}%` }} />
      </div>
      <ul className="flex w-full flex-col gap-2 text-[13px]">
        <li className="flex items-center gap-2.5">
          <span aria-hidden className="size-2.5 rounded-full" style={{ background: "var(--primary)" }} />
          <span className="flex-1 font-medium">Selesai otomatis</span>
          <span className="font-mono font-bold">{auto}</span>
        </li>
        <li className="flex items-center gap-2.5">
          <span aria-hidden className="size-2.5 rounded-full bg-muted" />
          <span className="flex-1 font-medium">Diteruskan ke staf</span>
          <span className="font-mono font-bold">{staff}</span>
        </li>
      </ul>
      <table className="sr-only">
        <caption>Proporsi selesai otomatis</caption>
        <tbody>
          <tr><th scope="row">Selesai otomatis</th><td>{auto}</td></tr>
          <tr><th scope="row">Diteruskan ke staf</th><td>{staff}</td></tr>
        </tbody>
      </table>
    </div>
  )
}

/** Tren 30 hari: strip kolom kompak untuk bentuknya, angka kunci sebagai teks. */
function Trend({ days }: { days: Day[] }) {
  const max = Math.max(1, ...days.map((d) => d.total))
  const total = days.reduce((s, d) => s + d.total, 0)
  const peak = days.reduce((a, b) => (b.total > a.total ? b : a), days[0])
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-32 items-end gap-[3px]" role="img" aria-label={`Tren 30 hari: total ${total}, puncak ${peak.total} pada ${shortDate(peak.date)}`}>
        {days.map((d) => (
          <span
            key={d.date}
            title={`${shortDate(d.date)}: ${d.total}${d.auto > 0 ? ` (${d.auto} otomatis)` : ""}`}
            className="min-w-0 flex-1 rounded-sm"
            style={{
              height: d.total > 0 ? `${Math.max(8, (d.total / max) * 100)}%` : "2px",
              background: d.total > 0 ? "var(--primary)" : "var(--border)",
            }}
          />
        ))}
      </div>
      <div aria-hidden className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{shortDate(days[0].date)}</span>
        <span>{shortDate(days[days.length - 1].date)}</span>
      </div>
      <p className="m-0 text-[13px] text-muted-foreground">
        Total <span className="font-mono font-bold text-foreground">{total}</span>
        {" · "}puncak <span className="font-mono font-bold text-foreground">{peak.total}</span> ({shortDate(peak.date)})
      </p>
      <table className="sr-only">
        <caption>Jumlah permintaan per hari dalam 30 hari terakhir</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <th scope="row">{shortDate(d.date)}</th>
              <td>{d.auto > 0 ? `${d.total} (${d.auto} otomatis)` : `${d.total}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function StaffMetrics() {
  const [m, setM] = useState<Metrics | null>(null)
  const [days, setDays] = useState<Day[] | null>(null)
  const [daysError, setDaysError] = useState("")
  const [waiting, setWaiting] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [updated, setUpdated] = useState("")
  const [spin, setSpin] = useState(0)

  // Metrik + tren itu inti halaman; jumlah antrean opsional (gagal = tampil "–").
  useEffect(() => {
    let alive = true
    api<{ id: string }[]>("/staff/queue").then(
      (qq) => alive && setWaiting(qq.length),
      () => alive && setWaiting(null),
    )
    api<Metrics>("/staff/metrics").then(
      (mm) => {
        if (!alive) return
        setM(mm)
        setError("")
        setUpdated(todayID().time)
      },
      (e: Error) => alive && setError(e.message),
    )
    // Tren harian gagal tidak boleh menjatuhkan ringkasan: error-nya tampil di kartu tren saja.
    api<Day[]>("/staff/metrics/daily?days=30").then(
      (dd) => {
        if (!alive) return
        setDays(dd)
        setDaysError("")
      },
      (e: Error) => alive && setDaysError(e.message),
    )
    return () => {
      alive = false
    }
  }, [spin])

  const fresh = todayID()

  const by = m?.by
  const kinds = by
    ? [
        { label: "Surat", value: by.surat, color: "var(--worker-surat)" },
        { label: "Tiket", value: by.tiket, color: "var(--worker-helpdesk)" },
        { label: "Booking", value: by.booking, color: "var(--worker-fasilitas)" },
        { label: "Laporan", value: by.laporan, color: "var(--worker-fasilitas)" },
        { label: "Jawaban", value: by.jawaban, color: "var(--worker-helpdesk)" },
      ]
    : []

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <TopBar section="Metrik staf" themeToggle />
      <StaffTabs />

      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-4 pb-8 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="m-0 text-[13px] text-muted-foreground">
            Ringkasan hari ini · {fresh.date}
            {updated && <span> · diperbarui {updated}</span>}
          </p>
          <button
            type="button"
            onClick={() => setSpin((x) => x + 1)}
            className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full border border-input bg-card px-3.5 text-[13px] font-semibold transition-colors hover:border-foreground"
          >
            <RefreshCw className="size-4" />
            Perbarui
          </button>
        </div>
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border bg-destructive-soft/60 px-4 py-2.5 text-[13px] text-destructive">
            <CircleAlert className="mt-px size-4 flex-none" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {(m
            ? [
                { label: "Permintaan hari ini", value: `${m.total}`, note: `Surat ${m.by.surat} · Tiket ${m.by.tiket} · Booking ${m.by.booking} · Lapor ${m.by.laporan}` },
                { label: "Rata-rata waktu proses", value: m.avg_minutes != null ? `${m.avg_minutes} mnt` : "–", note: "masuk sampai siap diputuskan" },
                { label: "Selesai otomatis", value: `${m.auto_pct}%`, note: `${m.auto} dari ${m.handled} tanpa staf` },
                { label: "Waktu staf dihemat", value: hours(m.saved_minutes), note: "estimasi dari audit log" },
                { label: "Token AI per permintaan", value: m.tokens.per_request ? m.tokens.per_request.toLocaleString("id-ID") : "–", note: `${(m.tokens.input + m.tokens.output).toLocaleString("id-ID")} token · ${m.tokens.calls} panggilan LLM${m.tokens.cache_pct > 0 ? ` · ${m.tokens.cache_pct}% dari cache` : ""}` },
                { label: "Menunggu persetujuan", value: waiting ?? "–", note: waiting === 0 ? "antrean kosong" : "di antrean sekarang" },
              ]
            : Array.from({ length: 6 }, () => null)).map((c, i) =>
            c ? (
              <Summary key={c.label} label={c.label} value={c.value} note={c.note} />
            ) : (
              <div key={i} aria-label="Memuat metrik" className="h-[104px] animate-pulse rounded-[12px] border bg-card" />
            ),
          )}
        </div>

        <Card title="Permintaan per jenis · hari ini">
          {m ? (
            <Bars barTitle="Jumlah permintaan per jenis hari ini" items={kinds} />
          ) : (
            <div aria-label="Memuat chart" className="h-[180px] animate-pulse rounded-lg bg-muted" />
          )}
        </Card>

        <Card title="Selesai otomatis vs staf · hari ini">
          {m ? (
            <Proportion auto={m.auto} handled={m.handled} pct={m.auto_pct} />
          ) : (
            <div aria-label="Memuat chart" className="h-[144px] animate-pulse rounded-lg bg-muted" />
          )}
        </Card>

        <Card title="Tren harian · 30 hari">
          {daysError ? (
            <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
              <CircleAlert className="mt-0.5 size-4 flex-none" />
              Tren harian belum bisa dimuat: {daysError}
            </p>
          ) : days ? (
            days.every((d) => d.total === 0) ? (
              <p className="text-sm text-muted-foreground">Belum ada permintaan dalam 30 hari terakhir.</p>
            ) : (
              <Trend days={days} />
            )
          ) : (
            <div aria-label="Memuat chart" className="h-[180px] animate-pulse rounded-lg bg-muted" />
          )}
        </Card>
      </div>
    </div>
  )
}
