// Tipe bersama web. Data diambil dari API Rust.

export type Status =
  | "submitted"
  | "processing"
  | "needs_info"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "done"
  | "cancelled"

export const STATUS_LABEL: Record<Status, string> = {
  submitted: "Diajukan",
  processing: "Diproses agent",
  needs_info: "Butuh data",
  pending_approval: "Menunggu persetujuan",
  approved: "Disetujui",
  rejected: "Ditolak",
  done: "Selesai",
  cancelled: "Dibatalkan",
}

export type Worker = "surat" | "helpdesk" | "fasilitas"
export type Urgency = "Rendah" | "Sedang" | "Tinggi"
export type Role = "mahasiswa" | "staf" | "teknisi" | "admin"

/** Halaman awal tiap peran setelah login. */
export const HOME: Record<Role, string> = { mahasiswa: "/app", staf: "/staf", teknisi: "/teknisi", admin: "/admin" }

/** User yang login, bentuknya sama dengan `User` di api/src/auth.rs. */
export type Me = {
  id: string
  role: Role
  name: string
  email: string
  nim: string | null
  prodi: string | null
  unit: string | null
}


/** Hasil satu cek syarat, bentuknya sama dengan data dari API. */
export type Check = { ok: boolean; label: string; note: string }

/* ---------- Board Teknisi ---------- */

export type ReportStatus = "baru" | "dikerjakan" | "eskalasi" | "selesai"
export type Category = "Listrik" | "AC" | "Proyektor" | "Jaringan" | "Kebersihan" | "Lainnya"
export type Tech = "joko" | "dimas"

export const TECHS: Record<Tech, { name: string; initials: string; bg: string; fg: string; area: string }> = {
  joko: { name: "Pak Joko", initials: "PJ", bg: "#FBEBDF", fg: "#8A3F12", area: "Listrik / AC" },
  dimas: { name: "Mas Dimas", initials: "MD", bg: "#E5EEFC", fg: "#1D5FC7", area: "Jaringan / Proyektor" },
}

/** Laporan kerusakan dari GET /api/reports. */
export type Report = {
  id: string
  status: ReportStatus
  room: string
  title: string
  category: Category
  urgency: Urgency
  reporters: number
  assignee: string
  tech: string
  photo: string | null
  note: string | null
  time: string
  updated: string
}
