"use client"

import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import type { OpenCoverRate } from "@/lib/data/types"
import { OPEN_COVER_LIMITS } from "@/lib/open-cover"

const BASIS_ITEMS = [
  { label: "% nilai deklarasi", value: "percent" },
  { label: "Tarif per unit", value: "per_unit" },
]

let seq = 0
const newId = () => `oc-${Date.now().toString(36)}-${seq++}`

/**
 * Rate open cover per kategori (MOP Rukma Padaya Trans: DRY 0,075% dan REEFER
 * 0,0975%; container Salam Pacific: IDR per container). Tidak ada TSI dan
 * premi di slip; premi dihitung per deklarasi saat polis dibuat.
 */
export function OpenCoverRates({
  rates,
  currency,
  locked,
  onChange,
}: {
  rates: OpenCoverRate[]
  currency: string
  locked: boolean
  onChange: (rates: OpenCoverRate[]) => void
}) {
  const update = (id: string, patch: Partial<OpenCoverRate>) =>
    onChange(rates.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const add = () =>
    onChange([
      ...rates,
      {
        id: newId(),
        label: "",
        basis: rates.at(-1)?.basis ?? "percent",
        rate: null,
        ...(rates.at(-1)?.basis === "per_unit" && rates.at(-1)?.unit
          ? { unit: rates.at(-1)?.unit }
          : {}),
      },
    ])

  return (
    <div className="flex flex-col gap-3">
      {rates.length ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">No</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="w-44">Dasar</TableHead>
                <TableHead className="w-40 text-right">Rate / Tarif</TableHead>
                <TableHead className="w-36">Satuan</TableHead>
                {!locked ? <TableHead className="w-10" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell className="align-top text-sm">{i + 1}</TableCell>
                  <TableCell className="align-top">
                    <Input
                      className="h-8"
                      aria-label={`Kategori rate open cover ${i + 1}`}
                      placeholder="Misalnya DRY SHIPMENT atau 20 FT - Others"
                      maxLength={OPEN_COVER_LIMITS.text}
                      readOnly={locked}
                      value={r.label}
                      onChange={(e) => update(r.id, { label: e.target.value })}
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <Select
                      items={BASIS_ITEMS}
                      value={r.basis}
                      disabled={locked}
                      onValueChange={(v) =>
                        update(r.id, {
                          basis: v === "per_unit" ? "per_unit" : "percent",
                          rate: null,
                        })
                      }
                    >
                      <SelectTrigger
                        className="h-8 w-full"
                        aria-label={`Dasar rate open cover ${i + 1}`}
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
                  <TableCell className="align-top">
                    <NumberInput
                      className="ml-auto h-8 w-36"
                      preset={r.basis === "percent" ? "rate" : "money"}
                      aria-label={
                        r.basis === "percent"
                          ? `Rate (%) open cover ${i + 1}`
                          : `Tarif (${currency}) open cover ${i + 1}`
                      }
                      readOnly={locked}
                      value={r.rate}
                      onValueChange={(v) => update(r.id, { rate: v })}
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    {r.basis === "per_unit" ? (
                      <Input
                        className="h-8"
                        aria-label={`Satuan open cover ${i + 1}`}
                        placeholder="container"
                        maxLength={OPEN_COVER_LIMITS.unit}
                        readOnly={locked}
                        value={r.unit ?? ""}
                        onChange={(e) => update(r.id, { unit: e.target.value })}
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">%</span>
                    )}
                  </TableCell>
                  {!locked ? (
                    <TableCell className="align-top">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Hapus rate open cover ${i + 1}`}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          onChange(rates.filter((x) => x.id !== r.id))
                        }
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="rounded-lg bg-muted/60 px-3 py-3 text-sm text-muted-foreground">
          Belum ada rate. Tambahkan satu baris per kategori, misalnya DRY
          SHIPMENT 0,075% atau 20 FT - Others IDR 100.000 per container.
        </p>
      )}
      {!locked && rates.length < OPEN_COVER_LIMITS.rows ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={add}
        >
          <Plus data-icon="inline-start" />
          Tambah rate
        </Button>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Slip open cover tidak punya TSI dan premi. Limit dicatat di Interest
        Insured dengan centang &quot;Limit saja&quot;. Premi dihitung per
        deklarasi saat polis dibuat: nilai deklarasi × persen, atau jumlah unit
        × tarif.
      </p>
    </div>
  )
}
