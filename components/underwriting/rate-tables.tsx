"use client"

import * as React from "react"
import { AlertTriangle, MessageSquareText, Plus, Trash2 } from "lucide-react"

import { SelectInput, TextField } from "@/components/shared/form-fields"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NumberInput } from "@/components/ui/number-input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  RATE_EXCEPTION_REASONS,
  type RateException,
  type RateExceptionReason,
  type RateLine,
} from "@/lib/data"
import { money, num } from "@/lib/format"
import { cn } from "@/lib/utils"

import { isOutOfBounds } from "./slip-model"

function boundsLabel(line: RateLine) {
  if (line.min == null && line.max == null) return "—"
  if (line.min === line.max) return num(line.min ?? 0, 3)
  return `${num(line.min ?? 0, 3)} – ${num(line.max ?? 0, 3)}`
}

/**
 * Dialog alasan rate di luar batas OJK. Rate boleh di bawah batas bawah bila
 * ada potongan sesuai nilai pertanggungan, dan di atas batas atas bila ada
 * perluasan jaminan (SE OJK 6/2017), dengan alasan yang dicatat.
 */
function RateExceptionDialog({
  line,
  value,
  onSave,
  onClose,
}: {
  line: RateLine
  value?: RateException
  onSave: (exception: RateException | null) => void
  onClose: () => void
}) {
  const below = line.rate != null && line.min != null && line.rate < line.min
  const [reason, setReason] = React.useState<RateExceptionReason>(
    value?.reason ??
      (below ? RATE_EXCEPTION_REASONS[0] : RATE_EXCEPTION_REASONS[1])
  )
  const [note, setNote] = React.useState(value?.note ?? "")
  const [error, setError] = React.useState<string>()

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alasan rate di luar batas OJK</DialogTitle>
          <DialogDescription>
            {line.label}: rate {num(line.rate ?? 0, 3)}, batas{" "}
            {boundsLabel(line)}
            {line.boundSource ? ` (${line.boundSource})` : ""}.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            if (!note.trim()) {
              setError(
                "Jelaskan dasar pengecualian, misalnya nilai potongan atau perluasan yang diberikan"
              )
              return
            }
            onSave({ reason, note: note.trim() })
          }}
        >
          <SelectInput
            label="Dasar pengecualian"
            required
            items={RATE_EXCEPTION_REASONS}
            value={reason}
            onValueChange={(v) => setReason(v as RateExceptionReason)}
          />
          <TextField
            label="Keterangan"
            required
            multiline
            rows={3}
            value={note}
            onChange={setNote}
            placeholder="Contoh: potongan 10% karena TSI di atas IDR 100 miliar, disetujui underwriter asuransi"
            error={error}
          />
          <DialogFooter>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                className="mr-auto text-destructive"
                onClick={() => onSave(null)}
              >
                Hapus alasan
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit">Simpan alasan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CoverRateTable({
  lines,
  currency,
  unit,
  exceptions,
  onRateChange,
  onExceptionChange,
  readOnly,
}: {
  /** Baris rate yang sudah dilengkapi batas OJK (lihat rateLinesWithBounds). */
  lines: RateLine[]
  currency: string
  unit: string
  exceptions?: Record<string, RateException>
  onRateChange: (id: string, rate: number | null) => void
  onExceptionChange: (id: string, exception: RateException | null) => void
  readOnly?: boolean
}) {
  const [editing, setEditing] = React.useState<string | null>(null)
  const editingLine = lines.find((l) => l.id === editing)

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Cover</TableHead>
            <TableHead className="w-40 text-right">Batas OJK</TableHead>
            <TableHead className="w-32 text-right">Rate ({unit})</TableHead>
            <TableHead className="w-44 text-right">Premium</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((l) => {
            const out = isOutOfBounds(l)
            const exception = exceptions?.[l.id]
            return (
              <TableRow key={l.id}>
                <TableCell className="text-sm">
                  {l.label}
                  {out ? (
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                      <span
                        className={cn(
                          "flex items-center gap-1",
                          exception ? "text-warning" : "text-destructive"
                        )}
                      >
                        <AlertTriangle className="size-3" />
                        {l.rate != null && l.min != null && l.rate < l.min
                          ? "Di bawah batas OJK"
                          : "Di atas batas OJK"}
                        {exception
                          ? ` · ${exception.reason}`
                          : " · alasan wajib diisi"}
                      </span>
                      {!readOnly ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
                          onClick={() => setEditing(l.id)}
                        >
                          <MessageSquareText className="size-3" />
                          {exception ? "Ubah alasan" : "Isi alasan"}
                        </button>
                      ) : null}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell
                  className="tabular text-right text-xs text-muted-foreground"
                  title={l.boundSource}
                >
                  {boundsLabel(l)}
                </TableCell>
                <TableCell>
                  <NumberInput
                    preset="rate"
                    className="ml-auto h-8 w-24"
                    aria-label={`Rate ${l.label}`}
                    value={l.rate}
                    invalid={out && !exception}
                    readOnly={readOnly}
                    onValueChange={(v) => onRateChange(l.id, v)}
                  />
                </TableCell>
                <TableCell className="tabular text-right">
                  {money(l.premium, currency)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {editingLine ? (
        <RateExceptionDialog
          key={editingLine.id}
          line={editingLine}
          value={exceptions?.[editingLine.id]}
          onClose={() => setEditing(null)}
          onSave={(exception) => {
            onExceptionChange(editingLine.id, exception)
            setEditing(null)
          }}
        />
      ) : null}
    </>
  )
}

export function LimitRateTable({
  title,
  lines,
  currency,
  totalLabel,
  showCoverColumn,
  onChange,
  readOnly,
}: {
  title: string
  lines: RateLine[]
  currency: string
  totalLabel: string
  showCoverColumn?: boolean
  onChange: (lines: RateLine[]) => void
  readOnly?: boolean
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
                <NumberInput
                  preset="money"
                  className="h-8 w-full max-w-40"
                  aria-label={`Limit ${l.label}`}
                  value={Number(l.basis ?? 0) || null}
                  readOnly={readOnly}
                  onValueChange={(v) => patch(l.id, { basis: String(v ?? 0) })}
                />
              </TableCell>
              <TableCell>
                <NumberInput
                  preset="rate"
                  className="ml-auto h-8 w-24"
                  aria-label={`Rate ${l.label}`}
                  value={l.rate}
                  readOnly={readOnly}
                  onValueChange={(v) => patch(l.id, { rate: v })}
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
                    disabled={readOnly}
                    onClick={() => onChange(lines.filter((x) => x.id !== l.id))}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={3} className="font-semibold">
              {totalLabel}
            </TableCell>
            <TableCell className="tabular text-right font-bold">
              {money(total, currency)}
            </TableCell>
            {!showCoverColumn ? <TableCell /> : null}
          </TableRow>
        </TableBody>
      </Table>

      {!showCoverColumn && !readOnly ? (
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
