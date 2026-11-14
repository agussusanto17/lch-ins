"use client"

import * as React from "react"
import { ChevronDown, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import {
  deductibleRows,
  deductibleUnits,
  extraDeductibleCovers,
  setDeductiblesAllUnits,
  shareDeductiblesPatch,
  unitsShareDeductibles,
  type DeductibleGroup,
  type DeductibleRow,
  type DeductibleUnit,
} from "@/components/underwriting/slip-model"
import { MAX_DEDUCTIBLES, type PlacingSlip } from "@/lib/data/types"
import { oneLineAddress } from "@/lib/slip-locations"
import { vehicleTitle } from "@/lib/slip-vehicles"

/**
 * Isian deductible satu cover. Tombol Pilih mengisi teks dari Master Data >
 * Deductible, lalu teks itu tetap bisa diubah khusus untuk slip ini.
 */
export function DeductibleInput({
  id,
  cover,
  value,
  onChange,
  choices,
  placeholder,
  ariaLabel,
}: {
  id: string
  cover: string
  value: string
  onChange: (value: string) => void
  choices: string[]
  placeholder?: string
  /** Untuk isian yang tidak punya label sendiri, misalnya deductible kedua. */
  ariaLabel?: string
}) {
  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {choices.length ? (
        <InputGroupAddon align="inline-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <InputGroupButton
                  className="h-7 px-2.5"
                  aria-label={`Pilih deductible ${cover} dari master data`}
                />
              }
            >
              Pilih
              <ChevronDown data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-auto max-w-[min(36rem,calc(100vw-2rem))]"
            >
              <DropdownMenuGroup>
                {choices.map((choice) => (
                  <DropdownMenuItem
                    key={choice}
                    className="whitespace-normal"
                    onClick={() => onChange(choice)}
                  >
                    {choice}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  )
}

/**
 * Deductible satu cover, paling banyak MAX_DEDUCTIBLES isian (4 November 2026).
 * Isian pertama selalu tampil dan memakai `id` untuk label cover; isian kosong dibuang saat simpan.
 */
export function DeductibleList({
  id,
  cover,
  values,
  onChange,
  choices,
  placeholder,
}: {
  id: string
  cover: string
  values: string[]
  onChange: (values: string[]) => void
  choices: string[]
  placeholder?: string
}) {
  const items = values.length ? values : [""]
  return (
    <div className="flex flex-col gap-2">
      {items.map((value, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <DeductibleInput
              id={i === 0 ? id : `${id}-${i + 1}`}
              ariaLabel={i === 0 ? undefined : `Deductible ${i + 1} ${cover}`}
              cover={cover}
              value={value}
              choices={choices}
              placeholder={placeholder}
              onChange={(next) =>
                onChange(items.map((v, j) => (j === i ? next : v)))
              }
            />
          </div>
          {items.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Hapus deductible ${i + 1} ${cover}`}
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <Trash2 />
            </Button>
          ) : null}
        </div>
      ))}
      {items.length < MAX_DEDUCTIBLES ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="self-start text-muted-foreground"
          onClick={() => onChange([...items, ""])}
        >
          <Plus data-icon="inline-start" />
          Tambah deductible
        </Button>
      ) : null}
    </div>
  )
}

/**
 * Deductible per cover satu unit; Motor Vehicle bisa menambah baris PA dan TPL (4 November 2026).
 * Dengan `shared`, perubahan berlaku untuk cover yang sama di semua unit.
 */
export function DeductiblePerCover({
  slip,
  unit,
  shared = false,
  choices,
  onChange,
}: {
  slip: PlacingSlip
  /** Lokasi, kendaraan, atau objek yang ditampilkan; bawaan unit pertama. */
  unit?: DeductibleUnit
  shared?: boolean
  choices: string[]
  onChange: (patch: Partial<PlacingSlip>) => void
}) {
  const [added, setAdded] = React.useState<DeductibleGroup[]>([])
  const rows = deductibleRows(slip, added, unit)
  const addable = extraDeductibleCovers(slip, unit).filter(
    (c) => !rows.some((r) => r.group === c.group)
  )

  const setDeductibles = (row: DeductibleRow, deductibles: string[]) =>
    onChange(
      shared
        ? setDeductiblesAllUnits(slip, row, deductibles)
        : {
            [row.group]: slip[row.group].map((l) =>
              l.id === row.lineId ? { ...l, deductibles } : l
            ),
          }
    )

  return (
    <div className="overflow-hidden rounded-xl border">
      {rows.map((row) => (
        <div
          key={`${row.group}-${row.lineId}`}
          className="grid grid-cols-1 items-start gap-x-4 gap-y-1.5 border-b px-3 py-2.5 last:border-0 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]"
        >
          <div className="flex min-w-0 items-start gap-1">
            <label
              htmlFor={`deductible-${row.lineId}`}
              className="min-w-0 truncate text-sm text-muted-foreground sm:pt-2"
              title={row.cover}
            >
              {row.cover}
            </label>
            {row.extra ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Hapus deductible ${row.cover}`}
                className="shrink-0 text-muted-foreground hover:text-destructive sm:mt-1.5"
                onClick={() => {
                  setAdded((groups) => groups.filter((g) => g !== row.group))
                  setDeductibles(row, [])
                }}
              >
                <Trash2 />
              </Button>
            ) : null}
          </div>
          <DeductibleList
            id={`deductible-${row.lineId}`}
            cover={row.cover}
            values={row.deductibles}
            choices={choices}
            onChange={(values) => setDeductibles(row, values)}
            placeholder={
              row.cover.startsWith("BI")
                ? "Contoh: 14 days waiting period"
                : "Contoh: 10% of claim minimum IDR 10,000,000"
            }
          />
        </div>
      ))}
      {addable.length ? (
        <div className="px-3 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground"
                />
              }
            >
              <Plus data-icon="inline-start" />
              Tambah cover
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                {addable.map((c) => (
                  <DropdownMenuItem
                    key={c.group}
                    onClick={() => setAdded((groups) => [...groups, c.group])}
                  >
                    {c.cover}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </div>
  )
}

/** Sebutan unit di form: lokasi, kendaraan, atau objek. */
function unitWord(slip: PlacingSlip) {
  return slip.cob === "Property"
    ? "lokasi"
    : slip.cob === "Motor Vehicle"
      ? "kendaraan"
      : "objek"
}

/** Judul dan ringkasan satu unit: alamat lokasi, nama kendaraan, atau uraian objek. */
function unitHeading(slip: PlacingSlip, unit: DeductibleUnit) {
  const word = unitWord(slip)
  const title = `${word[0].toUpperCase()}${word.slice(1)} ${unit.no}`
  const summary = unit.location
    ? oneLineAddress(unit.location.riskLocation)
    : unit.item
      ? slip.cob === "Motor Vehicle"
        ? vehicleTitle(unit.item)
        : unit.item.description.split("\n")[0].trim()
      : ""
  return { title, summary }
}

/**
 * Deductible slip, bisa diisi per lokasi, kendaraan, atau objek (Agus, 13 November 2026).
 * Selama semua unit sama cukup satu daftar; saklar "berbeda per lokasi" membuka daftar per unit.
 */
export function SlipDeductibles({
  slip,
  choices,
  locked,
  onChange,
}: {
  slip: PlacingSlip
  choices: string[]
  locked: boolean
  onChange: (patch: Partial<PlacingSlip>) => void
}) {
  const units = deductibleUnits(slip)
  const multi = units.length > 1
  const [perUnit, setPerUnit] = React.useState(
    () => !unitsShareDeductibles(slip)
  )
  const [confirming, setConfirming] = React.useState(false)
  const word = unitWord(slip)
  const firstTitle = unitHeading(slip, units[0]).title

  // AlertDialogAction di proyek ini tombol biasa, jadi dialog ditutup sendiri.
  function share() {
    onChange(shareDeductiblesPatch(slip))
    setPerUnit(false)
    setConfirming(false)
  }

  if (!multi) {
    return <DeductiblePerCover slip={slip} choices={choices} onChange={onChange} />
  }

  return (
    <div className="flex flex-col gap-3">
      <Field orientation="horizontal">
        <Switch
          id="deductible-per-unit"
          checked={perUnit}
          disabled={locked}
          onCheckedChange={(on) => {
            if (on) setPerUnit(true)
            else if (unitsShareDeductibles(slip)) setPerUnit(false)
            else setConfirming(true)
          }}
        />
        <FieldContent>
          <FieldLabel htmlFor="deductible-per-unit" className="font-normal">
            Deductible berbeda per {word}
          </FieldLabel>
          <FieldDescription>
            {perUnit
              ? `Isi deductible tiap ${word}. Dokumen mencetak deductible per ${word} bila isinya berbeda.`
              : `Satu daftar berlaku untuk semua ${units.length} ${word}. Nyalakan bila deductible tiap ${word} berbeda.`}
          </FieldDescription>
        </FieldContent>
      </Field>

      {perUnit ? (
        units.map((unit, index) => {
          const { title, summary } = unitHeading(slip, unit)
          return (
            <div key={`${index}-${unit.id}`} className="flex flex-col gap-1.5">
              <p className="flex min-w-0 items-baseline gap-2 text-sm">
                <span className="shrink-0 font-medium">{title}</span>
                {summary ? (
                  <span className="min-w-0 truncate text-xs text-muted-foreground" title={summary}>
                    {summary}
                  </span>
                ) : null}
              </p>
              <DeductiblePerCover
                slip={slip}
                unit={unit}
                choices={choices}
                onChange={onChange}
              />
            </div>
          )
        })
      ) : (
        <DeductiblePerCover slip={slip} shared choices={choices} onChange={onChange} />
      )}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Samakan deductible semua {word} dengan {firstTitle}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deductible {word} lain yang berbeda diganti dengan deductible{" "}
              {firstTitle}, cover demi cover.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={share}>Samakan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
