"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

/** Navigasi teknisi: Board (/teknisi) dan Rekap bulanan (/teknisi/rekap). */
export function TechTabs() {
  const pathname = usePathname()
  const tabs = [
    { label: "Board", href: "/teknisi" },
    { label: "Rekap bulanan", href: "/teknisi/rekap" },
  ] as const
  return (
    <nav aria-label="Navigasi teknisi" className="flex flex-none items-center gap-1 border-b bg-card px-4 sm:px-6 print:hidden">
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
