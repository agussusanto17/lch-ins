"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { NumberInput } from "@/components/ui/number-input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { rateUnitFor } from "@/lib/calc"
import type { PlacingSlip } from "@/lib/data"
import { money } from "@/lib/format"
import type { LineItem, RateLine } from "@/lib/data/types"
import { allowsFlatPremium, isLimitOnlyItem, itemGroups } from "@/lib/slip-items"

const BASIS_ITEMS = [
  { label: "Rate", value: "rate" },
  { label: "Flat", value: "flat" },
  { label: "Limit saja", value: "limit" },
]

/**
 * Rate slip COB selain Property dan Motor Vehicle per objek (Agus, 5 November
 * 2026), misalnya peserta PA, unit MB, alat CPM, atau CIT dan CIS. Objek dan
 * nilainya diisi di Interest Insured; premi = nilai objek × rate. Objek bisa
 * memakai premi flat yang diisi langsung, seperti Liability dan MB di contoh
 * slip LCH (6 November 2026), atau menjadi "limit saja" yang tidak ikut TSI
 * dan premi, misalnya limit any one carrying CIT.
 */
export function SlipItemRates({
  slip,
  locked,
  onChange,
}: {
  slip: PlacingSlip
  locked: boolean
  onChange: (patch: Partial<PlacingSlip>) => void
}) {
  const groups = itemGroups(slip)
  const unit = rateUnitFor(slip.cob)
  const [rateForAll, setRateForAll] = React.useState<number | null>(null)
  const flatAllowed = allowsFlatPremium(slip.cob)
  const isFlat = (l: RateLine) => flatAllowed && l.flatPremium === true
  const isLimit = (item: LineItem) => isLimitOnlyItem(slip.cob, item)
  const anyFlat = slip.rateLines.some(isFlat)
  const setLine = (id: string, patch: Partial<RateLine>) =>
    onChange({
      rateLines: slip.rateLines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })
  // Dasar premi satu baris: rate × nilai, premi flat, atau nilai yang hanya
  // limit. Pindah ke flat: premi hasil rate menjadi isian awal.
  const setBasis = (item: LineItem, line: RateLine, basis: string) =>
    onChange({
      interestItems: slip.interestItems.map((v) =>
        v.id === item.id ? { ...v, limitOnly: basis === "limit" || undefined } : v
      ),
      rateLines: slip.rateLines.map((l) => {
        if (l.id !== line.id) return l
        if (basis === "flat") return { ...l, flatPremium: true, rate: null }
        if (basis === "limit") return { ...l, flatPremium: false, rate: null, premium: 0 }
        return { ...l, flatPremium: false, premium: isFlat(l) ? 0 : l.premium }
      }),
    })
  const basisOf = (item: LineItem, line: RateLine) =>
    isLimit(item) ? "limit" : isFlat(line) ? "flat" : "rate"

  if (!groups.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Tambah objek di bagian Interest Insured untuk mengisi rate.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Peserta PA bisa puluhan; satu rate bisa langsung dipakai semua objek. */}
      {groups.length > 1 && !locked ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field className="w-48">
            <FieldLabel htmlFor="rate-semua-objek">
              Rate semua objek ({unit})
            </FieldLabel>
            <NumberInput
              id="rate-semua-objek"
              preset="rate"
              placeholder="0,000"
              value={rateForAll}
              onValueChange={setRateForAll}
            />
          </Field>
          <Button
            type="button"
            variant="outline"
            disabled={rateForAll == null}
            onClick={() =>
              onChange({
                rateLines: slip.rateLines.map((l) =>
                  isFlat(l) || groups.some((g) => isLimit(g.item) && g.rateLines.includes(l))
                    ? l
                    : { ...l, rate: rateForAll }
                ),
              })
            }
          >
            Terapkan ke semua objek
          </Button>
          {anyFlat ? (
            <p className="pb-2 text-xs text-muted-foreground">
              Objek dengan premi flat atau limit saja tidak ikut.
            </p>
          ) : null}
        </div>
      ) : null}

      <Table className="min-w-140">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12">No</TableHead>
            <TableHead>Objek</TableHead>
            <TableHead className="w-44 text-right">Nilai</TableHead>
            <TableHead className="w-32 text-right">Rate ({unit})</TableHead>
            {flatAllowed ? <TableHead className="w-36">Dasar</TableHead> : null}
            <TableHead className="w-44 text-right">Premium</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.flatMap((g) =>
            g.rateLines.map((l, i) => (
              <TableRow key={l.id}>
                <TableCell className="align-top text-sm">
                  {i === 0 ? g.no : ""}
                </TableCell>
                <TableCell className="align-top text-sm whitespace-normal">
                  {i === 0 ? (
                    <span
                      className="line-clamp-2"
                      title={g.item.description || undefined}
                    >
                      {g.item.description.split("\n")[0].trim() ||
                        `Objek ${g.no}`}
                    </span>
                  ) : null}
                  {/* Slip lama bisa punya lebih dari satu baris rate per objek. */}
                  {g.rateLines.length > 1 ? (
                    <span className="block text-xs text-muted-foreground">
                      {l.label}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="tabular text-right align-top text-sm">
                  {i === 0 ? money(g.item.amount || 0, slip.currency) : ""}
                </TableCell>
                <TableCell className="align-top">
                  {isFlat(l) || isLimit(g.item) ? (
                    <span className="block pt-1.5 text-right text-sm text-muted-foreground">
                      {isLimit(g.item) ? "—" : "Flat"}
                    </span>
                  ) : (
                    <NumberInput
                      preset="rate"
                      className="ml-auto h-8 w-24"
                      aria-label={`Rate objek ${g.no}`}
                      value={l.rate}
                      readOnly={locked}
                      onValueChange={(v) => setLine(l.id, { rate: v })}
                    />
                  )}
                </TableCell>
                {flatAllowed ? (
                  <TableCell className="align-top">
                    <Select
                      items={BASIS_ITEMS}
                      value={basisOf(g.item, l)}
                      disabled={locked}
                      onValueChange={(v) => setBasis(g.item, l, String(v))}
                    >
                      <SelectTrigger
                        className="h-8 w-full"
                        aria-label={`Dasar premi objek ${g.no}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {BASIS_ITEMS.map((i) => (
                            <SelectItem key={i.value} value={i.value}>
                              {i.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </TableCell>
                ) : null}
                <TableCell className="tabular text-right align-top text-sm">
                  {isFlat(l) ? (
                    <NumberInput
                      className="ml-auto h-8 w-36"
                      aria-label={`Nilai premi flat objek ${g.no}`}
                      value={l.premium || null}
                      readOnly={locked}
                      onValueChange={(v) => setLine(l.id, { premium: v ?? 0 })}
                    />
                  ) : isLimit(g.item) ? (
                    <span className="text-muted-foreground">Tanpa premi</span>
                  ) : (
                    money(l.premium, slip.currency)
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">
        Objek dan nilainya diisi di bagian Interest Insured. Premi = nilai objek
        × rate. Pilih Dasar Flat untuk mengisi premi langsung, misalnya premi
        flat Liability, atau Limit saja untuk nilai yang hanya batas, misalnya
        limit any one carrying, supaya tidak ikut total sum insured dan premi.
      </p>
    </div>
  )
}
