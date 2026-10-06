import type { Metadata, Viewport } from "next"
import { Azeret_Mono, Plus_Jakarta_Sans } from "next/font/google"
import { cookies } from "next/headers"
import { ThemeProvider } from "next-themes"
import { fetchMe } from "@/lib/session"
import { StoreProvider } from "@/components/layan/store"
import { SwRegister } from "@/components/layan/sw-register"
import { UpdateNotifier } from "@/components/layan/update-notifier"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] })
const azeret = Azeret_Mono({ variable: "--font-azeret", subsets: ["latin"], weight: ["400", "500", "600", "700"] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "https://layan.codewithus.me"),
  title: "LAYAN",
  description: "Satu loket chat untuk mengurus layanan kampus sampai selesai.",
  openGraph: { siteName: "LAYAN", type: "website", locale: "id_ID" },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "LAYAN", statusBarStyle: "default" },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F7F5" },
    { media: "(prefers-color-scheme: dark)", color: "#0D0F10" },
  ],
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const jar = await cookies()
  const me = jar.has("layan_session") ? await fetchMe(jar.toString()).catch(() => null) : null
  return (
    <html lang="id" suppressHydrationWarning className={`${jakarta.variable} ${azeret.variable} h-full`}>
      <body className="min-h-full" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          <StoreProvider me={me}>{children}</StoreProvider>
          <Toaster position="bottom-right" offset={24} />
          <SwRegister />
          <UpdateNotifier />
        </ThemeProvider>
      </body>
    </html>
  )
}
