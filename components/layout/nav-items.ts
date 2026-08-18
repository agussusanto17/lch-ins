import type { LucideIcon } from "lucide-react"
import {
  BookOpenText,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  TriangleAlert,
  Users,
  ChartColumn,
} from "lucide-react"

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
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
      { title: "Underwriting", href: "/underwriting", icon: FileText },
      { title: "Policy Database", href: "/policies", icon: ShieldCheck },
      { title: "Klaim", href: "/claims", icon: TriangleAlert },
    ],
  },
  {
    label: "Referensi & Laporan",
    items: [
      { title: "Master Clauses", href: "/underwriting/master-clauses", icon: BookOpenText },
      { title: "Report", href: "/reports", icon: ChartColumn },
    ],
  },
]

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items)
