"use client"

import { memo, useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { CheckIcon, Logo, type Lang } from "@/components/layan/site"

// Section setelah hero: dua hal yang bisa dilakukan mahasiswa, masing-masing ke orang yang berbeda.
//  - Minta layanan  -> Staf    (surat akademik, booking ruang, tiket akademik), contohnya berganti tiap putaran
//  - Lapor fasilitas -> Teknisi (laporan kerusakan, dari chat langsung ke board)
// Kedua kartu bergantian otomatis sampai pengguna memilih: hover/klik chip atau kartu
// mengunci pilihan itu dan memainkan animasinya (tidak bergantian lagi).
// Contoh mengikuti layanan yang benar-benar ada di API (LETTERS di api/src/tools.rs, fasilitas.rs).

type MintaEx = { chip: number; q: string; checks: string[]; ticket: string; title: string; meta: string; action: string; decided: string; done: string }
type LaporEx = { chip: number; q: string; meta: string; card: string; room: string; done: string }

const T = {
  id: {
    kicker: "Yang bisa kamu urus",
    title: "Minta layanan atau lapor kerusakan.",
    sub: "Tulis kebutuhanmu di chat. Minta layanan: agent mengecek syarat dan menyiapkan draf, lalu staf memutuskan. Lapor kerusakan: laporan langsung masuk Board teknisi dan dikerjakan sampai selesai.",
    sr: "Animasi dua alur. Minta layanan: permintaan mahasiswa dicek LAYAN lalu disetujui staf. Lapor fasilitas: laporan kerusakan diteruskan ke board teknisi sampai selesai.",
    student: "Mahasiswa", staff: "Staf", tech: "Teknisi",
    minta: "Minta layanan", lapor: "Lapor fasilitas",
    mintaChips: ["Surat akademik", "Booking ruang", "Tiket akademik"],
    laporChips: ["Proyektor", "AC", "Jaringan"],
    chat: "Chat LAYAN", placeholder: "Tulis kebutuhanmu…", openChat: "Buka chat LAYAN — masuk untuk mulai",
    console: "Staff Console", queue: "Antrean", others: [["Booking ruang F3.1", "menunggu"], ["Tiket akademik", "menunggu"]], reject: "Tolak",
    board: "Board Teknisi", cols: ["Baru", "Dikerjakan", "Selesai"], oldCard: ["Wastafel mampet", "G2-WC"],
    logged: "Laporan dicatat", fixedLabel: "Selesai",
    minta_ex: [
      { chip: 0, q: "Butuh surat keterangan aktif kuliah untuk daftar beasiswa.", checks: ["Status aktif", "UKT lunas"], ticket: "Surat aktif kuliah", title: "Surat Keterangan Aktif Kuliah", meta: "Keperluan: beasiswa KIP Kuliah", action: "Setujui", decided: "Disetujui", done: "Surat siap diunduh · SKA/2026/10/0143" },
      { chip: 1, q: "Pinjam ruang rapat Jumat jam 13.00 untuk 12 orang.", checks: ["G2.4 kosong", "Kapasitas 25", "Ditahan 24 jam"], ticket: "Booking G2.4", title: "Booking G2.4", meta: "Jumat, 13.00–15.00 · 12 orang", action: "Konfirmasi", decided: "Dikonfirmasi", done: "Ruang G2.4 dikonfirmasi staf" },
      { chip: 0, q: "Mau minta surat pengantar magang ke PT Telkom.", checks: ["Status aktif", "UKT lunas", "Semester 5"], ticket: "Surat pengantar magang", title: "Surat Pengantar Magang/KP", meta: "PT Telkom Indonesia · Feb–Apr 2027", action: "Setujui", decided: "Disetujui", done: "Surat siap diunduh · SPM/2026/10/0144" },
      { chip: 2, q: "Boleh ambil mata kuliah semester atas kalau IPK 3,8?", checks: ["Belum ada di pedoman", "Jadi tiket ke akademik"], ticket: "Tiket akademik", title: "Tiket · Bagian Akademik", meta: "Pengambilan mata kuliah semester atas", action: "Jawab", decided: "Dijawab", done: "Dijawab Bagian Akademik" },
      { chip: 0, q: "Ikut lomba tanggal 14, butuh surat dispensasi.", checks: ["Status aktif", "UKT lunas", "Bukti kegiatan"], ticket: "Surat dispensasi", title: "Surat Dispensasi", meta: "Gemastik 2026 · 2 mata kuliah", action: "Setujui", decided: "Disetujui", done: "Surat siap diunduh · SD/2026/10/0145" },
    ] as MintaEx[],
    lapor_ex: [
      { chip: 0, q: "Proyektor di ruang F2.3 mati.", meta: "Urgensi sedang · digabung, 3 pelapor", card: "Proyektor mati", room: "F2.3", done: "Proyektor F2.3 sudah diperbaiki" },
      { chip: 1, q: "AC di G1.2 bocor, airnya netes ke meja.", meta: "Urgensi tinggi · laporan baru", card: "AC bocor", room: "G1.2", done: "AC G1.2 sudah diperbaiki" },
      { chip: 2, q: "Wi-Fi di F3.1 putus terus.", meta: "Urgensi sedang · digabung, 2 pelapor", card: "Wi-Fi putus", room: "F3.1", done: "Wi-Fi F3.1 sudah normal lagi" },
    ] as LaporEx[],
  },
  en: {
    kicker: "What you can handle",
    title: "Request a service or report damage.",
    sub: "Describe what you need in the chat. Requesting a service: the agent checks the requirements and prepares a draft, then staff decide. Reporting damage: the report goes straight to the technician Board and gets fixed.",
    sr: "Animation of two flows. Service request: a student request is checked by LAYAN and approved by staff. Facility report: a damage report goes to the technician board until it is fixed.",
    student: "Student", staff: "Staff", tech: "Technician",
    minta: "Request a service", lapor: "Report a facility",
    mintaChips: ["Academic letters", "Room booking", "Academic ticket"],
    laporChips: ["Projector", "AC", "Network"],
    chat: "LAYAN chat", placeholder: "Describe what you need…", openChat: "Open LAYAN chat — sign in to start",
    console: "Staff Console", queue: "Queue", others: [["Room booking F3.1", "waiting"], ["Academic ticket", "waiting"]], reject: "Reject",
    board: "Technician Board", cols: ["New", "In progress", "Done"], oldCard: ["Clogged sink", "G2-WC"],
    logged: "Report logged", fixedLabel: "Done",
    minta_ex: [
      { chip: 0, q: "I need a proof of enrollment letter for a scholarship.", checks: ["Active status", "Tuition paid"], ticket: "Enrollment letter", title: "Proof of Enrollment Letter", meta: "Purpose: KIP scholarship", action: "Approve", decided: "Approved", done: "Letter ready · SKA/2026/10/0143" },
      { chip: 1, q: "Book the meeting room Friday at 1 PM for 12 people.", checks: ["G2.4 is free", "Fits 25", "Held for 24h"], ticket: "Booking G2.4", title: "Booking G2.4", meta: "Friday, 1–3 PM · 12 people", action: "Confirm", decided: "Confirmed", done: "Room G2.4 confirmed by staff" },
      { chip: 0, q: "I need an internship cover letter for PT Telkom.", checks: ["Active status", "Tuition paid", "Semester 5"], ticket: "Internship letter", title: "Internship Cover Letter", meta: "PT Telkom Indonesia · Feb–Apr 2027", action: "Approve", decided: "Approved", done: "Letter ready · SPM/2026/10/0144" },
      { chip: 2, q: "Can I take upper-semester courses with a 3.8 GPA?", checks: ["Not in the handbook", "Sent as a ticket"], ticket: "Academic ticket", title: "Ticket · Academic Office", meta: "Taking upper-semester courses", action: "Answer", decided: "Answered", done: "Answered by the Academic Office" },
      { chip: 0, q: "I have a competition on the 14th, need a dispensation letter.", checks: ["Active status", "Tuition paid", "Event proof"], ticket: "Dispensation letter", title: "Dispensation Letter", meta: "Gemastik 2026 · 2 courses", action: "Approve", decided: "Approved", done: "Letter ready · SD/2026/10/0145" },
    ] as MintaEx[],
    lapor_ex: [
      { chip: 0, q: "The projector in room F2.3 is broken.", meta: "Medium urgency · merged, 3 reporters", card: "Projector broken", room: "F2.3", done: "Projector F2.3 is fixed" },
      { chip: 1, q: "The AC in G1.2 is leaking onto the desks.", meta: "High urgency · new report", card: "AC leaking", room: "G1.2", done: "AC G1.2 is fixed" },
      { chip: 2, q: "Wi-Fi in F3.1 keeps dropping.", meta: "Medium urgency · merged, 2 reporters", card: "Wi-Fi down", room: "F3.1", done: "Wi-Fi F3.1 is back" },
    ] as LaporEx[],
  },
}
type Dict = (typeof T)["id"]

// langkah tiap kartu (nama, lama ms). Tiket berangkat di "go", kembali di "back".
const MINTA_STEPS = [["type", 1700], ["check", 2000], ["go", 1100], ["review", 1300], ["decided", 1400], ["back", 1000], ["done", 2200]] as const
const LAPOR_STEPS = [["type", 1600], ["check", 2000], ["go", 1100], ["new", 1000], ["doing", 1200], ["fixed", 1300], ["back", 1000], ["done", 2200]] as const
type Step = (typeof MINTA_STEPS)[number][0] | (typeof LAPOR_STEPS)[number][0]
const DEST_STEPS: Step[] = ["review", "decided", "new", "doing", "fixed"]

const IN = "animate-[layanMsgIn_.45s_cubic-bezier(.2,.7,.2,1)_both]"
const EASE = "ease-[cubic-bezier(.2,.8,.2,1)]"

export const StudentFlows = memo(function StudentFlows({ lang, motion, children }: { lang: Lang; motion: "on" | "off"; children?: ReactNode }) {
  const t = T[lang]
  const off = motion === "off"
  // turn 0 = kartu Minta jalan, 1 = kartu Lapor jalan; ia/ib = contoh yang sedang dipakai tiap kartu
  // ib mulai dari contoh terakhir: giliran pertama kartu Lapor memajukannya ke contoh 0
  const [s, setS] = useState({ turn: 0, step: 0, ia: 0, ib: T.id.lapor_ex.length - 1 })
  const [manual, setManual] = useState(false)
  const [visible, setVisible] = useState(false)
  const box = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (off || !visible) return
    const steps = s.turn === 0 ? MINTA_STEPS : LAPOR_STEPS
    // pilihan manual: mainkan contohnya sekali, lalu tahan di akhir (tidak bergantian lagi)
    if (manual && s.step + 1 >= steps.length) return
    const id = setTimeout(() => {
      setS((p) => {
        if (p.step + 1 < steps.length) return { ...p, step: p.step + 1 }
        // giliran pindah ke kartu lain, dan kartu itu memakai contoh berikutnya
        return p.turn === 0
          ? { turn: 1, step: 0, ia: p.ia, ib: (p.ib + 1) % T.id.lapor_ex.length }
          : { turn: 0, step: 0, ia: (p.ia + 1) % T.id.minta_ex.length, ib: p.ib }
      })
    }, steps[s.step][1])
    return () => clearTimeout(id)
  }, [s, visible, off, manual])

  // klik/hover chip: kunci ke contoh pertama chip itu dan mainkan dari awal
  const pickMinta = (chip: number) => {
    const idx = t.minta_ex.findIndex((e) => e.chip === chip)
    if (idx < 0) return
    setManual(true)
    setS((p) => ({ turn: 0, step: 0, ia: idx, ib: p.ib }))
  }
  const pickLapor = (chip: number) => {
    const idx = t.lapor_ex.findIndex((e) => e.chip === chip)
    if (idx < 0) return
    setManual(true)
    setS((p) => ({ turn: 1, step: 0, ia: p.ia, ib: idx }))
  }
  // hover kartu: kunci ke kartu itu (lanjut dari posisi jalan kalau sudah gilirannya)
  const focusTurn = (turn: 0 | 1) => {
    setManual(true)
    setS((p) => (p.turn === turn ? p : { ...p, turn, step: 0 }))
  }

  const mintaStep: Step = off || s.turn !== 0 ? "done" : MINTA_STEPS[s.step][0]
  const laporStep: Step = off || s.turn !== 1 ? "done" : LAPOR_STEPS[s.step][0]

  return (
    <section ref={box} aria-labelledby="flows-title" className="relative px-[clamp(20px,4vw,48px)] py-[clamp(40px,7vh,80px)]">
      <div className="mx-auto w-full max-w-[1376px]">
        <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-4">
          <div className="max-w-[640px]">
            <span data-reveal className="font-mono text-xs font-medium uppercase tracking-[.1em] text-primary">{t.kicker}</span>
            <h2 id="flows-title" data-reveal="clip" className="mt-4 text-[length:clamp(30px,3.4vw,52px)] font-semibold leading-[1.05] tracking-[-.04em] text-balance">{t.title}</h2>
          </div>
          <p data-reveal data-delay="100" className="m-0 max-w-[460px] text-[length:clamp(15px,1.15vw,17px)] leading-[1.6] text-soft-foreground text-pretty">{t.sub}</p>
        </div>
        <p className="sr-only">{t.sr}</p>

        <div className="mt-[clamp(20px,4vh,32px)] grid select-none gap-5 lg:grid-cols-2">
          <MintaCard t={t} ex={t.minta_ex[s.ia]} step={mintaStep} idle={!off && s.turn !== 0} onEnter={() => focusTurn(0)} onChip={pickMinta} />
          <LaporCard t={t} ex={t.lapor_ex[s.ib]} step={laporStep} idle={!off && s.turn !== 1} onEnter={() => focusTurn(1)} onChip={pickLapor} />
        </div>
        {children}
      </div>
    </section>
  )
})

/* ---------- kerangka kartu: kepala, chip, rel, layar ---------- */

function Shell({ title, dest, chips, chip, idle, step, ticket, back, student, destScreen, onEnter, onChip, openChat }: {
  title: string; dest: string; chips: string[]; chip: number; idle: boolean; step: Step; ticket: string; back: string
  student: ReactNode; destScreen: ReactNode; onEnter: () => void; onChip: (i: number) => void; openChat: string
}) {
  const out = DEST_STEPS.includes(step) || step === "go" // tiket sudah/sedang di tujuan
  const atDest = DEST_STEPS.includes(step)
  const label = step === "back" || step === "done" ? back : ticket
  return (
    <div onMouseEnter={onEnter} className={`flex flex-col overflow-hidden rounded-[28px] border bg-card shadow-[0_40px_90px_-60px_rgba(22,24,26,.4)] transition-opacity duration-700 ${idle ? "opacity-60" : "opacity-100"}`}>
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <span className="truncate text-[17px] font-semibold tracking-[-.01em]">{title}</span>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-accent px-2.5 py-1 text-[12px] font-medium text-accent-foreground">→ {dest}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 px-5 pt-2.5">
        {chips.map((c, i) => (
          <button
            key={c}
            type="button"
            onClick={() => onChip(i)}
            aria-pressed={i === chip}
            className={`min-w-0 cursor-pointer truncate rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors duration-500 ${i === chip ? "border-primary bg-accent text-accent-foreground" : "text-muted-foreground hover:border-primary hover:text-foreground"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* rel 2 stasiun; tiket bergeser dengan transform saja */}
      <Rail out={out} label={label} active={!idle && step !== "done"} />

      {/* satu layar: chat mahasiswa (bisa ditekan -> login) <-> layar tujuan, berganti dengan crossfade */}
      <div className="relative mx-4 mb-4 h-[264px] overflow-hidden rounded-[20px] border bg-background">
        <div className={`absolute inset-0 transition-[opacity,transform] duration-500 ${EASE} ${atDest ? "pointer-events-none -translate-x-3 opacity-0" : "opacity-100"}`}>
          {student}
          {!atDest && (
            <Link href="/login" aria-label={openChat} className="absolute inset-0 z-10 cursor-pointer rounded-[20px] transition-colors duration-300 hover:bg-primary/[.05] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary" />
          )}
        </div>
        <div aria-hidden className={`absolute inset-0 transition-[opacity,transform] duration-500 ${EASE} ${atDest ? "opacity-100" : "translate-x-3 opacity-0"}`}>{destScreen}</div>
      </div>
    </div>
  )
}

function Rail({ out, label, active }: { out: boolean; label: string; active: boolean }) {
  return (
    <div aria-hidden className="relative mx-5 mb-3 mt-4 h-[56px]">
      {/* pil mengikuti lebar teksnya; spacer flex-grow menggesernya ke kanan */}
      <div className="absolute inset-x-0 top-0 flex h-6">
        <span className={`transition-[flex-grow] duration-1000 ${EASE}`} style={{ flexGrow: out ? 1 : 0, flexBasis: 0, minWidth: 0 }} />
        <span className={`flex h-6 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-[12px] font-semibold transition-colors duration-300 ${active ? "bg-ink text-ink-foreground" : "bg-muted text-muted-foreground"}`}>{label}</span>
      </div>
      <div className="absolute inset-x-[7px] top-[34px] h-0.5 rounded-full bg-border" />
      <div className={`absolute inset-x-[7px] top-[34px] h-0.5 origin-left rounded-full bg-primary transition-transform duration-1000 ${EASE}`} style={{ transform: `scaleX(${out ? 1 : 0})` }} />
      <span className={`absolute left-0 top-[28px] size-3.5 rounded-full border-2 border-primary bg-primary`} />
      <span className={`absolute right-0 top-[28px] size-3.5 rounded-full border-2 transition-colors duration-500 ${out ? "border-primary bg-primary" : "border-border bg-card"}`} />
    </div>
  )
}

/* ---------- layar chat mahasiswa (dipakai kedua kartu) ---------- */

function Chat({ t, step, q, typedRef, children, done }: { t: Dict; step: Step; q: string; typedRef: React.RefObject<HTMLSpanElement | null>; children?: ReactNode; done?: string }) {
  const sent = step !== "type"
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-3.5 py-2.5 text-[12.5px] font-semibold"><Logo size={16} />{t.chat}</div>
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 overflow-hidden px-3.5 pb-2 pt-3 [mask-image:linear-gradient(to_bottom,transparent,#000_20px)]">
        {sent && <span className={`self-end max-w-[85%] rounded-[14px_14px_4px_14px] bg-ink px-3 py-2 text-[13px] leading-snug text-ink-foreground ${IN}`}>{q}</span>}
        {sent && children}
        {done && step === "done" && (
          <span className={`flex items-center gap-1.5 self-start rounded-full bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-accent-foreground ${IN}`}>
            <CheckIcon size={12} />{done}
          </span>
        )}
      </div>
      <div className="mx-3.5 mb-3 flex h-9 shrink-0 items-center rounded-[10px] border bg-panel px-3 text-[12.5px]">
        <span className="truncate">
          <span ref={typedRef} />
          {step === "type" ? <span className="ml-px inline-block h-3.5 w-px bg-primary align-[-2px] animate-[layanBlink_1s_steps(1)_infinite]" /> : <span className="text-muted-foreground">{t.placeholder}</span>}
        </span>
      </div>
    </div>
  )
}

function Bubble({ children }: { children: ReactNode }) {
  return <div className={`self-start max-w-[92%] rounded-[14px_14px_14px_4px] bg-muted px-3 py-2.5 text-[13px] leading-snug ${IN}`} style={{ animationDelay: "250ms" }}>{children}</div>
}

/** Ketikan langsung ke DOM selama langkah "type" (tanpa render ulang per huruf). */
function useTyping(step: Step, text: string, ms: number) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.textContent = ""
    if (step !== "type") return
    let i = 0
    const id = setInterval(() => {
      el.textContent = text.slice(0, ++i)
      if (i >= text.length) clearInterval(id)
    }, (ms * 0.7) / text.length)
    return () => clearInterval(id)
  }, [step, text, ms])
  return ref
}

/* ---------- kartu 1: minta layanan -> staf ---------- */

function MintaCard({ t, ex, step, idle, onEnter, onChip }: { t: Dict; ex: MintaEx; step: Step; idle: boolean; onEnter: () => void; onChip: (i: number) => void }) {
  const typed = useTyping(step, ex.q, MINTA_STEPS[0][1])
  const decided = step === "decided" || step === "back" || step === "done"
  return (
    <Shell
      title={t.minta} dest={t.staff} chips={t.mintaChips} chip={ex.chip} idle={idle} step={step} ticket={ex.ticket} back={ex.decided} onEnter={onEnter} onChip={onChip} openChat={t.openChat}
      student={
        <Chat t={t} step={step} q={ex.q} typedRef={typed} done={ex.done}>
          <Bubble>
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><Logo size={13} />LAYAN</span>
            <span className="flex flex-wrap gap-x-3 gap-y-1">
              {ex.checks.map((c, i) => (
                <span key={c} className={`flex items-center gap-1 text-[12px] font-medium ${IN}`} style={{ animationDelay: `${450 + i * 200}ms` }}>
                  <span className="flex size-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground"><CheckIcon size={8} /></span>{c}
                </span>
              ))}
            </span>
          </Bubble>
        </Chat>
      }
      destScreen={
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-3.5 py-2.5">
            <span className="text-[12.5px] font-semibold">{t.console}</span>
            <span className="text-[11.5px] text-muted-foreground">{t.queue}</span>
          </div>
          <div className="flex flex-col gap-2 p-3">
            <div className="flex items-center justify-between gap-3 rounded-[14px] border border-primary bg-accent/40 px-3.5 py-3">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[13.5px] font-semibold">{ex.title}</span>
                <span className="truncate text-[12px] text-muted-foreground">{ex.meta}</span>
              </span>
              {decided ? (
                <span key="ok" className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[12px] font-semibold text-primary-foreground animate-[layanMsgIn_.4s_cubic-bezier(.3,1.4,.5,1)_both]"><CheckIcon size={11} />{ex.decided}</span>
              ) : (
                <span className="flex shrink-0 gap-1.5">
                  <span className="inline-flex h-7 items-center rounded-full bg-primary px-3 text-[12px] font-semibold text-primary-foreground">{ex.action}</span>
                  <span className="inline-flex h-7 items-center rounded-full border border-input px-3 text-[12px] font-medium">{t.reject}</span>
                </span>
              )}
            </div>
            {t.others.map(([what, st]) => (
              <div key={what} className="flex items-center justify-between rounded-[12px] bg-muted/60 px-3.5 py-2.5 text-[12.5px]">
                <span className="font-medium">{what}</span>
                <span className="text-[11.5px] text-muted-foreground">{st}</span>
              </div>
            ))}
          </div>
        </div>
      }
    />
  )
}

/* ---------- kartu 2: lapor fasilitas -> teknisi ---------- */

function LaporCard({ t, ex, step, idle, onEnter, onChip }: { t: Dict; ex: LaporEx; step: Step; idle: boolean; onEnter: () => void; onChip: (i: number) => void }) {
  const typed = useTyping(step, ex.q, LAPOR_STEPS[0][1])
  const col = step === "doing" ? 1 : step === "fixed" || step === "back" || step === "done" ? 2 : 0
  return (
    <Shell
      title={t.lapor} dest={t.tech} chips={t.laporChips} chip={ex.chip} idle={idle} step={step} ticket={`${ex.card} · ${ex.room}`} back={t.fixedLabel} onEnter={onEnter} onChip={onChip} openChat={t.openChat}
      student={
        <Chat t={t} step={step} q={ex.q} typedRef={typed} done={ex.done}>
          <Bubble>
            <span className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground"><Logo size={13} />LAYAN</span>
            <span className="block font-medium">{t.logged}</span>
            <span className="mt-0.5 block text-[12px] text-muted-foreground">{ex.meta}</span>
          </Bubble>
        </Chat>
      }
      destScreen={
        <div className="flex h-full flex-col">
          <div className="border-b px-3.5 py-2.5 text-[12.5px] font-semibold">{t.board}</div>
          <div className="relative grid flex-1 grid-cols-3 gap-2 p-3">
            {t.cols.map((c, i) => (
              <div key={c} className={`flex flex-col gap-2 rounded-[12px] p-2 transition-colors duration-500 ${i === col ? "bg-accent" : "bg-muted"}`}>
                <span className="truncate text-[11.5px] font-semibold text-muted-foreground">{c}</span>
                <span className="h-[66px] shrink-0" />
                {i === 0 && (
                  <span className="flex flex-col gap-0.5 rounded-[10px] border bg-card p-2">
                    <span className="truncate text-[12px] font-semibold">{t.oldCard[0]}</span>
                    <span className="font-mono text-[10.5px] text-muted-foreground">{t.oldCard[1]}</span>
                  </span>
                )}
              </div>
            ))}
            {/* kartu laporan: bergeser antar kolom dengan transform; lebarnya = lebar kolom dikurangi padding */}
            <div className="pointer-events-none absolute inset-3 grid grid-cols-3 gap-2">
              <div className={`relative col-start-1 mx-2 mt-8 h-[66px] transition-transform duration-700 ${EASE}`} style={{ transform: `translateX(calc(${col} * (100% + 24px)))` }}>
                <div className="flex h-full flex-col justify-center gap-0.5 rounded-[10px] border border-primary/60 bg-card px-2.5 shadow-[0_12px_26px_-18px_rgba(22,24,26,.45)]">
                  <span className="truncate text-[12px] font-semibold">{ex.card}</span>
                  <span className="font-mono text-[10.5px] text-muted-foreground">{ex.room}</span>
                  {col === 2 && <span className="mt-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground"><CheckIcon size={8} /></span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    />
  )
}
