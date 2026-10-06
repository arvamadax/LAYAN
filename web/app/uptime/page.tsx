import type { Metadata } from "next"
import { StatusView } from "./view"

// Khusus admin (proxy.ts), tidak ditautkan dari halaman publik dan tidak diindeks.
export const metadata: Metadata = {
  title: "Uptime | LAYAN",
  description: "Status layanan LAYAN dan angka nyata dari database, dicek langsung.",
  robots: { index: false, follow: false },
}

export default function Page() {
  return <StatusView />
}
