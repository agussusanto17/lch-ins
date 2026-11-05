"use client"

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { SlipDetailRow } from "@/lib/data/types"
import { DETAIL_LIMITS, missingDetailLabels } from "@/lib/slip-details"

/**
 * Detail tambahan slip: baris "label : isi" yang dicetak di tabel detail
 * dokumen, misalnya Retroactive Date (Liability), Voyage (Marine Cargo), atau
 * Vessels (Marine Hull). Label bawaan datang dari type of cover di Master
 * Data; label lain boleh diketik sendiri.
 */
export function SlipDetailRows({
  rows,
  defaults,
  suggestions,
  locked,
  onChange,
}: {
  rows: SlipDetailRow[]
  /** Label bawaan type of cover slip. */
  defaults: string[]
  /** Label bawaan semua type of cover, sebagai saran saat mengetik label. */
  suggestions: string[]
  locked?: boolean
  onChange: (rows: SlipDetailRow[]) => void
}) {
  const missing = missingDetailLabels(rows, defaults)
  const full = rows.length >= DETAIL_LIMITS.rows

  const update = (index: number, patch: Partial<SlipDetailRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  const move = (index: number, by: -1 | 1) => {
    const next = [...rows]
    const [row] = next.splice(index, 1)
    next.splice(index + by, 0, row)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Dicetak di tabel detail dokumen setelah baris bawaan, sesuai urutan di
        sini. Baris tanpa isi tidak dicetak.
      </p>

      {rows.length ? (
        <div className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto] md:items-start"
            >
              <Input
                id={`detail-label-${index}`}
                aria-label={`Label baris ${index + 1}`}
                value={row.label}
                list="detail-label-options"
                maxLength={DETAIL_LIMITS.label}
                placeholder="Label, misalnya Jurisdiction"
                disabled={locked}
                onChange={(e) => update(index, { label: e.target.value })}
              />
              <Textarea
                id={`detail-value-${index}`}
                aria-label={`Isi ${row.label.trim() || `baris ${index + 1}`}`}
                rows={1}
                value={row.value}
                maxLength={DETAIL_LIMITS.value}
                placeholder="Isi"
                disabled={locked}
                onChange={(e) => update(index, { value: e.target.value })}
              />
              {locked ? null : (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Naikkan baris ${index + 1}`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Turunkan baris ${index + 1}`}
                    disabled={index === rows.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus baris ${index + 1}`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => onChange(rows.filter((_, i) => i !== index))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Belum ada detail tambahan. Pilih type of cover yang punya label
          bawaan di Master Data, atau tambah baris sendiri.
        </p>
      )}

      <datalist id="detail-label-options">
        {suggestions.map((label) => (
          <option key={label} value={label} />
        ))}
      </datalist>

      {locked ? null : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={full}
            onClick={() => onChange([...rows, { label: "", value: "" }])}
          >
            <Plus data-icon="inline-start" />
            Tambah baris
          </Button>
          {missing.length ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={full}
              onClick={() =>
                onChange(
                  [...rows, ...missing.map((label) => ({ label, value: "" }))].slice(
                    0,
                    DETAIL_LIMITS.rows
                  )
                )
              }
            >
              Tambah label bawaan ({missing.length})
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}
