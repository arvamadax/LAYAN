import type { Metadata } from "next"
import { TeknisiView } from "./view"

export const metadata: Metadata = {
  title: "Untuk teknisi | LAYAN",
  description: "Tutorial Board Teknisi: laporan kerusakan dari chat langsung jadi kartu, kerjakan sampai selesai.",
}

export default function Page() {
  return <TeknisiView />
}
