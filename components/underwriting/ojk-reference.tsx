"use client"

import * as React from "react"
import { ChevronDown, Table2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { BI_SCALE, EQVET_TARIFF, FLOOD_TARIFF, OCCUPATIONS } from "@/lib/data"
import { num } from "@/lib/format"
import { cn } from "@/lib/utils"

export function OjkReference({
  occupation,
  onPickRate,
}: {
  occupation?: string
  onPickRate?: (label: string, value: number) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [klas, setKlas] = React.useState<"k1" | "k2" | "k3">("k1")

  const occ = OCCUPATIONS.find((o) => o.label === occupation)

  const clickable = (value: number, label: string) => (
    <button
      type="button"
      onClick={() => onPickRate?.(label, value)}
      className="tabular -mx-1 rounded px-1 py-0.5 transition-colors hover:bg-primary/10 hover:text-primary"
    >
      {num(value, 3)}
    </button>
  )

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger render={<Button variant="outline" size="sm" />}>
        <Table2 data-icon="inline-start" />
        Referensi Tarif OJK
        <ChevronDown
          data-icon="inline-end"
          className={cn("transition-transform", open && "rotate-180")}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4 flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          SE OJK No. 6/SEOJK.05/2017 — klik angka pada tabel untuk mengisi field
          rate secara otomatis.
        </p>

        <div className="rounded-xl border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              Tarif Harta Benda (FLEXAS)
            </p>
            <ToggleGroup
              value={[klas]}
              onValueChange={(v) =>
                setKlas(((v as string[])[0] ?? "k1") as "k1" | "k2" | "k3")
              }
              spacing={2}
            >
              <ToggleGroupItem value="k1">K1</ToggleGroupItem>
              <ToggleGroupItem value="k2">K2</ToggleGroupItem>
              <ToggleGroupItem value="k3">K3</ToggleGroupItem>
            </ToggleGroup>
          </div>

          {occ ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{occ.label}</p>
                <p className="text-xs text-muted-foreground">
                  Kode okupasi {occ.code}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  Tarif {klas.toUpperCase()} (‰)
                </p>
                <p className="text-lg font-bold text-primary">
                  {clickable(occ[klas], "FLEXAS")}
                </p>
              </div>
            </div>
          ) : (
            <p className="py-5 text-center text-sm text-muted-foreground">
              Pilih okupasi di Informasi Dasar untuk melihat referensi tarif.
            </p>
          )}
        </div>

        <div className="rounded-xl border p-4">
          <p className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
            Tarif Gempa Bumi (EQVET) ‰
          </p>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Konstruksi</TableHead>
                <TableHead className="text-right">Z1</TableHead>
                <TableHead className="text-right">Z2</TableHead>
                <TableHead className="text-right">Z3</TableHead>
                <TableHead className="text-right">Z4</TableHead>
                <TableHead className="text-right">Z5</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {EQVET_TARIFF.map((row) => (
                <TableRow key={row.construction}>
                  <TableCell className="text-xs">{row.construction}</TableCell>
                  {(["z1", "z2", "z3", "z4", "z5"] as const).map((z) => (
                    <TableCell key={z} className="text-right">
                      {clickable(row[z], "EQVET")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-xl border p-4">
          <p className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
            Tarif Jaminan Banjir (Flood) ‰
          </p>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Wilayah</TableHead>
                <TableHead>Zona 1</TableHead>
                <TableHead>Zona 2</TableHead>
                <TableHead>Zona 3</TableHead>
                <TableHead>Zona 4</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {FLOOD_TARIFF.map((row) => (
                <TableRow key={row.region}>
                  <TableCell className="text-xs font-medium">
                    {row.region}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-success">
                    {row.z1}
                  </TableCell>
                  <TableCell className="text-xs">{row.z2}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.z3}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.z4}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Zona 3 &amp; 4 menggunakan loading underwriting di atas tarif zona
            sebelumnya.
          </p>
        </div>

        <div className="rounded-xl border p-4">
          <p className="mb-3 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
            Skala BI (Business Interruption)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {BI_SCALE.map((s) => (
              <span
                key={s.months}
                className="rounded-lg bg-muted px-2.5 py-1 text-xs"
              >
                {s.months} bln → <span className="font-semibold">{s.pct}%</span>
              </span>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
