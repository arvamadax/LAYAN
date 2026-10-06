"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { ArrowLeft, ArrowRight, CalendarDays, CircleAlert, Download, Inbox, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import type { Report, ReportStatus } from "@/lib/data"
import { TopBar } from "./app-bar"
import { TechTabs } from "./tech-tabs"
import { cn } from "@/lib/utils"

type Raw = Report & { created_at: number }

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
const WIB = 7 * 3600

// Bulan "YYYY-MM" dari detik unix, di zona Asia/Jakarta. Manual agar sama di server dan browser.
const monthKey = (ts: number) => {
  const d = new Date((ts + WIB) * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}
const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number)
  return `${BULAN[(m ?? 1) - 1] ?? ""} ${y}`
}
const shortDate = (ts: number) => {
  const d = new Date((ts + WIB) * 1000)
  return `${d.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][d.getUTCMonth()]}`
}

const STATUS_LABEL: Record<ReportStatus, string> = { baru: "Baru", dikerjakan: "Dikerjakan", eskalasi: "Eskalasi", selesai: "Selesai" }

function Summary({ label, value, note }: { label: string; value: React.ReactNode; note: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[12px] border bg-card px-4 py-3.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="font-mono text-[26px] font-medium leading-[30px] tracking-[-0.02em]">{value}</span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </div>
  )
}

function MonthPicker({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const shift = (dir: -1 | 1) => {
    const [y, m] = value.split("-").map(Number)
    const d = new Date(Date.UTC(y, m - 1 + dir, 1))
    onChange(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`)
  }
  return (
    <div className="flex items-center gap-1 print:hidden">
      <Button variant="ghost" size="icon" aria-label="Bulan sebelumnya" onClick={() => shift(-1)}>
        <ArrowLeft />
      </Button>
      <label className="flex items-center gap-2 rounded-md border border-input bg-card px-3">
        <CalendarDays className="size-4 text-muted-foreground" />
        <input
          type="month"
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          aria-label="Pilih bulan"
          className="h-11 bg-transparent text-[15px] font-semibold outline-none"
        />
      </label>
      <Button variant="ghost" size="icon" aria-label="Bulan berikutnya" onClick={() => shift(1)}>
        <ArrowRight />
      </Button>
      <span className="ml-1 text-[15px] font-bold">{monthLabel(value)}</span>
    </div>
  )
}

// CSV sesuai kolom tabel layar (dipakai tombol Unduh CSV).
function toCSV(rows: Raw[]) {
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const head = ["Ruang", "Barang/Judul", "Kategori", "Urgensi", "Pelapor", "Status", "Tanggal masuk", "Alasan eskalasi"]
  const lines = rows.map((r) =>
    [r.room, r.title, r.category, r.urgency, r.reporters, STATUS_LABEL[r.status], shortDate(r.created_at), r.note ?? "-"].map(cell).join(";"),
  )
  return `\uFEFF${head.map(cell).join(";")}\n${lines.join("\n")}`
}

export function BoardRecap() {
  const [reports, setReports] = useState<Raw[] | null>(null)
  const [error, setError] = useState("")
  const [month, setMonth] = useState(() => monthKey(Math.floor(Date.now() / 1000)))
  const [groupRoom, setGroupRoom] = useState(true)

  useEffect(() => {
    api<Raw[]>("/reports").then(
      (rs) => {
        setReports(rs)
        setError("")
      },
      (e: Error) => setError(e.message),
    )
  }, [])

  const rows = useMemo(() => (reports ?? []).filter((r) => monthKey(r.created_at) === month), [reports, month])
  const total = rows.length
  const done = rows.filter((r) => r.status === "selesai").length
  const escalated = rows.filter((r) => r.status === "eskalasi").length
  const open = total - done
  const rooms = useMemo(() => {
    const map = new Map<string, Raw[]>()
    for (const r of rows) {
      const list = map.get(r.room) ?? []
      list.push(r)
      map.set(r.room, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [rows])

  const csv = () => {
    const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `rekap-kerusakan-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const title = `Rekap kerusakan sarana · ${monthLabel(month)}`

  return (
    <div className="flex min-h-[100dvh] flex-col print:block">
      <div className="print:hidden">
        <TopBar section="Rekap bulanan" themeToggle />
        <TechTabs />
      </div>

      {/* judul khusus cetak: nav dan tombol disembunyikan */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} laporan · {done} selesai · {escalated} eskalasi · {open} masih terbuka
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-4 pb-8 pt-4 sm:px-6 print:max-w-none print:p-[12mm]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonthPicker value={month} onChange={setMonth} />
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <label className="flex h-11 cursor-pointer items-center gap-2 text-[13px] font-medium text-muted-foreground">
              <input type="checkbox" checked={groupRoom} onChange={(e) => setGroupRoom(e.target.checked)} className="size-4 accent-[var(--primary)]" />
              Kelompokkan per ruang
            </label>
            <Button variant="outline" size="card" onClick={csv} disabled={rows.length === 0}>
              <Download />
              Unduh CSV
            </Button>
            <Button size="card" onClick={() => window.print()} disabled={rows.length === 0}>
              <Printer />
              Simpan PDF
            </Button>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border bg-destructive-soft/60 px-4 py-2.5 text-[13px] text-destructive print:hidden">
            <CircleAlert className="mt-px size-4 flex-none" />
            {error}
          </div>
        )}

        {reports === null && !error ? (
          <div aria-label="Memuat rekap" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-[104px] animate-pulse rounded-[12px] border bg-card" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-8 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-lg bg-accent text-primary">
              <Inbox className="size-6" />
            </span>
            <span className="text-base font-bold">Tidak ada laporan bulan ini</span>
            <span className="max-w-[280px] text-pretty text-[13px] leading-[19px] text-muted-foreground">
              Belum ada kerusakan yang dilaporkan pada {monthLabel(month)}. Pilih bulan lain untuk melihat rekapnya.
            </span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Summary label="Jumlah laporan" value={total} note={monthLabel(month)} />
              <Summary label="Selesai" value={done} note={total > 0 ? `${Math.round((done / total) * 100)}% dari laporan` : "–"} />
              <Summary label="Eskalasi" value={escalated} note="perlu penggantian/pengadaan" />
              <Summary label="Masih terbuka" value={open} note="baru + dikerjakan + eskalasi" />
            </div>

            <section className="overflow-hidden rounded-lg border bg-card print:overflow-visible print:rounded-none print:border-0">
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full min-w-[880px] border-collapse text-left text-[13px] print:min-w-0 print:text-xs">
                  <caption className="sr-only">{title}</caption>
                  <thead>
                    <tr className="border-b bg-muted/60 text-xs text-muted-foreground">
                      {["Ruang", "Barang/Judul", "Kategori", "Urgensi", "Pelapor", "Status", "Tanggal masuk", "Alasan eskalasi"].map((h) => (
                        <th key={h} scope="col" className="whitespace-nowrap px-3 py-2.5 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  {groupRoom ? (
                    <tbody>
                      {rooms.map(([room, list]) => (
                        <Fragment key={room}>
                          <tr className="border-b bg-muted/40">
                            <th scope="rowgroup" colSpan={8} className="px-3 py-2 font-mono text-[13px] font-medium">
                              {room} <span className="font-sans font-medium text-muted-foreground">· {list.length} laporan</span>
                            </th>
                          </tr>
                          {list.map((r) => (
                            <Row key={r.id} r={r} />
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  ) : (
                    <tbody>
                      {rows.map((r) => (
                        <Row key={r.id} r={r} />
                      ))}
                    </tbody>
                  )}
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function Row({ r }: { r: Raw }) {
  const esc = r.status === "eskalasi"
  return (
    <tr className={cn("border-b last:border-0 align-top", esc && "bg-destructive-soft/40")}>
      <td className="whitespace-nowrap px-3 py-2.5 font-mono font-semibold">{r.room}</td>
      <td className="max-w-[240px] px-3 py-2.5">
        <span className="font-semibold">{r.title}</span>
        <span className="mt-0.5 block font-mono text-[11px] text-subtle-foreground">{r.id}</span>
      </td>
      <td className="px-3 py-2.5">{r.category}</td>
      <td className="whitespace-nowrap px-3 py-2.5">{r.urgency}</td>
      <td className="px-3 py-2.5 text-center font-mono">{r.reporters}</td>
      <td className="whitespace-nowrap px-3 py-2.5 font-medium">{STATUS_LABEL[r.status]}</td>
      <td className="whitespace-nowrap px-3 py-2.5">{shortDate(r.created_at)}</td>
      <td className="max-w-[200px] px-3 py-2.5 text-muted-foreground">{r.note ?? "–"}</td>
    </tr>
  )
}
