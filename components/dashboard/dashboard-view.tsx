"use client"

import Link from "next/link"
import {
  ArrowRight,
  CalendarClock,
  FilePlus2,
  ShieldCheck,
  TrendingUp,
  TriangleAlert,
  Users,
} from "lucide-react"

import { CobChart } from "@/components/dashboard/cob-chart"
import { ProductionChart } from "@/components/dashboard/production-chart"
import { PageHeader, PageShell } from "@/components/layout/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatCard } from "@/components/shared/stat-card"
import { ToneBadge } from "@/components/shared/status-badge"
import { useToday } from "@/components/layout/today-provider"
import { Button } from "@/components/ui/button"
import {
  computeTotals,
  monthlyProduction,
  premiumByCob,
  premiumIdr,
  upcomingRenewals,
} from "@/lib/data"
import { daysBetween, yearMonth } from "@/lib/date"
import { compactMoney, dateShort, monthLabel, rupiah } from "@/lib/format"
import type { ClaimRecord } from "@/lib/server/claims"
import type { ClientRecord } from "@/lib/server/clients"
import type { PlacingSlipRecord } from "@/lib/server/placing-slips"
import type { PolicyRecord } from "@/lib/server/policies"

const QUICK_LINKS = [
  {
    title: "Database Klien",
    desc: "Kelola data klien & renewal notice",
    href: "/marketing",
    icon: Users,
  },
  {
    title: "Buat Placing Slip",
    desc: "Mulai placing slip baru",
    href: "/underwriting/new",
    icon: FilePlus2,
  },
  {
    title: "Policy Database",
    desc: "Kelola polis asuransi",
    href: "/policies",
    icon: ShieldCheck,
  },
  {
    title: "Input Klaim",
    desc: "Catat klaim baru",
    href: "/claims",
    icon: TriangleAlert,
  },
  {
    title: "Report",
    desc: "Laporan produksi & klaim",
    href: "/reports",
    icon: TrendingUp,
  },
]

export interface DashboardViewProps {
  initialClients: ClientRecord[]
  initialPolicies: PolicyRecord[]
  initialClaims: ClaimRecord[]
  initialSlips: PlacingSlipRecord[]
}

export function DashboardView({
  initialClients,
  initialPolicies,
  initialClaims,
  initialSlips,
}: DashboardViewProps) {
  /*
   * Dihitung langsung dari data server, tidak lewat store sesi.
   *
   * Store dimuati data contoh saat modul diimpor, jadi membacanya berarti
   * render pertama memakai angka contoh dan baru berganti ke angka database
   * setelah efek hidrasi jalan. Di halaman ini bedanya kelihatan: angkanya
   * sempat salah sepersekian detik sebelum berubah sendiri.
   *
   * Tabel tetap perlu store supaya hasil edit form langsung terlihat tanpa
   * memuat ulang. Dashboard tidak: ini halaman ringkasan yang dibuka, bukan
   * disunting, dan setiap kali dibuka Next mengambil datanya lagi dari server.
   */
  const today = useToday()
  const clients = initialClients
  const policies = initialPolicies
  const claims = initialClaims
  const slips = initialSlips

  const totals = computeTotals({ clients, policies, claims, slips }, today)
  const renewals = upcomingRenewals(policies, today, 60)
  const cob = premiumByCob(policies, today)
  const { year, month } = yearMonth(today)
  const monthPrefix = today.slice(0, 7)
  const newClients = clients.filter((c) =>
    c.createdAt.startsWith(monthPrefix)
  ).length
  const newPoliciesYtd = policies.filter(
    (p) => p.type === "Baru" && p.inceptionDate.startsWith(String(year))
  ).length

  return (
    <PageShell>
      <PageHeader
        title="Dashboard"
        description={`Ringkasan operasional PT. LCH Insurance Brokers — periode ${monthLabel(month - 1, year)}`}
        actions={
          <Button
            render={<Link href="/underwriting/new" />}
            nativeButton={false}
          >
            <FilePlus2 data-icon="inline-start" />
            Buat Placing Slip
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Klien"
          value={totals.clients}
          sub={`${totals.activeClients} aktif`}
          icon={Users}
          trend={
            newClients
              ? { value: `+${newClients} bulan ini`, direction: "up" }
              : undefined
          }
        />
        <StatCard
          label="Polis Aktif"
          value={totals.activePolicies}
          sub={`${totals.draftSlips} slip masih draft`}
          icon={ShieldCheck}
          trend={
            newPoliciesYtd
              ? { value: `+${newPoliciesYtd} polis baru YTD`, direction: "up" }
              : undefined
          }
        />
        <StatCard
          label="Klaim Terbuka"
          value={totals.openClaims}
          sub={`Outstanding Rp ${compactMoney(totals.claimOutstanding)}`}
          icon={TriangleAlert}
        />
        <StatCard
          label="Total Premium"
          value={`Rp ${compactMoney(totals.totalPremium)}`}
          sub={`Brokerage ${compactMoney(totals.totalBrokerage)}`}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <SectionCard
          title={`Produksi Bulanan ${year}`}
          description="Premium & brokerage dalam juta IDR, menurut bulan mulai polis"
          contentClassName="px-2"
        >
          <ProductionChart data={monthlyProduction(policies, year)} />
          <div className="mt-2 flex justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-[var(--chart-1)]" />{" "}
              Premium
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-[var(--chart-2)]" />{" "}
              Brokerage
            </span>
          </div>
        </SectionCard>

        <SectionCard
          title="Class of Business"
          description="Porsi premium portofolio aktif"
        >
          <CobChart
            data={cob.map((c) => ({ cob: c.cob, premium: c.premium }))}
          />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <SectionCard
          title={
            <span className="flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" />
              Renewal Mendatang (60 Hari)
            </span>
          }
          action={
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/marketing" />}
              nativeButton={false}
            >
              Lihat semua
              <ArrowRight data-icon="inline-end" />
            </Button>
          }
          contentClassName="flex flex-col gap-1"
        >
          {renewals.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada renewal mendatang
            </p>
          ) : (
            renewals.map((p) => {
              const days = daysBetween(today, p.expiryDate)
              return (
                <div
                  key={p.id}
                  className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {p.insuredName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.cob} · {p.policyNo}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-sm font-medium">
                      {rupiah(premiumIdr(p))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dateShort(p.expiryDate)}
                    </p>
                  </div>
                  <ToneBadge
                    tone={days <= 30 ? "warning" : "info"}
                    className="w-[62px] justify-center"
                  >
                    {days} hari
                  </ToneBadge>
                </div>
              )
            })
          )}
        </SectionCard>

        <SectionCard title="Akses Cepat" contentClassName="flex flex-col gap-1">
          {QUICK_LINKS.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
                <q.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {q.title}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {q.desc}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </SectionCard>
      </div>
    </PageShell>
  )
}
