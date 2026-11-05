"use client"

import * as React from "react"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
import { cn } from "@/lib/utils"
import type { LineItem, RateLine } from "@/lib/data/types"
import { coverLabel, slipSectionTitles } from "@/components/underwriting/slip-model"
import {
  GENERIC_RATE_LABEL,
  addItemCover,
  allowsFlatPremium,
  isLimitOnlyItem,
  itemGroups,
  itemSection,
  removeItemCover,
} from "@/lib/slip-items"

/** Panjang nama cover, sama dengan batas di server. */
const COVER_NAME_MAX = 200

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
 * dan premi, misalnya limit any one carrying CIT. Satu objek boleh punya
 * beberapa cover dengan rate masing-masing, misalnya ICC "A" dan War pada CI
 * single shipment (contoh 02).
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
  const [rateCover, setRateCover] = React.useState<string | null>(null)
  const flatAllowed = allowsFlatPremium(slip.cob)
  const sectioned = slipSectionTitles(slip) !== null
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
  // Objek limit saja tidak berpremi, jadi cover tambahannya tidak ditampilkan
  // (tetap tersimpan kalau dasarnya dikembalikan ke Rate).
  const shownLines = (g: (typeof groups)[number]) =>
    isLimit(g.item) ? g.rateLines.slice(0, 1) : g.rateLines
  // Nama cover untuk "Rate semua objek" bila objek punya lebih dari satu cover.
  const coverNames = [
    ...new Set(
      groups.flatMap((g) =>
        isLimit(g.item) ? [] : g.rateLines.filter((l) => !isFlat(l)).map((l) => coverLabel(slip, l))
      )
    ),
  ]
  const targetCover =
    coverNames.length > 1
      ? rateCover && coverNames.includes(rateCover)
        ? rateCover
        : coverNames[0]
      : null
  const coverItems = coverNames.map((name) => ({ label: name, value: name }))

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
          {targetCover ? (
            <Field className="w-56">
              <FieldLabel htmlFor="rate-semua-cover">Untuk cover</FieldLabel>
              <Select
                items={coverItems}
                value={targetCover}
                onValueChange={(v) => setRateCover(String(v))}
              >
                <SelectTrigger id="rate-semua-cover" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {coverItems.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={rateForAll == null}
            onClick={() =>
              onChange({
                rateLines: slip.rateLines.map((l) =>
                  isFlat(l) ||
                  groups.some((g) => isLimit(g.item) && g.rateLines.includes(l)) ||
                  (targetCover !== null && coverLabel(slip, l) !== targetCover)
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
          {groups.flatMap((g) => {
            const lines = shownLines(g)
            const multi = lines.length > 1
            const canAddCover = flatAllowed && !locked && !isLimit(g.item)
            const addCover = canAddCover ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="mt-1 -ml-2 text-muted-foreground"
                aria-label={`Tambah cover objek ${g.no}`}
                onClick={() => onChange({ rateLines: addItemCover(slip, g.item.id) })}
              >
                <Plus data-icon="inline-start" />
                Tambah cover
              </Button>
            ) : null
            const objectCell = (
              <>
                <span className="line-clamp-2" title={g.item.description || undefined}>
                  {g.item.description.split("\n")[0].trim() || `Objek ${g.no}`}
                </span>
                {sectioned ? (
                  <span className="block text-xs text-muted-foreground">
                    Section {itemSection(g.item)}
                  </span>
                ) : null}
              </>
            )
            const lineCells = (l: RateLine, i: number) => (
              <>
                <TableCell className="align-top">
                  {isFlat(l) || isLimit(g.item) ? (
                    <span className="block pt-1.5 text-right text-sm text-muted-foreground">
                      {isLimit(g.item) ? "—" : "Flat"}
                    </span>
                  ) : (
                    <NumberInput
                      preset="rate"
                      className="ml-auto h-8 w-24"
                      aria-label={
                        multi ? `Rate cover ${i + 1} objek ${g.no}` : `Rate objek ${g.no}`
                      }
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
                        aria-label={
                          multi
                            ? `Dasar premi cover ${i + 1} objek ${g.no}`
                            : `Dasar premi objek ${g.no}`
                        }
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {BASIS_ITEMS.map((b) => (
                            <SelectItem key={b.value} value={b.value}>
                              {b.label}
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
                      aria-label={
                        multi
                          ? `Nilai premi flat cover ${i + 1} objek ${g.no}`
                          : `Nilai premi flat objek ${g.no}`
                      }
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
              </>
            )
            // Satu cover: satu baris. Beberapa cover: baris objek, lalu satu
            // baris per cover supaya nama, rate, dan preminya sejajar.
            if (!multi) {
              const l = lines[0]
              return [
                <TableRow key={l.id}>
                  <TableCell className="align-top text-sm">{g.no}</TableCell>
                  <TableCell className="align-top text-sm whitespace-normal">
                    {objectCell}
                    {addCover}
                  </TableCell>
                  <TableCell className="tabular text-right align-top text-sm">
                    {money(g.item.amount || 0, slip.currency)}
                  </TableCell>
                  {lineCells(l, 0)}
                </TableRow>,
              ]
            }
            return [
              <TableRow key={g.item.id} className="border-b-0">
                <TableCell className="align-top text-sm">{g.no}</TableCell>
                <TableCell className="align-top text-sm whitespace-normal">
                  {objectCell}
                </TableCell>
                <TableCell className="tabular text-right align-top text-sm">
                  {money(g.item.amount || 0, slip.currency)}
                </TableCell>
                <TableCell colSpan={flatAllowed ? 3 : 2} />
              </TableRow>,
              ...lines.map((l, i) => (
                <TableRow
                  key={l.id}
                  className={cn(i < lines.length - 1 && "border-b-0")}
                >
                  <TableCell />
                  <TableCell className="align-top text-sm whitespace-normal">
                    {locked ? (
                      <span className="block pt-1.5 text-xs text-muted-foreground">
                        {coverLabel(slip, l)}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Input
                          className="h-8 text-xs"
                          aria-label={`Nama cover ${i + 1} objek ${g.no}`}
                          aria-invalid={i > 0 && !l.label.trim() ? true : undefined}
                          maxLength={COVER_NAME_MAX}
                          placeholder={
                            i === 0
                              ? slip.typeOfCover || slip.cob
                              : "Nama cover, misalnya War Risks"
                          }
                          value={l.label === GENERIC_RATE_LABEL ? "" : l.label}
                          onChange={(e) =>
                            setLine(l.id, {
                              label: e.target.value || (i === 0 ? GENERIC_RATE_LABEL : ""),
                            })
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Hapus cover ${i + 1} objek ${g.no}`}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => onChange({ rateLines: removeItemCover(slip, l.id) })}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    )}
                    {i === lines.length - 1 ? addCover : null}
                  </TableCell>
                  <TableCell />
                  {lineCells(l, i)}
                </TableRow>
              )),
            ]
          })}
        </TableBody>
      </Table>

      <p className="text-xs text-muted-foreground">
        Objek dan nilainya diisi di bagian Interest Insured. Premi = nilai objek
        × rate. Pilih Dasar Flat untuk mengisi premi langsung, misalnya premi
        flat Liability, atau Limit saja untuk nilai yang hanya batas, misalnya
        limit any one carrying, supaya tidak ikut total sum insured dan premi.
        {flatAllowed
          ? " Tambah cover untuk objek dengan lebih dari satu rate, misalnya ICC \u201cA\u201d dan War; preminya dijumlah."
          : null}
      </p>
    </div>
  )
}
