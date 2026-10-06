"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Activity as ActivityIcon, CircleAlert, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import { TopBar } from "./app-bar"

type Activity = { at: number; ip: string; action: string; detail: string; name: string | null; email: string | null; role: string | null }
type UserRow = { name: string; email: string; role: string; ai_calls: number; tokens: number; chats: number; requests: number; ips: string[]; last: number | null }
type RequestRow = { id: string; worker: string; title: string; status: string; at: number; name: string; email: string }
type Overview = { activity: Activity[]; users: UserRow[]; requests: RequestRow[] }

const ACTION: Record<string, string> = { login: "Login", login_gagal: "Login gagal", chat: "Chat AI", aksi: "Aksi card", upload: "Upload" }
const TABS = [
  ["activity", "Aktivitas & IP"],
  ["users", "Pengguna & pemakaian AI"],
  ["requests", "Permintaan layanan"],
] as const

const time = (at: number | null) =>
  at ? new Date(at * 1000).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"
const fmt = (n: number) => n.toLocaleString("id-ID")

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <th className={cn("whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-muted-foreground", right ? "text-right" : "text-left")}>{children}</th>
}
function Td({ children, right, mono, className }: { children: React.ReactNode; right?: boolean; mono?: boolean; className?: string }) {
  return <td className={cn("px-3 py-2.5 align-top text-[13px]", right && "text-right tabular-nums", mono && "font-mono text-xs", className)}>{children}</td>
}

export function AdminConsole() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("activity")
  const [q, setQ] = useState("")

  useEffect(() => {
    const load = () => api<Overview>("/admin/overview").then((d) => (setData(d), setError("")), (e: Error) => setError(e.message))
    load()
    const t = setInterval(() => document.visibilityState === "visible" && load(), 15000)
    return () => clearInterval(t)
  }, [])

  const match = (...fields: (string | null | undefined)[]) => !q || fields.some((f) => f?.toLowerCase().includes(q.toLowerCase()))
  const users = data?.users ?? []
  const stats = [
    ["Pengguna aktif", fmt(users.filter((u) => u.last).length)],
    ["Panggilan AI", fmt(users.reduce((s, u) => s + u.ai_calls, 0))],
    ["Token AI", fmt(users.reduce((s, u) => s + u.tokens, 0))],
    ["Login gagal", fmt(data?.activity.filter((a) => a.action === "login_gagal").length ?? 0)],
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <TopBar section="Admin pusat" themeToggle />
      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold">Pemantauan pemakaian</h1>
            <p className="text-[13px] text-muted-foreground">Login, IP, pemakaian AI, dan permintaan layanan. Diperbarui otomatis tiap 15 detik.</p>
          </div>
          {/* status sistem khusus admin, tidak ditautkan dari halaman publik */}
          <Link href="/uptime" className="inline-flex h-11 items-center gap-2 rounded-full border border-input bg-card px-4 text-[13px] font-semibold hover:bg-background">
            <ActivityIcon className="size-4 text-primary" />
            Uptime sistem
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 rounded-lg border bg-card p-4">
              <span className="text-xs font-semibold text-muted-foreground">{label}</span>
              <span className="text-2xl font-bold tabular-nums">{data ? value : "…"}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            {TABS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  "h-9 cursor-pointer rounded-full px-3.5 text-[13px] font-semibold",
                  tab === key ? "bg-ink text-ink-foreground" : "border border-input bg-card hover:bg-background",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex h-9 items-center gap-2 rounded-full border border-input bg-card px-3 sm:ml-auto sm:w-72">
            <Search className="size-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, email, IP…" aria-label="Cari" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" />
          </label>
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-md bg-destructive-soft/60 px-3 py-2.5 text-[13px] text-destructive">
            <CircleAlert className="mt-px size-4 flex-none" />
            {error}
          </p>
        )}

        <div className="overflow-x-auto rounded-lg border bg-card">
          {tab === "activity" && (
            <table className="w-full">
              <thead className="border-b bg-background">
                <tr><Th>Waktu</Th><Th>Pengguna</Th><Th>IP</Th><Th>Aksi</Th><Th>Detail</Th></tr>
              </thead>
              <tbody>
                {data?.activity
                  .filter((a) => match(a.name, a.email, a.ip, a.detail))
                  .map((a, i) => (
                    <tr key={i} className="border-t first:border-t-0">
                      <Td className="whitespace-nowrap text-muted-foreground">{time(a.at)}</Td>
                      <Td>
                        {a.name ? (
                          <span className="flex flex-col"><span className="font-semibold">{a.name}</span><span className="text-xs text-muted-foreground">{a.email} · {a.role}</span></span>
                        ) : (
                          <span className="text-muted-foreground">tidak dikenal</span>
                        )}
                      </Td>
                      <Td mono>{a.ip}</Td>
                      <Td className={cn("whitespace-nowrap font-semibold", a.action === "login_gagal" && "text-destructive")}>{ACTION[a.action] ?? a.action}</Td>
                      <Td className="max-w-[420px] break-words text-muted-foreground">{a.detail || "-"}</Td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {tab === "users" && (
            <table className="w-full">
              <thead className="border-b bg-background">
                <tr><Th>Pengguna</Th><Th>Peran</Th><Th right>Chat AI</Th><Th right>Panggilan AI</Th><Th right>Token</Th><Th right>Permintaan</Th><Th>IP</Th><Th>Terakhir aktif</Th></tr>
              </thead>
              <tbody>
                {users
                  .filter((u) => match(u.name, u.email, u.role, ...u.ips))
                  .map((u) => (
                    <tr key={u.email} className="border-t first:border-t-0">
                      <Td><span className="flex flex-col"><span className="font-semibold">{u.name}</span><span className="text-xs text-muted-foreground">{u.email}</span></span></Td>
                      <Td>{u.role}</Td>
                      <Td right>{fmt(u.chats)}</Td>
                      <Td right>{fmt(u.ai_calls)}</Td>
                      <Td right>{fmt(u.tokens)}</Td>
                      <Td right>{fmt(u.requests)}</Td>
                      <Td mono>{u.ips.length ? u.ips.join(", ") : "-"}</Td>
                      <Td className="whitespace-nowrap text-muted-foreground">{time(u.last)}</Td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}

          {tab === "requests" && (
            <table className="w-full">
              <thead className="border-b bg-background">
                <tr><Th>Waktu</Th><Th>ID</Th><Th>Layanan</Th><Th>Judul</Th><Th>Status</Th><Th>Mahasiswa</Th></tr>
              </thead>
              <tbody>
                {data?.requests
                  .filter((r) => match(r.name, r.email, r.id, r.title))
                  .map((r) => (
                    <tr key={r.id} className="border-t first:border-t-0">
                      <Td className="whitespace-nowrap text-muted-foreground">{time(r.at)}</Td>
                      <Td mono>{r.id}</Td>
                      <Td>{r.worker}</Td>
                      <Td>{r.title}</Td>
                      <Td>{r.status}</Td>
                      <Td><span className="flex flex-col"><span className="font-semibold">{r.name}</span><span className="text-xs text-muted-foreground">{r.email}</span></span></Td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
          {data && ((tab === "activity" && !data.activity.length) || (tab === "requests" && !data.requests.length)) && (
            <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">Belum ada data.</p>
          )}
        </div>
      </main>
    </div>
  )
}
