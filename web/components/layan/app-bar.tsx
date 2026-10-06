"use client"

import { useTheme } from "next-themes"
import { ChevronDown, LogOut, Moon, Sun } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TECHS, type Me, type Tech } from "@/lib/data"
import { Wordmark } from "./primitives"
import { useStore } from "./store"

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
  // reload penuh, bukan router.push: state chat & user lama di StoreProvider harus ikut hilang
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/login")
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

function avatarColors(me: Me) {
  if (me.role === "teknisi" && me.id in TECHS) {
    const t = TECHS[me.id as Tech]
    return { background: t.bg, color: t.fg }
  }
  return { background: "var(--accent)", color: "var(--accent-foreground)" }
}

function MenuContent({ me }: { me: Me }) {
  return (
    <DropdownMenuContent align="end" className="min-w-52">
      <DropdownMenuLabel className="flex flex-col gap-0.5">
        <span className="text-[13px] font-semibold">{me.name}</span>
        <span className="text-xs font-normal text-muted-foreground">{me.nim ?? me.email}</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={logout} className="cursor-pointer">
        <LogOut />
        Keluar
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}

/** Pill akun untuk header mobile: nama depan + menu Keluar. */
export function AccountPill() {
  const { me } = useStore()
  if (!me) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-input bg-card pl-3 pr-2.5 text-[13px] font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-accent">
        {me.role === "mahasiswa" ? me.name.split(" ")[0] : me.name}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <MenuContent me={me} />
    </DropdownMenu>
  )
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <button
      type="button"
      aria-label="Ganti mode terang dan gelap"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      suppressHydrationWarning
      className="grid size-11 cursor-pointer place-items-center rounded-md hover:bg-muted lg:size-9"
    >
      {/* ikon ditukar lewat CSS agar tidak mismatch saat hydrate */}
      <Moon className="size-[18px] dark:hidden" />
      <Sun className="hidden size-[18px] dark:block" />
    </button>
  )
}

/** Top bar desktop 56px untuk Staff Console dan Board Teknisi. */
export function TopBar({ section, themeToggle }: { section: string; themeToggle?: boolean }) {
  const { me } = useStore()
  return (
    <header className="flex h-14 flex-none items-center gap-4 border-b bg-card px-6">
      <div className="flex items-center gap-2.5">
        <Wordmark />
        <span className="mx-1 h-5 w-px bg-border" />
        <span className="text-sm font-semibold text-muted-foreground">{section}</span>
      </div>
      <span className="flex-1" />
      {themeToggle && <ThemeToggle />}
      {me && (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex cursor-pointer items-center gap-2.5 rounded-md border-l py-1 pl-3 pr-2 text-left outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-accent">
            <span className="grid size-8 place-items-center rounded-full text-xs font-bold" style={avatarColors(me)}>
              {initials(me.name)}
            </span>
            <span className="flex flex-col">
              <span className="text-[13px] font-semibold leading-[17px]">{me.name}</span>
              <span className="text-xs leading-4 text-muted-foreground">{me.unit}</span>
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <MenuContent me={me} />
        </DropdownMenu>
      )}
    </header>
  )
}
