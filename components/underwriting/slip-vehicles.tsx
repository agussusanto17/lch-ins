"use client"

import * as React from "react"

import { TotalBar } from "@/components/underwriting/line-items"
import {
  OjkReference,
  type RateBounds,
} from "@/components/underwriting/ojk-reference"
import {
  CoverRateTable,
  LimitRateTable,
} from "@/components/underwriting/rate-tables"
import {
  isOutOfBounds,
  keepGroupDeductibles,
  itemRowsPatch,
} from "@/components/underwriting/slip-model"
import { UnitCard } from "@/components/underwriting/unit-card"
import { Button } from "@/components/ui/button"
import { rateUnitFor, sumPremium, usesOjkTariff } from "@/lib/calc"
import type { PlacingSlip, RateException, RateLine } from "@/lib/data"
import { dateShort, money, num } from "@/lib/format"
import { multiYearSchedule, type VehicleYearSchedule } from "@/lib/multi-year-schedule"
import { itemGroups } from "@/lib/slip-items"
import { cascoSwitchPatch, vehicleTariff, vehicleTitle } from "@/lib/slip-vehicles"

/**
 * Rate Motor Vehicle per kendaraan; data dan TSI diisi di Interest Insured (Harry, 5 November 2026).
 * Type of cover tanpa tarif OJK, misalnya Heavy Equipment, tidak menampilkan bagian OJK.
 */
/**
 * Rincian premi per tahun polis satu kendaraan (polis multi tahun): nilai casco tahun itu, premi
 * casco dan perluasan, premi TPL dan PA, dan total tahun itu. Jumlahnya sama dengan premi per baris
 * di atas, yang berisi total semua tahun.
 */
function YearBreakdown({ schedule, currency }: { schedule: VehicleYearSchedule; currency: string }) {
  const th = "px-2 py-1.5 text-left font-medium text-muted-foreground"
  const td = "px-2 py-1.5 tabular-nums whitespace-nowrap"
  // Mata uang di judul kolom supaya angka muat tanpa patah baris.
  const amount = (value: number) => num(value, Number.isInteger(value) ? 0 : 2)
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Rincian per tahun polis</p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className={th}>Tahun</th>
              <th className={th}>Periode</th>
              <th className={`${th} text-right`}>Nilai casco ({currency})</th>
              <th className={`${th} text-right`}>Casco &amp; perluasan</th>
              <th className={`${th} text-right`}>TPL &amp; PA</th>
              <th className={`${th} text-right`}>Premi ({currency})</th>
            </tr>
          </thead>
          <tbody>
            {schedule.years.map(({ year, sumInsured, rows, total }) => {
              const casco = rows.filter((r) => r.kind === "casco").reduce((a, r) => a + r.premium, 0)
              return (
                <tr key={year.no} className="border-t">
                  <td className={td}>
                    {year.no}
                    {year.factor < 1 ? (
                      <span className="block text-[11px] text-muted-foreground">
                        prorata {num(year.factor * 365, 0)} hari
                      </span>
                    ) : null}
                  </td>
                  <td className={td}>
                    {dateShort(year.start)} – {dateShort(year.end)}
                  </td>
                  <td className={`${td} text-right`}>{amount(sumInsured)}</td>
                  <td className={`${td} text-right`}>{amount(casco)}</td>
                  <td className={`${td} text-right`}>{amount(total - casco)}</td>
                  <td className={`${td} text-right font-medium`}>{amount(total)}</td>
                </tr>
              )
            })}
            <tr className="border-t bg-muted/30 font-medium">
              <td className={td} colSpan={5}>
                Total {schedule.years.length} tahun polis
              </td>
              <td className={`${td} text-right`}>{amount(schedule.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function SlipVehicles({
  slip,
  lines,
  locked,
  onChange,
  onPickRate,
  onExceptionChange,
}: {
  slip: PlacingSlip
  /** Baris rate slip beserta batas OJK-nya (rateLinesWithBounds). */
  lines: RateLine[]
  locked: boolean
  onChange: (patch: Partial<PlacingSlip>) => void
  onPickRate: (
    vehicleId: string,
    label: string,
    value: number,
    bounds?: RateBounds
  ) => void
  onExceptionChange: (id: string, exception: RateException | null) => void
}) {
  const groups = itemGroups(slip)
  const multi = groups.length > 1
  // Polis multi tahun: rincian premi per tahun polis tiap kendaraan.
  const yearSchedules = new Map(multiYearSchedule(slip).map((v) => [v.item.id, v]))
  const ojk = usesOjkTariff(slip)

  // Seperti kartu lokasi: dicatat per urutan, slip multi kendaraan mulai
  // terlipat, kendaraan yang baru ditambah langsung terbuka.
  const [startCount] = React.useState(groups.length)
  const [openAt, setOpenAt] = React.useState<Record<number, boolean>>({})
  const isOpen = (index: number) =>
    openAt[index] ?? (startCount <= 1 || index >= startCount)
  const allOpen = groups.every((_, i) => isOpen(i))

  // Kendaraan yang pindah Comprehensive ↔ TLO dihitung ulang batas perluasannya.
  const setRate = (id: string, rate: number | null) =>
    onChange(
      cascoSwitchPatch(slip, {
        rateLines: slip.rateLines.map((l) => (l.id === id ? { ...l, rate } : l)),
      })
    )

  if (!groups.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Tambah kendaraan di bagian Interest Insured untuk mengisi rate.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {!ojk ? (
        <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {slip.typeOfCover || "Type of cover ini"} tidak memakai tarif OJK.
          Rate dan brokerage tidak dibatasi batas OJK.
        </p>
      ) : null}
      {multi ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setOpenAt(Object.fromEntries(groups.map((_, i) => [i, !allOpen])))
            }
          >
            {allOpen ? "Tutup semua kendaraan" : "Buka semua kendaraan"}
          </Button>
        </div>
      ) : null}

      {groups.map((g, index) => {
        const { item: vehicle } = g
        const tariff = vehicleTariff(slip, vehicle)
        const ids = new Set(g.rateLines.map((l) => l.id))
        const vehicleLines = lines.filter((l) => ids.has(l.id))
        const casco = sumPremium(g.rateLines)
        const premium = casco + sumPremium(g.tplLines) + sumPremium(g.paLines)
        const incomplete =
          (vehicle.amount || 0) <= 0 ||
          !g.rateLines.some((l) => (l.rate ?? 0) > 0)
        const unresolved = vehicleLines.filter(
          (l) => isOutOfBounds(l) && !slip.rateExceptions?.[l.id]
        ).length
        const facts = [
          `TSI ${money(vehicle.amount || 0, slip.currency)}`,
          ojk ? tariff.category : null,
          ojk ? tariff.region?.split(":")[0] : null,
          `Premi ${money(premium, slip.currency)}`,
        ].filter(Boolean)

        return (
          <UnitCard
            key={vehicle.id}
            title={`Kendaraan ${g.no}`}
            open={isOpen(index)}
            onOpenChange={(open) => setOpenAt((o) => ({ ...o, [index]: open }))}
            status={
              <>
                {incomplete ? (
                  <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                    Belum lengkap
                  </span>
                ) : null}
                {unresolved ? (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    {unresolved} rate butuh alasan
                  </span>
                ) : null}
              </>
            }
            summary={
              <>
                <span className="block truncate">{vehicleTitle(vehicle)}</span>
                <span className="block">{facts.join(" · ")}</span>
              </>
            }
          >
            {!locked && ojk ? (
              <OjkReference
                mode="motor"
                riskLocation={tariff.locationOrPlate}
                sumInsured={vehicle.amount || 0}
                onPickRate={(label, value, bounds) => {
                  // Rate casco dari panel bisa memindahkan kendaraan Comprehensive ↔ TLO:
                  // batas perluasannya dihitung ulang dulu, lalu rate dan batas pilihan diisi.
                  const rateLines = slip.rateLines.map((l) =>
                    ids.has(l.id) && l.label.startsWith(label) ? { ...l, rate: value } : l
                  )
                  const patch = cascoSwitchPatch(slip, { rateLines })
                  if (patch.rateLines !== rateLines) onChange(patch)
                  onPickRate(vehicle.id, label, value, bounds)
                }}
              />
            ) : null}

            <CoverRateTable
              lines={vehicleLines}
              currency={slip.currency}
              unit={rateUnitFor(slip.cob)}
              exceptions={slip.rateExceptions}
              readOnly={locked}
              onRateChange={setRate}
              onExceptionChange={onExceptionChange}
            />
            <TotalBar
              label="Casco dan perluasan"
              value={money(casco, slip.currency)}
              tone="muted"
            />

            <LimitRateTable
              title="Third Party Liability"
              lines={g.tplLines}
              currency={slip.currency}
              totalLabel="Total TPL"
              readOnly={locked}
              onChange={(l) =>
                onChange(
                  itemRowsPatch(
                    slip,
                    "tplLines",
                    vehicle.id,
                    keepGroupDeductibles(g.tplLines, l)
                  )
                )
              }
            />
            <LimitRateTable
              title="Personal Accident"
              lines={g.paLines}
              currency={slip.currency}
              totalLabel="Total PA"
              showCoverColumn
              readOnly={locked}
              onChange={(l) =>
                onChange(
                  itemRowsPatch(
                    slip,
                    "paLines",
                    vehicle.id,
                    keepGroupDeductibles(g.paLines, l)
                  )
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              Limit PA: IDR 5.000.000/orang, maks. 4 orang (selain truck &amp;
              motorcycle) · maks. 2 orang (truck).
            </p>
            {yearSchedules.get(vehicle.id) ? (
              <YearBreakdown schedule={yearSchedules.get(vehicle.id)!} currency={slip.currency} />
            ) : null}
            {multi ? (
              <TotalBar
                label={`Premi kendaraan ${g.no}`}
                value={money(premium, slip.currency)}
                tone="muted"
              />
            ) : null}
          </UnitCard>
        )
      })}

      <p className="text-xs text-muted-foreground">
        Rate dalam persen (%). Premi casco dan perluasan = TSI kendaraan ×
        rate; TPL dan PA = limit × rate.
        {yearSchedules.size
          ? " Polis multi tahun: premi per baris adalah jumlah semua tahun polis, dengan nilai casco yang menyusut per tahun."
          : null}
        {ojk ? " Kategori dan wilayah OJK dihitung per kendaraan." : null} Data
        kendaraan, TSI, dan tombol Tambah kendaraan ada di bagian Interest
        Insured.
      </p>
    </div>
  )
}
