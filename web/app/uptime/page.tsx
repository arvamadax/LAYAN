import type { Metadata } from "next"
import { StatusView } from "./view"

export const metadata: Metadata = {
  title: "Status sistem | LAYAN",
  description: "Status layanan LAYAN dan angka nyata dari database, dicek langsung.",
}

export default function Page() {
  return <StatusView />
}
