import { NextResponse, type NextRequest } from "next/server"
import { HOME, type Me, type Role } from "@/lib/data"
import { fetchMe } from "@/lib/session"

// Halaman mana untuk peran apa. Keamanan sebenarnya tetap di API Rust; ini hanya mengarahkan UI.
const AREA: [string, Role][] = [
  ["/staf", "staf"],
  ["/teknisi", "teknisi"],
  ["/app", "mahasiswa"],
  ["/admin", "admin"],
  // status sistem: hanya admin, sengaja tidak ditautkan dari halaman mana pun
  ["/uptime", "admin"],
]

const PUBLIC = new Set(["/", "/faq", "/unduh", "/keamanan", "/untuk-staf", "/untuk-teknisi"])

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  // landing page dan halaman informasi publik
  if (PUBLIC.has(pathname)) return NextResponse.next()
  const toLogin = () => {
    const url = new URL("/login", req.url)
    url.searchParams.set("next", pathname + search)
    return NextResponse.redirect(url)
  }

  let me: Me | null = null
  if (req.cookies.has("layan_session")) {
    try {
      me = await fetchMe(req.headers.get("cookie") ?? "")
    } catch {
      // API mati: jangan hapus cookie, cukup arahkan ke login (yang akan menampilkan errornya)
      return pathname === "/login" ? NextResponse.next() : toLogin()
    }
  }

  if (pathname === "/login") return me ? NextResponse.redirect(new URL(HOME[me.role], req.url)) : NextResponse.next()
  if (!me) {
    const res = toLogin()
    res.cookies.delete("layan_session")
    return res
  }

  const need = AREA.find(([p]) => pathname.startsWith(p))?.[1]
  if (need && need !== me.role) return NextResponse.redirect(new URL(HOME[me.role], req.url))
  return NextResponse.next()
}

export const config = {
  // aset publik & PWA tidak perlu login
  matcher: ["/((?!api|_next/static|_next/image|design-system|manifest.webmanifest|version|sw.js|pwa-icon|icon|apple-icon|offline|opengraph-image|qr-apk.svg|logo.svg).*)"],
}
