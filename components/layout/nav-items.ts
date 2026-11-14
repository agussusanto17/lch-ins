import type { LucideIcon } from "lucide-react"
import {
  BookOpenText,
  Calculator,
  ChartColumn,
  Database,
  FileText,
  History,
  LayoutDashboard,
  Landmark,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  TriangleAlert,
  UserCog,
  Users,
  Wallet,
} from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  /** Modul yang belum dikerjakan, ditandai di sidebar. */
  soon?: boolean
  /** Submenu saat menu dibuka; di sidebar anak tampil sebagai teks bertakik, ikonnya opsional. */
  items?: Array<Pick<NavItem, "title" | "href">>
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Ringkasan",
    items: [{ title: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Operasional",
    items: [
      { title: "Marketing", href: "/marketing", icon: Users },
      { title: "Placement", href: "/placement", icon: FileText },
      { title: "Policy Database", href: "/policies", icon: ShieldCheck },
      { title: "Klaim", href: "/claims", icon: TriangleAlert },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        title: "Debit & Credit Note",
        href: "/finance/notes",
        icon: Receipt,
        soon: true,
      },
      {
        title: "Pembayaran",
        href: "/finance/payments",
        icon: Wallet,
        soon: true,
      },
      {
        title: "Piutang & Hutang Premi",
        href: "/finance/receivables",
        icon: Landmark,
        soon: true,
      },
    ],
  },
  {
    label: "Akuntansi",
    items: [
      {
        title: "Jurnal",
        href: "/accounting/journal",
        icon: ScrollText,
        soon: true,
      },
      {
        title: "Laporan Keuangan",
        href: "/accounting/statements",
        icon: Calculator,
        soon: true,
      },
    ],
  },
  {
    label: "Referensi & Laporan",
    items: [
      {
        title: "Master Clauses",
        href: "/placement/master-clauses",
        icon: BookOpenText,
      },
      {
        title: "Master Data",
        href: "/master-data",
        icon: Database,
        // Dulu tab di dalam halaman; jadi submenu supaya tiap bagian punya alamat sendiri.
        // Wording Form dan Deductible diletakkan dekat COB karena sama-sama acuan slip.
        items: [
          { title: "COB & Cover Type", href: "/master-data/cob" },
          { title: "Wording Form", href: "/master-data/wording-forms" },
          { title: "Deductible", href: "/master-data/deductibles" },
          { title: "Tarif Baku OJK", href: "/master-data/tariff-ojk" },
          { title: "Klasifikasi OJK", href: "/master-data/ojk-classes" },
          { title: "Asuransi & Adjuster", href: "/master-data/partners" },
          { title: "Rekening & Mata Uang", href: "/master-data/finance-docs" },
          { title: "Kendaraan", href: "/master-data/vehicles" },
          { title: "Nilai Pilihan Dropdown", href: "/master-data/lookups" },
        ],
      },
      // Report keuangan dan akuntansi nanti jadi menu sendiri (Agus, 9 November 2026).
      { title: "Report Operational", href: "/reports", icon: ChartColumn },
    ],
  },
  {
    label: "Sistem",
    items: [
      { title: "Pengguna", href: "/users", icon: UserCog },
      { title: "Audit Trail", href: "/audit-trail", icon: History },
      { title: "Pengaturan", href: "/settings", icon: Settings, soon: true },
    ],
  },
]

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) =>
  g.items.flatMap((item) =>
    item.items
      ? [item, ...item.items.map((sub) => ({ ...item, ...sub, items: undefined }))]
      : [item]
  )
)
