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
import { rateUnitFor, sumPremium } from "@/lib/calc"
import type { PlacingSlip, RateException, RateLine } from "@/lib/data"
import { money } from "@/lib/format"
import { itemGroups } from "@/lib/slip-items"
import { vehicleTariff, vehicleTitle } from "@/lib/slip-vehicles"

/**
 * Rate slip Motor Vehicle per kendaraan (Harry, 5 November 2026). Tiap kartu
 * berisi referensi tarif OJK, casco dan semua perluasan, TPL, dan PA
 * kendaraan itu, dengan format slip satu kendaraan. Data kendaraan dan TSI
 * diisi di Interest Insured.
 */
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

  // Seperti kartu lokasi: dicatat per urutan, slip multi kendaraan mulai
  // terlipat, kendaraan yang baru ditambah langsung terbuka.
  const [startCount] = React.useState(groups.length)
  const [openAt, setOpenAt] = React.useState<Record<number, boolean>>({})
  const isOpen = (index: number) =>
    openAt[index] ?? (startCount <= 1 || index >= startCount)
  const allOpen = groups.every((_, i) => isOpen(i))

  const setRate = (id: string, rate: number | null) =>
    onChange({
      rateLines: slip.rateLines.map((l) => (l.id === id ? { ...l, rate } : l)),
    })

  if (!groups.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Tambah kendaraan di bagian Interest Insured untuk mengisi rate.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
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
          tariff.category,
          tariff.region?.split(":")[0],
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
            {!locked ? (
              <OjkReference
                mode="motor"
                riskLocation={tariff.locationOrPlate}
                sumInsured={vehicle.amount || 0}
                onPickRate={(label, value, bounds) =>
                  onPickRate(vehicle.id, label, value, bounds)
                }
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
        rate; TPL dan PA = limit × rate. Kategori dan wilayah OJK dihitung per
        kendaraan. Data kendaraan, TSI, dan tombol Tambah kendaraan ada di
        bagian Interest Insured.
      </p>
    </div>
  )
}
