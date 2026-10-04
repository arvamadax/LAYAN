import type { Metadata } from "next"
import { StafView } from "./view"

export const metadata: Metadata = {
  title: "Untuk staf | LAYAN",
  description: "Tutorial Staff Console: agent mengerjakan langkah berulang, staf cukup memutuskan.",
}

export default function Page() {
  return <StafView />
}
