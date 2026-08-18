"use client"

import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { RateLine } from "@/lib/data"
import { money, num } from "@/lib/format"

function RateInput({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <Input
      className="tabular ml-auto h-8 w-24 text-right"
      inputMode="decimal"
      value={value ?? ""}
      placeholder="0"
      onChange={(e) => {
        const raw = e.target.value.replace(",", ".")
        onChange(raw === "" ? null : Number(raw) || 0)
      }}
    />
  )
}

function AmountInput({
  value,
  onChange,
  className,
}: {
  value: number
  onChange: (v: number) => void
  className?: string
}) {
  return (
    <Input
      className={`tabular h-8 text-right ${className ?? ""}`}
      inputMode="numeric"
      value={value ? num(value) : ""}
      placeholder="0"
      onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
    />
  )
}

export function CoverRateTable({
  lines,
  currency,
  unit,
  onRateChange,
}: {
  lines: RateLine[]
  currency: string
  unit: string
  onRateChange: (id: string, rate: number | null) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Cover</TableHead>
          <TableHead className="w-32 text-right">Rate ({unit})</TableHead>
          <TableHead className="w-44 text-right">Premium</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lines.map((l) => (
          <TableRow key={l.id}>
            <TableCell className="text-sm">{l.label}</TableCell>
            <TableCell>
              <RateInput
                value={l.rate}
                onChange={(v) => onRateChange(l.id, v)}
              />
            </TableCell>
            <TableCell className="tabular text-right">
              {money(l.premium, currency)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function LimitRateTable({
  title,
  lines,
  currency,
  totalLabel,
  showCoverColumn,
  onChange,
}: {
  title: string
  lines: RateLine[]
  currency: string
  totalLabel: string
  showCoverColumn?: boolean
  onChange: (lines: RateLine[]) => void
}) {
  const total = lines.reduce((a, l) => a + l.premium, 0)

  function patch(id: string, next: Partial<RateLine>) {
    onChange(lines.map((l) => (l.id === id ? { ...l, ...next } : l)))
  }

  return (
    <div className="rounded-xl border p-4">
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {showCoverColumn ? <TableHead>Cover</TableHead> : null}
            <TableHead>Limit</TableHead>
            <TableHead className="w-28 text-right">Rate (%)</TableHead>
            <TableHead className="w-40 text-right">Premium</TableHead>
            {!showCoverColumn ? <TableHead className="w-10" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((l) => (
            <TableRow key={l.id}>
              {showCoverColumn ? (
                <TableCell className="text-sm whitespace-nowrap">
                  {l.label}
                </TableCell>
              ) : null}
              <TableCell>
                <AmountInput
                  value={Number(l.basis ?? 0)}
                  onChange={(v) => patch(l.id, { basis: String(v) })}
                  className="w-full max-w-40"
                />
              </TableCell>
              <TableCell>
                <RateInput
                  value={l.rate}
                  onChange={(v) => patch(l.id, { rate: v })}
                />
              </TableCell>
              <TableCell className="tabular text-right">
                {money(l.premium, currency)}
              </TableCell>
              {!showCoverColumn ? (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Hapus baris"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => onChange(lines.filter((x) => x.id !== l.id))}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
          <TableRow className="hover:bg-transparent">
            <TableCell
              colSpan={showCoverColumn ? 3 : 3}
              className="font-semibold"
            >
              {totalLabel}
            </TableCell>
            <TableCell className="tabular text-right font-bold">
              {money(total, currency)}
            </TableCell>
            {!showCoverColumn ? <TableCell /> : null}
          </TableRow>
        </TableBody>
      </Table>

      {!showCoverColumn ? (
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() =>
            onChange([
              ...lines,
              {
                id: `tpl-${Date.now()}`,
                label: "Third Party Liability",
                rate: null,
                premium: 0,
                basis: "0",
              },
            ])
          }
        >
          <Plus data-icon="inline-start" />
          Tambah limit
        </Button>
      ) : null}
    </div>
  )
}
