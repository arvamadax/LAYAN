"use client"

import { useCallback, useEffect, useState } from "react"
import { Block, SitePage, useLang } from "@/components/layan/site"

// Semua angka di sini diambil langsung: /api/health, /version, /api/app/latest, /api/public/stats.
const T = {
  id: {
    kicker: "Status sistem",
    title: "Status LAYAN.",
    sub: "Dicek langsung dari browser-mu setiap 30 detik. Angka di bawah diambil dari database, bukan perkiraan.",
    ok: "Semua sistem berjalan normal", down: "Layanan API tidak merespons", checking: "Mengecek…",
    lastCheck: "Terakhir dicek", refresh: "Cek ulang",
    partsTitle: "Komponen",
    parts: { api: "Layanan API", web: "Web app", android: "App Android" },
    up: "Normal", fail: "Gangguan", noRelease: "Belum ada rilis", build: "Build",
    statsTitle: "Angka nyata",
    statsSub: "Hitungan dari database server demo. Tidak ada data pribadi yang ditampilkan.",
    stats: { requests: "Total permintaan", requests_week: "Permintaan 7 hari terakhir", answers: "Jawaban dengan sumber", fixed_week: "Kerusakan selesai (7 hari)", auto_pct_week: "Selesai tanpa staf (7 hari)" },
    noStats: "Angka belum tersedia.",
  },
  en: {
    kicker: "System status",
    title: "LAYAN status.",
    sub: "Checked live from your browser every 30 seconds. The numbers below come from the database, not estimates.",
    ok: "All systems operational", down: "The API is not responding", checking: "Checking…",
    lastCheck: "Last checked", refresh: "Check again",
    partsTitle: "Components",
    parts: { api: "API service", web: "Web app", android: "Android app" },
    up: "Operational", fail: "Outage", noRelease: "No release yet", build: "Build",
    statsTitle: "Real numbers",
    statsSub: "Counts from the demo server database. No personal data is shown.",
    stats: { requests: "Total requests", requests_week: "Requests, last 7 days", answers: "Answers with a source", fixed_week: "Damage fixed (7 days)", auto_pct_week: "Done without staff (7 days)" },
    noStats: "Numbers are not available yet.",
  },
}

type Stats = Record<keyof (typeof T)["id"]["stats"], number>
type State = { api: boolean; ms: number; web: string | null; android: string | null; stats: Stats | null; at: Date }

const json = (url: string) => fetch(url, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)

export function StatusView() {
  const lang = useLang()
  const t = T[lang]
  const [s, setS] = useState<State | null>(null)

  const check = useCallback(async () => {
    const t0 = performance.now()
    const api = await fetch("/api/health", { cache: "no-store" }).then((r) => r.ok, () => false)
    const ms = Math.round(performance.now() - t0)
    const [web, android, stats] = await Promise.all([json("/version"), json("/api/app/latest"), api ? json("/api/public/stats") : null])
    setS({ api, ms, web: web?.v ?? null, android: android?.versionName ?? null, stats, at: new Date() })
  }, [])

  useEffect(() => {
    const first = setTimeout(check)
    const id = setInterval(check, 30_000)
    return () => (clearTimeout(first), clearInterval(id))
  }, [check])

  const tone = !s ? "bg-muted-foreground" : s.api ? "bg-primary" : "bg-destructive"
  const parts: [string, boolean, string][] = s
    ? [
        [t.parts.api, s.api, s.api ? `${t.up} · ${s.ms} ms` : t.fail],
        [t.parts.web, s.web !== null, s.web ? `${t.up} · ${t.build} ${s.web.slice(0, 8)}` : t.fail],
        [t.parts.android, s.android !== null, s.android ? `v${s.android}` : t.noRelease],
      ]
    : []

  return (
    <SitePage lang={lang} kicker={t.kicker} title={t.title} sub={t.sub}>
      <section className="px-[clamp(20px,4vw,48px)]">
        <div className="mx-auto flex w-full max-w-[1176px] flex-wrap items-center justify-between gap-4 rounded-[24px] border bg-card p-[clamp(18px,2.4vw,28px)]" aria-live="polite">
          <span className="flex items-center gap-3.5 text-[length:clamp(18px,1.6vw,22px)] font-semibold">
            <span className="relative flex size-3">
              {s?.api && <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />}
              <span className={`relative size-3 rounded-full ${tone}`} />
            </span>
            {!s ? t.checking : s.api ? t.ok : t.down}
          </span>
          <span className="flex items-center gap-3 text-[13.5px] text-muted-foreground">
            {s && <span>{t.lastCheck} {s.at.toLocaleTimeString(lang === "en" ? "en-GB" : "id-ID")}</span>}
            <button type="button" onClick={check} className="h-9 cursor-pointer rounded-full border px-3.5 font-medium text-foreground transition-colors hover:border-foreground">{t.refresh}</button>
          </span>
        </div>
      </section>

      <Block title={t.partsTitle}>
        <div className="divide-y rounded-[24px] border bg-card">
          {(s ? parts : [[t.parts.api], [t.parts.web], [t.parts.android]] as [string, boolean?, string?][]).map(([name, up, note]) => (
            <div key={name} className="flex items-center justify-between gap-4 px-[clamp(18px,2.4vw,28px)] py-4">
              <span className="text-[15.5px] font-semibold">{name}</span>
              <span className="flex items-center gap-2 text-[14px] text-muted-foreground">
                <span className={`size-2 rounded-full ${up === undefined ? "bg-muted-foreground/40" : up ? "bg-primary" : "bg-warn"}`} />
                {note ?? "…"}
              </span>
            </div>
          ))}
        </div>
      </Block>

      <Block title={t.statsTitle} sub={t.statsSub}>
        {s && !s.stats ? (
          <p className="m-0 text-[15px] text-muted-foreground">{t.noStats}</p>
        ) : (
          <dl className="m-0 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {(Object.keys(t.stats) as (keyof Stats)[]).map((k) => (
              <div key={k} className="flex flex-col-reverse justify-end gap-1.5 rounded-[20px] border bg-card p-5">
                <dt className="text-[13.5px] text-muted-foreground">{t.stats[k]}</dt>
                <dd className="m-0 text-[length:clamp(28px,3vw,40px)] font-semibold tracking-[-.03em] tabular-nums">
                  {s?.stats ? `${s.stats[k].toLocaleString(lang === "en" ? "en-US" : "id-ID")}${k === "auto_pct_week" ? "%" : ""}` : <span className="inline-block h-9 w-16 animate-pulse rounded-lg bg-muted align-middle" />}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Block>
    </SitePage>
  )
}
