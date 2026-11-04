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
  deductibleRows,
  extraDeductibleCovers,
  type DeductibleGroup,
  type DeductibleRow,
} from "@/components/underwriting/slip-model"
import { MAX_DEDUCTIBLES, type PlacingSlip } from "@/lib/data/types"

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
 * Deductible satu cover, paling banyak MAX_DEDUCTIBLES isian (permintaan 4
 * November 2026). Isian pertama selalu tampil dan memakai `id`, supaya label
 * cover tetap menunjuk ke sana. Isian kosong dibuang saat slip disimpan.
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
 * Kotak "Deductible per cover": satu baris per cover dengan isian deductible
 * di kanan. Slip Motor Vehicle punya tombol Tambah cover di kiri untuk baris
 * Personal Accident dan Third Party Liability (permintaan 4 November 2026).
 */
export function DeductiblePerCover({
  slip,
  choices,
  onChange,
}: {
  slip: PlacingSlip
  choices: string[]
  onChange: (patch: Partial<PlacingSlip>) => void
}) {
  const [added, setAdded] = React.useState<DeductibleGroup[]>([])
  const rows = deductibleRows(slip, added)
  const addable = extraDeductibleCovers(slip).filter(
    (c) => !rows.some((r) => r.group === c.group)
  )

  const setDeductibles = (row: DeductibleRow, deductibles: string[]) =>
    onChange({
      [row.group]: slip[row.group].map((l) =>
        l.id === row.lineId ? { ...l, deductibles } : l
      ),
    })

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
