/**
 * Daftar report di menu Report (MoM review Phase 1, 17 November 2026, poin 16). Report dipilih,
 * parameternya diisi di dialog, lalu file Excel langsung terunduh. Report lain ditambahkan di
 * sini setelah template dari Team LCH diterima.
 */

import { canSeeReportClaims } from "./access"

export type ReportId = "rekap-produksi" | "statistik-klaim"

export interface ReportDefinition {
  id: ReportId
  title: string
  description: string
  /** Kelompok di halaman Report. */
  division: string
  /**
   * Menu yang hak aksesnya menentukan siapa yang melihat report ini, sesuai matriks hak akses
   * LCH. Rekap Produksi mengikuti Report Operational, tempat tombolnya sebelumnya.
   */
  access: string
  /**
   * Report berisi data klaim: hanya role yang melihat bagian Klaim di Report Operational
   * (`canSeeReportClaims`), walaupun role lain punya akses menu.
   */
  claims?: boolean
  /** Dasar tanggal parameter periode, ditulis di dialog. */
  dateBasis: string
}

export const REPORTS: readonly ReportDefinition[] = [
  {
    id: "rekap-produksi",
    title: "Rekap Produksi",
    description:
      "Format 49 kolom LCH: satu baris per polis per asuransi, nilai dalam mata uang polis dan IDR.",
    division: "Produksi",
    access: "/reports",
    dateBasis: "tanggal mulai polis",
  },
  {
    id: "statistik-klaim",
    title: "Statistik Klaim per Status",
    description:
      "Jumlah dan nilai klaim per status, per COB, per asuransi, dan per tahapan dokumen, beserta daftar klaim seperti register LCH.",
    division: "Klaim",
    access: "/reports",
    claims: true,
    dateBasis: "tanggal lapor klaim (tanggal kejadian bila tanggal lapor kosong)",
  },
]

export interface ReportGroup {
  division: string
  reports: ReportDefinition[]
}

/** Report yang boleh dilihat role, dikelompokkan per divisi dengan urutan daftar. */
export function visibleReports(
  canAccess: (path: string) => boolean,
  roles: readonly string[]
): ReportGroup[] {
  const groups = new Map<string, ReportDefinition[]>()
  for (const report of REPORTS) {
    if (!canAccess(report.access)) continue
    if (report.claims && !canSeeReportClaims([...roles])) continue
    groups.set(report.division, [...(groups.get(report.division) ?? []), report])
  }
  return [...groups].map(([division, reports]) => ({ division, reports }))
}

/** Periode awal dialog: bulan berjalan, tanggal 1 sampai akhir bulan. */
export function defaultReportPeriod(today: string): { start: string; end: string } {
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return { start: `${today.slice(0, 7)}-01`, end: `${today.slice(0, 7)}-${String(lastDay).padStart(2, "0")}` }
}

/** Pesan kesalahan periode; null bila periodenya bisa dipakai. */
export function reportPeriodError(start: string, end: string): string | null {
  const iso = /^\d{4}-\d{2}-\d{2}$/
  if (!iso.test(start) || !iso.test(end)) return "Isi tanggal mulai dan tanggal akhir."
  if (start > end) return "Tanggal mulai tidak boleh setelah tanggal akhir."
  return null
}
