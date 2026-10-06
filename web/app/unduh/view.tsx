"use client"

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react"
import { Bell, ChevronLeft, ChevronRight, Download, EllipsisVertical, Monitor, MonitorDown, Share, ShieldCheck, Smartphone, SquarePlus } from "lucide-react"
import { Block, CheckIcon, Logo, SitePage, BTN_DARK, BTN_LINE, useLang } from "@/components/layan/site"

// Tutorial pasang per perangkat: Windows, iPhone, Android. Platform hanya berganti lewat pemilih di halaman ini
// (tanpa tebak otomatis dari perangkat). Anchor #windows #iphone #android hanya memilih awal dari panel Unduh di landing.
// Hanya fakta: tanpa App Store, Play Store, atau installer .exe. iPhone dan Windows = PWA, Android = APK mahasiswa atau PWA.

type Plat = "windows" | "iphone" | "android"
type Guide = { name: string; hint: string; title: string; note: string; steps: [string, string][] }

const T = {
  id: {
    kicker: "Unduh app",
    title: "Pasang LAYAN di perangkatmu.",
    sub: "Pilih perangkatmu, lalu ikuti tutorialnya langkah demi langkah. Kurang dari satu menit.",
    pick: "Pilih perangkat",
    empty: "Pilih salah satu perangkat di atas untuk melihat tutorialnya.",
    step: "Langkah", of: "dari", prev: "Sebelumnya", next: "Berikutnya", again: "Ulangi",
    install: "Pasang sekarang", installed: "LAYAN sudah terpasang di perangkat ini.",
    guides: {
      windows: {
        name: "Windows", hint: "Laptop / PC",
        title: "Windows lewat Chrome atau Edge",
        note: "Tidak ada installer .exe. LAYAN dipasang sebagai PWA dan terbuka di jendela sendiri, selalu versi terbaru.",
        steps: [
          ["Buka LAYAN di browser", "Buka LAYAN di Google Chrome atau Microsoft Edge di laptop/PC Windows."],
          ["Klik ikon Instal", "Klik ikon monitor berpanah di ujung kanan kolom alamat. Di Edge bisa juga lewat menu ⋯, Aplikasi, lalu Instal LAYAN."],
          ["Konfirmasi", "Klik Instal pada jendela yang muncul."],
          ["Buka dari Start", "LAYAN terbuka di jendela sendiri dan ada di menu Start. Klik kanan ikonnya di taskbar untuk menyematkan."],
        ],
      },
      iphone: {
        name: "iPhone", hint: "iPhone / iPad",
        title: "iPhone dan iPad lewat Safari",
        note: "Tidak ada app LAYAN di App Store. LAYAN dipasang ke layar utama sebagai PWA dari Safari.",
        steps: [
          ["Buka LAYAN di Safari", "Buka LAYAN memakai Safari di iPhone atau iPad."],
          ["Ketuk Bagikan", "Ketuk tombol Bagikan (kotak dengan panah ke atas) di bilah bawah Safari."],
          ["Tambah ke Layar Utama", "Gulir daftar pilihan, lalu ketuk Tambah ke Layar Utama."],
          ["Ketuk Tambah", "Ketuk Tambah di pojok kanan atas. Ikon LAYAN muncul di layar utama, buka seperti app biasa."],
        ],
      },
      android: {
        name: "Android", hint: "APK mahasiswa",
        title: "Android lewat APK",
        note: "App Android khusus akun mahasiswa. Staf dan teknisi memakai PWA lewat Chrome.",
        steps: [
          ["Unduh APK", "Ketuk Unduh APK di bawah, atau pindai kode QR dengan kamera HP."],
          ["Buka file", "Ketuk notifikasi unduhan layan.apk sampai selesai, atau buka dari folder Download."],
          ["Izinkan sumber ini", "Kalau diminta, izinkan Instal aplikasi tak dikenal untuk browser yang kamu pakai."],
          ["Instal lalu masuk", "Ketuk Instal, buka LAYAN, lalu masuk dengan NIM. App menawarkan pembaruan sendiri saat dibuka."],
        ],
      },
    } as Record<Plat, Guide>,
    apkTitle: "App Android", latest: "Versi terbaru", checking: "Mengecek versi…", none: "Belum ada rilis yang diterbitkan.",
    scan: "Pindai dengan kamera HP untuk mengunduh", download: "Unduh APK",
    altTitle: "Alternatif: PWA lewat Chrome",
    altSub: "Buka LAYAN di Chrome, ketuk menu titik tiga, lalu Instal aplikasi. Cara ini juga untuk staf dan teknisi.",
    others: "Mac atau Linux? Caranya sama dengan Windows: pasang dari Chrome atau Edge lewat ikon instal di kolom alamat.",
    mock: {
      greet: "Mau urus apa hari ini?", q: "Proyektor di F2.3 mati.", a: "Laporanmu sudah diteruskan ke teknisi.",
      installQ: "Instal aplikasi?", installBtn: "Instal", cancel: "Batal",
      copy: "Salin", addHome: "Tambah ke Layar Utama", fav: "Tambah ke Favorit", add: "Tambah",
      done: "Unduhan selesai", unknown: "Izinkan dari sumber ini", installApp: "Ingin menginstal aplikasi ini?",
    },
  },
  en: {
    kicker: "Get the app",
    title: "Install LAYAN on your device.",
    sub: "Pick your device, then follow the step-by-step guide. It takes less than a minute.",
    pick: "Pick a device",
    empty: "Pick one of the devices above to see its guide.",
    step: "Step", of: "of", prev: "Previous", next: "Next", again: "Start over",
    install: "Install now", installed: "LAYAN is already installed on this device.",
    guides: {
      windows: {
        name: "Windows", hint: "Laptop / PC",
        title: "Windows via Chrome or Edge",
        note: "No .exe installer. LAYAN installs as a PWA and opens in its own window, always the latest version.",
        steps: [
          ["Open LAYAN in a browser", "Open LAYAN in Google Chrome or Microsoft Edge on your Windows laptop or PC."],
          ["Click the Install icon", "Click the monitor-with-arrow icon at the right end of the address bar. In Edge you can also use the ⋯ menu, Apps, then Install LAYAN."],
          ["Confirm", "Click Install in the window that appears."],
          ["Open it from Start", "LAYAN opens in its own window and shows up in the Start menu. Right-click its taskbar icon to pin it."],
        ],
      },
      iphone: {
        name: "iPhone", hint: "iPhone / iPad",
        title: "iPhone and iPad via Safari",
        note: "There is no LAYAN app on the App Store. LAYAN is added to the home screen as a PWA from Safari.",
        steps: [
          ["Open LAYAN in Safari", "Open LAYAN with Safari on your iPhone or iPad."],
          ["Tap Share", "Tap the Share button (a square with an up arrow) in Safari's bottom bar."],
          ["Add to Home Screen", "Scroll the list of options, then tap Add to Home Screen."],
          ["Tap Add", "Tap Add in the top right corner. The LAYAN icon appears on your home screen, open it like any app."],
        ],
      },
      android: {
        name: "Android", hint: "Student APK",
        title: "Android via APK",
        note: "The Android app is for student accounts only. Staff and technicians use the PWA via Chrome.",
        steps: [
          ["Download the APK", "Tap Download APK below, or scan the QR code with your phone camera."],
          ["Open the file", "Tap the layan.apk download notification when it finishes, or open it from the Download folder."],
          ["Allow this source", "If asked, allow Install unknown apps for the browser you are using."],
          ["Install and sign in", "Tap Install, open LAYAN, then sign in with your student ID. The app offers updates by itself when it opens."],
        ],
      },
    } as Record<Plat, Guide>,
    apkTitle: "Android app", latest: "Latest version", checking: "Checking version…", none: "No release has been published yet.",
    scan: "Scan with your phone camera to download", download: "Download APK",
    altTitle: "Alternative: PWA via Chrome",
    altSub: "Open LAYAN in Chrome, tap the three-dot menu, then Install app. This also works for staff and technicians.",
    others: "On a Mac or Linux? Same as Windows: install it from Chrome or Edge with the install icon in the address bar.",
    mock: {
      greet: "What do you need today?", q: "The projector in F2.3 is broken.", a: "Your report has been sent to a technician.",
      installQ: "Install app?", installBtn: "Install", cancel: "Cancel",
      copy: "Copy", addHome: "Add to Home Screen", fav: "Add to Favorites", add: "Add",
      done: "Download complete", unknown: "Allow from this source", installApp: "Do you want to install this app?",
    },
  },
}

type Dict = (typeof T)["id"]
type Release = { versionName: string; notes?: string; sha256?: string } | null
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const PLATS: { k: Plat; Icon: typeof Monitor }[] = [
  { k: "windows", Icon: Monitor },
  { k: "iphone", Icon: Smartphone },
  { k: "android", Icon: Download },
]

const noop = () => () => {}
const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb)
  return () => window.removeEventListener("hashchange", cb)
}
const readHash = (): Plat | null => {
  const h = window.location.hash.slice(1)
  return h === "windows" || h === "iphone" || h === "android" ? h : null
}

// sorotan elemen yang sedang dibahas di mockup
const HL = "bg-primary text-primary-foreground ring-4 ring-primary/25"
const IN = "animate-[layanMsgIn_.5s_cubic-bezier(.2,.7,.2,1)_both] motion-reduce:animate-none"

export function UnduhView() {
  const lang = useLang()
  const t = T[lang]
  const hashPlat = useSyncExternalStore(subscribeHash, readHash, () => null)
  const [picked, setPicked] = useState<Plat | null>(null)
  const plat = picked ?? hashPlat
  const [step, setStep] = useState(0)
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const standalone = useSyncExternalStore(noop, () => matchMedia("(display-mode: standalone)").matches, () => false)
  const [justInstalled, setInstalled] = useState(false)
  const installed = standalone || justInstalled
  const [release, setRelease] = useState<Release | undefined>(undefined)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as InstallPrompt)
    }
    const onInstalled = () => (setInstalled(true), setPrompt(null))
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    fetch("/api/app/latest").then((r) => (r.ok ? r.json() : null)).then(setRelease, () => setRelease(null))
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const install = async () => {
    if (!prompt) return
    await prompt.prompt()
    if ((await prompt.userChoice).outcome === "accepted") setInstalled(true)
    setPrompt(null)
  }
  const pick = (p: Plat) => {
    setPicked(p)
    setStep(0)
  }

  const g = plat ? t.guides[plat] : null
  const last = g ? g.steps.length - 1 : 0

  return (
    <SitePage lang={lang} kicker={t.kicker} title={t.title} sub={t.sub}>
      <section className="px-[clamp(20px,4vw,48px)]">
        <div className="mx-auto flex w-full max-w-[1176px] flex-col gap-5">
          {installed && (
            <p className="m-0 flex items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-[15px] font-medium text-accent-foreground">
              <CheckIcon size={16} /> {t.installed}
            </p>
          )}

          {/* pemilih perangkat: satu-satunya cara mengganti tutorial */}
          <div role="group" aria-label={t.pick} className="grid grid-cols-3 gap-2 sm:gap-3">
            {PLATS.map(({ k, Icon }) => {
              const on = plat === k
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pick(k)}
                  className={`group flex min-h-[92px] cursor-pointer flex-col items-start justify-between gap-3 rounded-[20px] border p-3 text-left transition-all duration-300 ease-[cubic-bezier(.2,.7,.2,1)] sm:min-h-[112px] sm:p-5 ${on ? "border-primary bg-card shadow-e2" : "bg-card/60 hover:-translate-y-0.5 hover:border-input hover:bg-card"}`}
                >
                  <span className={`grid size-10 place-items-center rounded-[12px] transition-colors duration-300 sm:size-11 ${on ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    <Icon className="size-5" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[15px] font-semibold sm:text-[17px]">{t.guides[k].name}</span>
                    <span className="text-[12px] text-muted-foreground sm:text-[13.5px]">{t.guides[k].hint}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {!g || !plat ? (
        <section className="px-[clamp(20px,4vw,48px)] pt-6 pb-[clamp(40px,7vh,80px)]">
          <p className="mx-auto m-0 w-full max-w-[1176px] rounded-[20px] border border-dashed p-6 text-center text-[15px] text-muted-foreground">{t.empty}</p>
        </section>
      ) : (
        <Block title={g.title} sub={g.note} id={plat}>
          <div key={plat} className={`grid items-start gap-[clamp(28px,5vw,64px)] lg:grid-cols-[minmax(0,1fr)_auto] ${IN}`}>
            <div className="flex flex-col gap-5">
              {plat === "android" && <ApkCard t={t} release={release} />}

              <ol className="m-0 flex list-none flex-col gap-2 p-0">
                {g.steps.map(([title, desc], i) => {
                  const on = i === step, done = i < step
                  return (
                    <li key={title}>
                      <button
                        type="button"
                        aria-current={on ? "step" : undefined}
                        onClick={() => setStep(i)}
                        className={`flex w-full cursor-pointer items-start gap-4 rounded-[18px] border p-4 text-left transition-all duration-300 ${on ? "border-primary bg-card shadow-e1" : "border-transparent hover:bg-card/70"}`}
                      >
                        <span className={`grid size-8 flex-none place-items-center rounded-full font-mono text-[13px] font-semibold transition-colors duration-300 ${on ? "bg-primary text-primary-foreground" : done ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                          {done ? <CheckIcon size={14} /> : i + 1}
                        </span>
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className={`text-[16px] font-semibold ${on ? "text-foreground" : "text-soft-foreground"}`}>{title}</span>
                          <span className="grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(.2,.7,.2,1)]" style={{ gridTemplateRows: on ? "1fr" : "0fr", opacity: on ? 1 : 0 }}>
                            <span className="overflow-hidden text-[14.5px] leading-relaxed text-muted-foreground">{desc}</span>
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>

              <div className="flex flex-wrap items-center gap-3">
                <span className="w-full font-mono text-xs text-muted-foreground sm:mr-auto sm:w-auto">{t.step} {step + 1} {t.of} {g.steps.length}</span>
                <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className={`${BTN_LINE} h-11 flex-1 justify-center gap-1.5 px-4 text-[14px] disabled:pointer-events-none disabled:opacity-40 sm:flex-none`}>
                  <ChevronLeft className="size-4" />
                  {t.prev}
                </button>
                <button type="button" onClick={() => setStep((s) => (s >= last ? 0 : s + 1))} className={`${BTN_DARK} h-11 flex-1 justify-center gap-1.5 px-5 text-[14px] sm:flex-none`}>
                  {step >= last ? t.again : t.next}
                  {step < last && <ChevronRight className="size-4" />}
                </button>
              </div>

              {plat === "windows" && prompt && !installed && (
                <button type="button" onClick={install} className={`${BTN_DARK} self-start`}>
                  <MonitorDown className="size-4" />
                  {t.install}
                </button>
              )}
              {plat === "android" && (
                <div className="flex flex-col gap-1.5 rounded-[20px] border bg-card p-5">
                  <span className="text-[16px] font-semibold">{t.altTitle}</span>
                  <span className="text-[14.5px] leading-relaxed text-muted-foreground">{t.altSub}</span>
                </div>
              )}
              {plat === "windows" && <p className="m-0 border-l-2 border-input pl-4 text-[13.5px] text-muted-foreground">{t.others}</p>}
            </div>

            <div className="flex justify-center lg:sticky lg:top-24">
              {plat === "windows" ? <WindowsMock t={t} step={step} /> : <PhoneMock t={t} plat={plat} step={step} />}
            </div>
          </div>
        </Block>
      )}
    </SitePage>
  )
}

function ApkCard({ t, release }: { t: Dict; release: Release | undefined }) {
  return (
    <div className="grid items-center gap-6 rounded-[24px] border bg-card p-[clamp(18px,2.4vw,28px)] sm:grid-cols-[auto_1fr]">
      <figure className="m-0 hidden flex-col items-center gap-2 sm:flex">
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG statis kecil, tidak perlu optimasi gambar */}
        <img src="/qr-apk.svg" alt={t.scan} width={132} height={132} className="rounded-2xl border p-2" />
        <figcaption className="max-w-[132px] text-center text-[11.5px] text-muted-foreground">{t.scan}</figcaption>
      </figure>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] uppercase tracking-[.08em] text-subtle-foreground">{t.apkTitle} · {t.latest}</span>
          {release === undefined ? (
            <span className="text-[15px] text-muted-foreground">{t.checking}</span>
          ) : release ? (
            <>
              <span className="text-[22px] font-semibold tracking-[-.02em]">v{release.versionName}</span>
              {release.notes && <span className="text-[14px] text-soft-foreground">{release.notes}</span>}
              {release.sha256 && <span className="font-mono text-[11.5px] text-subtle-foreground">SHA-256 {release.sha256.slice(0, 16)}…</span>}
            </>
          ) : (
            <span className="text-[15px] text-muted-foreground">{t.none}</span>
          )}
        </div>
        <a href="/api/app/layan.apk" download className={`${release === null ? `${BTN_LINE} pointer-events-none opacity-50` : BTN_DARK} self-start`} aria-disabled={release === null}>
          <Download className="size-4" />
          {t.download}
        </a>
      </div>
    </div>
  )
}

/* ---------- mockup: menyorot bagian layar yang dibahas di tiap langkah ---------- */

function ChatSnippet({ t, small }: { t: Dict; small?: boolean }) {
  const txt = small ? "text-[12px]" : "text-[12.5px]"
  return (
    <div className="flex flex-1 flex-col justify-end gap-2.5 p-3.5">
      <span className={`${small ? "text-[15px]" : "text-[17px]"} font-semibold leading-tight tracking-[-.02em]`}>{t.mock.greet}</span>
      <span className={`self-end max-w-[85%] rounded-[16px_16px_5px_16px] bg-ink px-3 py-2 ${txt} text-ink-foreground`}>{t.mock.q}</span>
      <span className={`self-start max-w-[90%] rounded-[16px_16px_16px_5px] bg-muted px-3 py-2 ${txt}`}>{t.mock.a}</span>
    </div>
  )
}

function WindowsMock({ t, step }: { t: Dict; step: number }) {
  const app = step >= 3
  return (
    <div aria-hidden className="w-[min(100%,440px)] overflow-hidden rounded-[14px] border bg-background shadow-e2">
      <div className="flex h-11 items-center gap-2.5 border-b bg-muted px-3">
        <span className="flex gap-1.5">
          {[0, 1, 2].map((i) => <span key={i} className="size-2.5 rounded-full bg-input" />)}
        </span>
        {app ? (
          <span key="app" className={`flex items-center gap-2 text-[12.5px] font-semibold ${IN}`}><Logo size={16} />LAYAN</span>
        ) : (
          <span className="flex h-7 min-w-0 flex-1 items-center justify-between gap-2 rounded-full border bg-card pl-3 pr-0.5">
            <span className="truncate font-mono text-[11.5px] text-muted-foreground">layan.codewithus.me</span>
            <span className={`grid size-6 flex-none place-items-center rounded-full transition-all duration-500 ${step === 1 ? HL : "text-muted-foreground"}`}>
              <MonitorDown className="size-3.5" />
            </span>
          </span>
        )}
      </div>
      <div className="relative flex h-[250px] flex-col">
        <div className="flex items-center gap-2 border-b px-3.5 py-2.5">
          <Logo size={20} />
          <span className="text-[12.5px] font-semibold">LAYAN</span>
        </div>
        <ChatSnippet t={t} />
        {step === 2 && (
          <div className={`absolute right-3 top-2 flex w-[220px] flex-col gap-3 rounded-[12px] border bg-card p-3.5 shadow-e2 ${IN}`}>
            <span className="text-[13px] font-semibold">{t.mock.installQ}</span>
            <span className="flex items-center gap-2 text-[12px]"><Logo size={18} />LAYAN</span>
            <span className="flex justify-end gap-2">
              <span className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold ${HL}`}>{t.mock.installBtn}</span>
              <span className="rounded-full border px-3 py-1.5 text-[11.5px]">{t.mock.cancel}</span>
            </span>
          </div>
        )}
      </div>
      <div className="flex h-10 items-center justify-center gap-2 border-t bg-muted">
        {[0, 1, 2].map((i) => <span key={i} className="size-5 rounded-[5px] bg-input" />)}
        {app && (
          <span className={`grid size-7 place-items-center rounded-[7px] ring-4 ring-primary/25 ${IN}`}>
            <Logo size={20} />
          </span>
        )}
      </div>
    </div>
  )
}

function PhoneMock({ t, plat, step }: { t: Dict; plat: Plat; step: number }) {
  return (
    <div aria-hidden className="w-[250px] rounded-[44px] border-[10px] border-ink bg-ink shadow-e2">
      <div className="relative flex h-[480px] flex-col overflow-hidden rounded-[34px] bg-background">
        <span className="absolute left-1/2 top-2 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-ink" />
        {plat === "iphone" ? <IphoneScreen t={t} step={step} /> : <AndroidScreen t={t} step={step} />}
      </div>
    </div>
  )
}

function Page({ children }: { children?: ReactNode }) {
  return (
    <>
      <div className="mt-9 flex items-center gap-2 border-b px-4 pb-3">
        <Logo size={22} />
        <span className="text-[13px] font-semibold">LAYAN</span>
      </div>
      {children}
    </>
  )
}

function IphoneScreen({ t, step }: { t: Dict; step: number }) {
  if (step === 3) {
    // layar utama: ikon LAYAN baru di antara app lain
    return (
      <div key="home" className={`grid flex-1 grid-cols-4 content-start gap-x-3 gap-y-4 px-4 pt-14 ${IN}`}>
        {Array.from({ length: 11 }, (_, i) => <span key={i} className="aspect-square rounded-[12px] bg-muted" />)}
        <span className="flex flex-col items-center gap-1">
          <span className="grid aspect-square w-full place-items-center rounded-[12px] ring-4 ring-primary/25"><Logo size={40} /></span>
          <span className="text-[9.5px] font-medium">LAYAN</span>
        </span>
      </div>
    )
  }
  return (
    <>
      <Page />
      <ChatSnippet t={t} small />
      <div className="flex h-12 items-center justify-around border-t bg-muted px-2 text-muted-foreground">
        <ChevronLeft className="size-4" />
        <ChevronRight className="size-4" />
        <span className={`grid size-8 place-items-center rounded-full transition-all duration-500 ${step === 1 ? HL : ""}`}><Share className="size-4" /></span>
        <span className="size-4 rounded-[3px] border-2 border-current" />
        <span className="size-4 rounded-[3px] border-2 border-current" />
      </div>
      {step === 2 && (
        <div className={`absolute inset-x-0 bottom-0 flex flex-col gap-1.5 rounded-t-[20px] border-t bg-card p-3 pb-5 shadow-e2 ${IN}`}>
          <span className="mx-auto mb-1 h-1 w-9 rounded-full bg-input" />
          {[t.mock.copy, t.mock.fav, t.mock.addHome].map((x) => {
            const on = x === t.mock.addHome
            return (
              <span key={x} className={`flex items-center justify-between rounded-[10px] px-3 py-2.5 text-[12.5px] ${on ? HL : "bg-muted"}`}>
                {x}
                {on && <SquarePlus className="size-4" />}
              </span>
            )
          })}
        </div>
      )}
    </>
  )
}

function AndroidScreen({ t, step }: { t: Dict; step: number }) {
  return (
    <>
      <Page />
      <div className="flex flex-1 flex-col justify-center gap-3 p-4">
        <span className="text-[15px] font-semibold tracking-[-.02em]">{t.apkTitle}</span>
        <span className={`flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[12.5px] font-semibold transition-all duration-500 ${step === 0 ? HL : "bg-ink text-ink-foreground"}`}>
          <Download className="size-3.5" />
          {t.download}
        </span>
      </div>
      {step === 1 && (
        <div className={`absolute inset-x-2 top-9 flex items-center gap-2.5 rounded-[14px] border bg-card p-3 shadow-e2 ring-4 ring-primary/25 ${IN}`}>
          <span className="grid size-8 place-items-center rounded-full bg-accent text-accent-foreground"><Bell className="size-4" /></span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-mono text-[11.5px] font-semibold">layan.apk</span>
            <span className="text-[11px] text-muted-foreground">{t.mock.done}</span>
          </span>
        </div>
      )}
      {step === 2 && (
        <div className={`absolute inset-x-0 bottom-0 flex flex-col gap-3 rounded-t-[20px] border-t bg-card p-4 pb-6 shadow-e2 ${IN}`}>
          <span className="flex items-center gap-2 text-[12.5px] font-semibold"><ShieldCheck className="size-4 text-primary" />Chrome</span>
          <span className={`flex items-center justify-between rounded-[10px] px-3 py-2.5 text-[12px] ${HL}`}>
            {t.mock.unknown}
            <span className="relative h-4 w-7 rounded-full bg-primary-foreground/40"><span className="absolute right-0.5 top-0.5 size-3 rounded-full bg-primary-foreground" /></span>
          </span>
        </div>
      )}
      {step === 3 && (
        <div className={`absolute inset-x-3 top-[30%] flex flex-col items-center gap-3 rounded-[18px] border bg-card p-4 text-center shadow-e2 ${IN}`}>
          <Logo size={36} />
          <span className="text-[12.5px] font-semibold">{t.mock.installApp}</span>
          <span className="flex gap-2">
            <span className="rounded-full border px-3 py-1.5 text-[11.5px]">{t.mock.cancel}</span>
            <span className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold ${HL}`}>{t.mock.installBtn}</span>
          </span>
        </div>
      )}
      <div className="flex h-9 items-center justify-center gap-10 text-muted-foreground">
        <EllipsisVertical className="size-3.5 rotate-90" />
        <span className="size-3 rounded-full border-2 border-current" />
        <ChevronLeft className="size-3.5" />
      </div>
    </>
  )
}
