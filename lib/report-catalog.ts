/**
 * Daftar report di menu Report (MoM review Phase 1, 17 November 2026, poin 16). Report dipilih,
 * parameternya diisi di dialog, lalu file Excel langsung terunduh. Report lain ditambahkan di
 * sini setelah template dari Team LCH diterima.
 */

import { canSeeReportClaims } from "./access"

export type ReportId =
  | "rekap-produksi"
  | "statistik-klaim"
  | "produksi-ojk"
  | "loss-ratio-asuransi"
  | "loss-ratio-akun"
  | "reserve-basis"

/** Pilihan di dialog selain periode: asuransi (boleh semua) atau akun (wajib). */
export type ReportParam = "insurer" | "account"

/** Periode awal dialog: bulan berjalan, triwulan berjalan, atau lima tahun terakhir. */
export type ReportPeriodKind = "month" | "quarter" | "years"

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
  params?: readonly ReportParam[]
  /** Kosong berarti bulan berjalan. */
  defaultPeriod?: ReportPeriodKind
}

export const REPORTS: readonly ReportDefinition[] = [
  {
    id: "rekap-produksi",
    title: "Rekap Produksi",
    description:
      "Format kolom LCH per polis, per asuransi, dan per unsur pendapatan (COMM, EF, margin), plus sheet Per Polis. Nilai dalam mata uang polis dan IDR.",
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
  // Template report Team LCH (20 November 2026).
  {
    id: "produksi-ojk",
    title: "Produksi OJK (LR 01 & LR 02)",
    description:
      "Laporan triwulanan OJK: jumlah polis, premi, dan pendapatan jasa keperantaraan per lini usaha, lokasi penempatan, dan penanggung.",
    division: "Produksi",
    access: "/reports",
    dateBasis: "tanggal mulai polis",
    defaultPeriod: "quarter",
  },
  {
    id: "loss-ratio-asuransi",
    title: "Loss Ratio per Asuransi",
    description:
      "Per asuransi, per COB, per tahun polis: gross premium, net premium, klaim, dan rasio terhadap gross dan net, seperti laporan produksi dari asuransi.",
    division: "Klaim",
    access: "/reports",
    claims: true,
    dateBasis: "tanggal mulai tahun polis (polis Baru atau Renewal)",
    params: ["insurer"],
    defaultPeriod: "years",
  },
  {
    id: "loss-ratio-akun",
    title: "Loss Ratio Akun per Asuransi",
    description:
      "Satu akun (grouping insured) per tahun polis per asuransi: premi gross, BF, diskon, EF, net premium, klaim, dan loss ratio, beserta gabungan semua tahun.",
    division: "Klaim",
    access: "/reports",
    claims: true,
    dateBasis: "tanggal mulai tahun polis (polis Baru atau Renewal)",
    params: ["account"],
    defaultPeriod: "years",
  },
  {
    id: "reserve-basis",
    title: "Reserve Basis Bulanan",
    description:
      "Per insured per bulan: pendapatan (COMM, COMM via interco, EF, margin) dan kolom beban marketing untuk diisi, lalu reserve 40% pendapatan dikurangi beban.",
    division: "Finance",
    access: "/reports",
    dateBasis: "tanggal mulai polis",
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

/**
 * Periode awal dialog. Bulan berjalan: tanggal 1 sampai akhir bulan. Triwulan berjalan untuk
 * laporan OJK. Lima tahun terakhir untuk loss ratio: 1 Januari lima tahun lalu sampai hari ini.
 */
export function defaultReportPeriod(
  today: string,
  kind: ReportPeriodKind = "month"
): { start: string; end: string } {
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))
  if (kind === "years") return { start: `${year - 5}-01-01`, end: today }
  const first = kind === "quarter" ? Math.floor((month - 1) / 3) * 3 + 1 : month
  const last = kind === "quarter" ? first + 2 : month
  const lastDay = new Date(Date.UTC(year, last, 0)).getUTCDate()
  const mm = (m: number) => String(m).padStart(2, "0")
  return { start: `${year}-${mm(first)}-01`, end: `${year}-${mm(last)}-${String(lastDay).padStart(2, "0")}` }
}

/** Pesan kesalahan periode; null bila periodenya bisa dipakai. */
export function reportPeriodError(start: string, end: string): string | null {
  const iso = /^\d{4}-\d{2}-\d{2}$/
  if (!iso.test(start) || !iso.test(end)) return "Isi tanggal mulai dan tanggal akhir."
  if (start > end) return "Tanggal mulai tidak boleh setelah tanggal akhir."
  return null
}
