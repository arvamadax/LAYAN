"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { Block, CheckIcon, Logo, SitePage, BTN_DARK, BTN_LINE, useLang } from "@/components/layan/site"

// Empat bagian platform dengan anchor #apple #android #windows #linux.
// Hanya fakta: tanpa App Store, Play Store, .exe, .dmg, .deb, atau .AppImage.
const T = {
  id: {
    kicker: "Unduh app",
    title: "LAYAN di layar utama HP-mu.",
    sub: "Pilih platformmu: Apple, Android, Windows, atau Linux.",
    install: "Pasang sekarang", installed: "LAYAN sudah terpasang di perangkat ini.",
    appleTitle: "Apple",
    appleSub: "iPhone, iPad, dan Mac — tanpa App Store.",
    appleCards: [["iPhone / iPad (Safari)", "Buka LAYAN di Safari, ketuk Bagikan, lalu Tambah ke Layar Utama."], ["Mac", "Chrome/Edge: klik ikon instal di ujung kolom alamat. Safari: menu File, lalu Add to Dock."]],
    androidTitle: "Android",
    androidSub: "App Android khusus mahasiswa, atau PWA dari Chrome.",
    apkTitle: "App Android",
    apkSub: "Khusus akun mahasiswa. App menawarkan pembaruan sendiri setiap kali dibuka.",
    scan: "Pindai dengan kamera HP untuk mengunduh",
    download: "Unduh APK",
    latest: "Versi terbaru", checking: "Mengecek versi…", none: "Belum ada rilis yang diterbitkan.",
    unknown: "Saat memasang, Android akan meminta izin instal dari sumber ini. Izinkan untuk melanjutkan.",
    altTitle: "Alternatif: PWA",
    altSub: "Chrome: buka menu titik tiga, lalu Instal aplikasi. Selalu versi terbaru.",
    windowsTitle: "Windows",
    windowsSub: "Tanpa installer .exe — pasang sebagai PWA.",
    windowsCards: [["Chrome / Edge", "Klik ikon instal di ujung kolom alamat."]],
    linuxTitle: "Linux",
    linuxSub: "Tanpa .deb/.AppImage — pasang sebagai PWA.",
    linuxCards: [["Chrome / Chromium / Edge", "Klik ikon instal di kolom alamat."]],
    phoneGreet: "Mau urus apa hari ini?", phoneQ: "Proyektor di F2.3 mati.", phoneA: "Laporanmu sudah diteruskan ke teknisi.",
  },
  en: {
    kicker: "Get the app",
    title: "LAYAN on your home screen.",
    sub: "Pick your platform: Apple, Android, Windows, or Linux.",
    install: "Install now", installed: "LAYAN is already installed on this device.",
    appleTitle: "Apple",
    appleSub: "iPhone, iPad, and Mac — no App Store.",
    appleCards: [["iPhone / iPad (Safari)", "Open LAYAN in Safari, tap Share, then Add to Home Screen."], ["Mac", "Chrome/Edge: click the install icon at the end of the address bar. Safari: File menu, then Add to Dock."]],
    androidTitle: "Android",
    androidSub: "Android app for students, or a PWA from Chrome.",
    apkTitle: "Android app",
    apkSub: "Student accounts only. The app offers updates by itself every time it opens.",
    scan: "Scan with your phone camera to download",
    download: "Download APK",
    latest: "Latest version", checking: "Checking version…", none: "No release has been published yet.",
    unknown: "While installing, Android asks permission to install from this source. Allow it to continue.",
    altTitle: "Alternative: PWA",
    altSub: "Chrome: open the three-dot menu, then Install app. Always the latest version.",
    windowsTitle: "Windows",
    windowsSub: "No .exe installer — install it as a PWA.",
    windowsCards: [["Chrome / Edge", "Click the install icon at the end of the address bar."]],
    linuxTitle: "Linux",
    linuxSub: "No .deb/.AppImage — install it as a PWA.",
    linuxCards: [["Chrome / Chromium / Edge", "Click the install icon in the address bar."]],
    phoneGreet: "What do you need today?", phoneQ: "The projector in F2.3 is broken.", phoneA: "Your report has been sent to a technician.",
  },
}

type Release = { versionName: string; notes?: string; sha256?: string } | null
const noop = () => () => {}
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

export function UnduhView() {
  const lang = useLang()
  const t = T[lang]
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

  return (
    <SitePage lang={lang} kicker={t.kicker} title={t.title} sub={t.sub}>
      {(installed || prompt) && (
        <div className="px-[clamp(20px,4vw,48px)]">
          <div className="mx-auto w-full max-w-[1176px]">
            {installed ? (
              <p className="m-0 flex items-center gap-3 rounded-2xl bg-accent px-4 py-3 text-[15px] font-medium text-accent-foreground">
                <CheckIcon size={16} /> {t.installed}
              </p>
            ) : (
              prompt && <button type="button" onClick={install} className={`${BTN_DARK} self-start`}>{t.install}</button>
            )}
          </div>
        </div>
      )}

      <div id="apple" className="scroll-mt-28">
        <Block title={t.appleTitle} sub={t.appleSub}>
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-col gap-3">
              {t.appleCards.map(([device, how], i) => (
                <div key={device} className="flex flex-col gap-2 rounded-[20px] border bg-card p-5">
                  <span className="font-mono text-xs text-primary">0{i + 1}</span>
                  <span className="text-[16px] font-semibold">{device}</span>
                  <span className="text-[14.5px] leading-relaxed text-muted-foreground">{how}</span>
                </div>
              ))}
            </div>
            <Phone t={t} />
          </div>
        </Block>
      </div>

      <div id="android" className="scroll-mt-28">
        <Block title={t.androidTitle} sub={t.androidSub}>
          <div className="flex flex-col gap-6">
            <div className="grid items-center gap-8 rounded-[28px] border bg-card p-[clamp(20px,3vw,36px)] md:grid-cols-[auto_1fr]">
              <figure className="m-0 flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG statis kecil, tidak perlu optimasi gambar */}
                <img src="/qr-apk.svg" alt={t.scan} width={184} height={184} className="rounded-2xl border p-2" />
                <figcaption className="max-w-[184px] text-center text-[12.5px] text-muted-foreground">{t.scan}</figcaption>
              </figure>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[11px] uppercase tracking-[.08em] text-subtle-foreground">{t.apkTitle} · {t.latest}</span>
                  {release === undefined ? (
                    <span className="text-[15px] text-muted-foreground">{t.checking}</span>
                  ) : release ? (
                    <>
                      <span className="text-[22px] font-semibold tracking-[-.02em]">v{release.versionName}</span>
                      {release.notes && <span className="text-[14.5px] text-soft-foreground">{release.notes}</span>}
                      {release.sha256 && <span className="font-mono text-[11.5px] text-subtle-foreground">SHA-256 {release.sha256.slice(0, 16)}…</span>}
                    </>
                  ) : (
                    <span className="text-[15px] text-muted-foreground">{t.none}</span>
                  )}
                  <span className="text-[14.5px] text-muted-foreground">{t.apkSub}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a href="/api/app/layan.apk" download className={release === null ? `${BTN_LINE} pointer-events-none opacity-50` : BTN_DARK} aria-disabled={release === null}>{t.download}</a>
                </div>
                <p className="m-0 max-w-[560px] border-l-2 border-input pl-4 text-[13.5px] text-muted-foreground">{t.unknown}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-[20px] border bg-card p-5">
              <span className="text-[16px] font-semibold">{t.altTitle}</span>
              <span className="text-[14.5px] leading-relaxed text-muted-foreground">{t.altSub}</span>
            </div>
          </div>
        </Block>
      </div>

      <div id="windows" className="scroll-mt-28">
        <Block title={t.windowsTitle} sub={t.windowsSub}>
          <div className="grid gap-3 md:grid-cols-2">
            {t.windowsCards.map(([device, how]) => (
              <div key={device} className="flex flex-col gap-2 rounded-[20px] border bg-card p-5">
                <span className="text-[16px] font-semibold">{device}</span>
                <span className="text-[14.5px] leading-relaxed text-muted-foreground">{how}</span>
              </div>
            ))}
          </div>
        </Block>
      </div>

      <div id="linux" className="scroll-mt-28">
        <Block title={t.linuxTitle} sub={t.linuxSub}>
          <div className="grid gap-3 md:grid-cols-2">
            {t.linuxCards.map(([device, how]) => (
              <div key={device} className="flex flex-col gap-2 rounded-[20px] border bg-card p-5">
                <span className="text-[16px] font-semibold">{device}</span>
                <span className="text-[14.5px] leading-relaxed text-muted-foreground">{how}</span>
              </div>
            ))}
          </div>
        </Block>
      </div>
    </SitePage>
  )
}

/** Bingkai HP berisi potongan chat, supaya terlihat seperti apa LAYAN setelah dipasang. */
function Phone({ t }: { t: (typeof T)["id"] }) {
  return (
    <div aria-hidden className="mx-auto w-[260px] rounded-[44px] border-[10px] border-ink bg-ink shadow-[0_50px_100px_-40px_rgba(22,24,26,.55)]">
      <div className="relative flex h-[500px] flex-col overflow-hidden rounded-[34px] bg-background">
        <span className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-ink" />
        <div className="mt-9 flex items-center gap-2 border-b px-4 pb-3">
          <Logo size={24} />
          <span className="text-[13px] font-semibold">LAYAN</span>
        </div>
        <div className="flex flex-1 flex-col justify-end gap-2.5 p-3.5">
          <span className="text-[17px] font-semibold leading-tight tracking-[-.02em]">{t.phoneGreet}</span>
          <span className="self-end max-w-[85%] rounded-[16px_16px_5px_16px] bg-ink px-3 py-2 text-[12.5px] text-ink-foreground">{t.phoneQ}</span>
          <span className="self-start max-w-[90%] rounded-[16px_16px_16px_5px] bg-muted px-3 py-2 text-[12.5px]">{t.phoneA}</span>
        </div>
        <div className="m-3 mt-0 flex h-10 items-center justify-end rounded-xl border bg-panel px-1.5">
          <span className="size-7 rounded-lg bg-ink" />
        </div>
      </div>
    </div>
  )
}
