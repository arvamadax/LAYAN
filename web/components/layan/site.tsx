"use client"

import { useSyncExternalStore, type ReactNode } from "react"
import Link from "next/link"
import { HOME } from "@/lib/data"
import { ThemeToggle } from "@/components/layan/app-bar"
import { useStore } from "@/components/layan/store"

// Bagian bersama landing (/) dan halaman publik lain (/faq, /unduh, /status, /keamanan, /untuk-staf):
// pilihan bahasa, logo, header halaman, dan footer.

export type Lang = "id" | "en"

// bahasa disimpan di localStorage; event lokal supaya useSyncExternalStore ikut berubah
const LANG_EVENT = "layan-lang"
const subscribeLang = (cb: () => void) => {
  window.addEventListener("storage", cb)
  window.addEventListener(LANG_EVENT, cb)
  return () => {
    window.removeEventListener("storage", cb)
    window.removeEventListener(LANG_EVENT, cb)
  }
}
const readLang = (): Lang => {
  try {
    return localStorage.getItem("layan_lang") === "en" ? "en" : "id"
  } catch {
    return "id"
  }
}
export const setLang = (l: Lang) => {
  try {
    localStorage.setItem("layan_lang", l)
  } catch {}
  window.dispatchEvent(new Event(LANG_EVENT))
}
export const useLang = () => useSyncExternalStore(subscribeLang, readLang, () => "id" as Lang)

/** Logo LAYAN (public/logo.svg): kotak ink + huruf L + titik hijau. */
export function Logo({ size }: { size: number }) {
  return (
    <span aria-hidden className="inline-flex shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 72 72" width={size} height={size} aria-hidden>
        <rect width="72" height="72" rx="18" fill="#16181A" />
        <path d="M25,19 V51 H47" fill="none" stroke="#F0F0EC" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="51" cy="21" r="7" fill="#0A7A66" />
      </svg>
    </span>
  )
}

export function LangSwitch({ lang, label }: { lang: Lang; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex rounded-full border bg-card/60 p-1">
      {(["id", "en"] as const).map((l) => (
        <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l} className={`h-9 min-w-11 cursor-pointer rounded-full px-3 text-xs font-semibold uppercase tracking-[.06em] transition-colors duration-300 ${lang === l ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          {l}
        </button>
      ))}
    </div>
  )
}

export const GUTTER = "px-[clamp(20px,4vw,48px)]"
export const WRAP = "mx-auto w-full max-w-[1176px]"
export const H2 = "text-[length:clamp(28px,3.2vw,44px)] font-semibold leading-[1.08] tracking-[-.035em] text-balance"
export const SUB = "text-[length:clamp(16px,1.2vw,18px)] leading-[1.6] text-soft-foreground text-pretty"
export const BTN_DARK = "inline-flex h-12 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-full bg-ink px-6 text-[15px] font-semibold text-ink-foreground transition-all duration-300 ease-[cubic-bezier(.2,.7,.2,1)] hover:-translate-y-0.5 active:scale-[.98]"
export const BTN_LINE = "inline-flex h-12 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-full border border-input px-6 text-[15px] font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground hover:bg-card active:scale-[.98]"

const SITE = {
  id: {
    lang: "Bahasa", nav: "Navigasi", signin: "Masuk", open: "Buka LAYAN",
    links: { layanan: "Layanan", cara: "Cara kerja", unduh: "Unduh app", staf: "Untuk staf", tek: "Untuk teknisi", faq: "FAQ", status: "Status sistem", keamanan: "Keamanan & sumber", source: "Kode sumber" },
    col: "Lainnya",
    tagline: "Asisten layanan kampus. Satu chat untuk surat akademik, aturan akademik, booking ruang, dan laporan kerusakan.",
    made: "Dibuat untuk PENS Hackathon 2026.",
    kbNote: "Isi pedoman akademik di basis pengetahuan masih contoh, bukan dokumen resmi.",
  },
  en: {
    lang: "Language", nav: "Navigation", signin: "Sign in", open: "Open LAYAN",
    links: { layanan: "Services", cara: "How it works", unduh: "Get the app", staf: "For staff", tek: "For technicians", faq: "FAQ", status: "System status", keamanan: "Trust & sources", source: "Source code" },
    col: "More",
    tagline: "Campus service assistant. One chat for academic letters, academic rules, room booking, and damage reports.",
    made: "Built for PENS Hackathon 2026.",
    kbNote: "The academic handbook in the knowledge base is sample content, not an official document.",
  },
}

export function SiteFooter({ lang }: { lang: Lang }) {
  const s = SITE[lang], l = s.links
  const links: [string, string][] = [[l.source, "https://github.com/arvamadax/LAYAN"], [l.keamanan, "/keamanan"], [s.signin, "/login"]]
  return (
    <footer className={`border-t bg-panel/40 pt-14 pb-8 ${GUTTER}`}>
      <div className={`${WRAP} max-w-[1376px]`}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[1.4fr_minmax(0,1fr)]">
          <div className="col-span-2 flex max-w-[340px] flex-col gap-3 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 text-[16px] font-extrabold tracking-[.04em] text-foreground">
              <Logo size={24} />
              LAYAN
            </Link>
            <p className="m-0 text-[14px] leading-relaxed text-muted-foreground">{s.tagline}</p>
          </div>
          <nav aria-label={s.col} className="flex flex-col gap-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-subtle-foreground">{s.col}</span>
            {links.map(([label, href]) => (
              <Link key={href} href={href} className="w-fit text-[14.5px] text-soft-foreground transition-colors hover:text-foreground">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t pt-6 text-[13px] text-muted-foreground">
          <span>© 2026 LAYAN · {s.made}</span>
          <span>{s.kbNote}</span>
        </div>
      </div>
    </footer>
  )
}

/** Kerangka halaman publik selain landing: header sederhana, judul halaman, isi, footer. */
export function SitePage({ lang, kicker, title, sub, children }: { lang: Lang; kicker: string; title: string; sub: string; children: ReactNode }) {
  const { me } = useStore()
  const s = SITE[lang], l = s.links
  const links: [string, string][] = [[l.layanan, "/#layanan"], [l.unduh, "/unduh"], [l.staf, "/untuk-staf"], [l.tek, "/untuk-teknisi"], [l.faq, "/faq"], [l.status, "/status"]]
  return (
    <div className="min-h-dvh bg-background text-foreground antialiased selection:bg-accent [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-[3px] [&_:focus-visible]:outline-ring">
      <header className={`sticky top-0 z-50 border-b bg-background/85 backdrop-blur-md ${GUTTER}`}>
        <div className={`${WRAP} max-w-[1376px] flex h-16 items-center justify-between gap-4`}>
          <Link href="/" aria-label="LAYAN" className="flex items-center gap-2.5 text-[17px] font-extrabold tracking-[.04em]">
            <Logo size={26} />
            LAYAN
          </Link>
          <nav aria-label={s.nav} className="hidden items-center gap-0.5 lg:flex">
            {links.map(([label, href]) => <NavLink key={href} href={href} label={label} />)}
          </nav>
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <LangSwitch lang={lang} label={s.lang} />
            <Link href={me ? HOME[me.role] : "/login"} className={`${BTN_DARK} h-11 px-5 text-[14.5px]`}>{me ? s.open : s.signin}</Link>
          </div>
        </div>
        {/* HP: link halaman bisa digeser */}
        <nav aria-label={s.nav} className="-mx-[clamp(20px,4vw,48px)] flex gap-1 overflow-x-auto px-[clamp(14px,4vw,42px)] pb-2.5 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
          {links.map(([label, href]) => <NavLink key={href} href={href} label={label} />)}
        </nav>
      </header>

      <main>
        <section className={`pt-[clamp(48px,9vh,96px)] pb-[clamp(32px,6vh,64px)] ${GUTTER}`}>
          <div className={`${WRAP} animate-[layanMsgIn_.7s_cubic-bezier(.2,.7,.2,1)_both] motion-reduce:animate-none`}>
            <span className="text-xs font-semibold uppercase tracking-[.1em] text-primary">{kicker}</span>
            <h1 className="mt-4 max-w-[18ch] text-[length:clamp(38px,5.4vw,76px)] font-semibold leading-[1.02] tracking-[-.045em] text-balance">{title}</h1>
            <p className={`mt-5 max-w-[620px] ${SUB}`}>{sub}</p>
          </div>
        </section>
        {children}
      </main>
      <SiteFooter lang={lang} />
    </div>
  )
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="whitespace-nowrap rounded-full px-3.5 py-2 text-[14.5px] font-medium text-muted-foreground transition-colors duration-300 hover:bg-foreground/5 hover:text-foreground">
      {label}
    </Link>
  )
}

/** Satu blok isi halaman dengan judul. */
export function Block({ title, sub, children, id }: { title: string; sub?: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className={`py-[clamp(40px,7vh,80px)] ${GUTTER}`}>
      <div className={WRAP}>
        <h2 className={H2}>{title}</h2>
        {sub && <p className={`mt-3 max-w-[620px] ${SUB}`}>{sub}</p>}
        <div className="mt-[clamp(24px,4vh,40px)]">{children}</div>
      </div>
    </section>
  )
}

export const CheckIcon = ({ size = 14 }: { size?: number }) => (
  <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)
