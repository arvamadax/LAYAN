import type { Metadata } from "next"
import { UnduhView } from "./view"

export const metadata: Metadata = {
  title: "Unduh app | LAYAN",
  description: "Tutorial pasang LAYAN di Windows, iPhone, dan Android: PWA dari browser atau App Android untuk mahasiswa.",
}

export default function Page() {
  return <UnduhView />
}
