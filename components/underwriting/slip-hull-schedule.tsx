"use client"

import * as React from "react"
import { FileSpreadsheet, Plus, Printer, Trash2 } from "lucide-react"

import { FormDrawer } from "@/components/shared/form-drawer"
import { HullUpload } from "@/components/underwriting/hull-upload"
import { uid } from "@/components/underwriting/slip-model"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { PlacingSlip } from "@/lib/data"
import { money, num } from "@/lib/format"
import {
  EMPTY_YEAR_VALUES,
  HULL_FORMAT_LABELS,
  HULL_SECTION_LABELS,
  HULL_SLIP_SECTIONS,
  emptyVessel,
  hullPolicyYear,
  hullSectionPremium,
  hullSectionRate,
  hullSectionValue,
  hullTotals,
  premiumChangePct,
  vesselPremium,
  type HullSchedule,
  type HullScheduleFormat,
  type HullSection,
  type HullYearValues,
  type Vessel,
} from "@/lib/marine-hull"

const rateText = (rate: number) => `${num(rate, 0, 6)}%`
const amount = (value: number) => num(value, 2)

/** Judul kolom section di tabel: (A) H&M Patria, 1 H&M MHL. */
function sectionHeading(format: HullScheduleFormat, key: HullSection) {
  const section = HULL_SLIP_SECTIONS[format].find((s) => s.key === key)!
  return `${section.code} ${format === "mhl" && key === "iv" ? "IV/AOI" : HULL_SECTION_LABELS[key]}`
}

/**
 * Jadwal kapal slip Marine Hull (Harry, 26 November 2026): nilai dan rate per kapal per section,
 * premi dihitung sistem. Format Patria ringkas, MHL lengkap dengan nilai tahun lalu.
 */
export function SlipHullSchedule({
  slip,
  schedule,
  locked,
  onChange,
  onPrint,
}: {
  slip: PlacingSlip
  schedule: HullSchedule
  locked: boolean
  onChange: (schedule: HullSchedule) => void
  /** Buka dokumen Jadwal Kapal; form menyimpan perubahan dulu bila ada. */
  onPrint: () => void
}) {
  const [editing, setEditing] = React.useState<{ vessel: Vessel; index: number | null } | null>(null)
  const [uploadOpen, setUploadOpen] = React.useState(false)
  const { format, vessels } = schedule
  const sections = HULL_SLIP_SECTIONS[format]
  const currency = slip.currency || "IDR"
  const totals = hullTotals(vessels)
  const policyYear = hullPolicyYear(slip.inceptionDate)
  const hasPrevious = format === "mhl" && vessels.some((v) => v.previous)
  const previous = hasPrevious ? hullTotals(vessels, true) : null
  const change = previous ? premiumChangePct(totals.premium, previous.premium) : null
  const sectionTotal: Record<HullSection, { value: number; premium: number }> = {
    hm: { value: totals.hmValue, premium: totals.hmPremium },
    iv: { value: totals.ivValue + totals.aoiValue, premium: totals.ivPremium },
    war: { value: totals.warValue, premium: totals.warPremium },
  }

  function saveVessel(vessel: Vessel, index: number | null) {
    const next = [...vessels]
    if (index == null) next.push(vessel)
    else next[index] = vessel
    onChange({ format, vessels: next })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Jadwal kapal</p>
          <p className="text-xs text-muted-foreground">
            {format === "patria"
              ? "Format Patria: section (A) H&M, (B) IV/Disbursements, (C) War."
              : "Format MHL: section 1 H&M, 2 War, 3 IV/AOI, dengan data kapal lengkap dan nilai tahun lalu."}{" "}
            Nilai dan premi dalam {currency}.
          </p>
        </div>
        <ToggleGroup
          value={[format]}
          disabled={locked}
          aria-label="Format jadwal kapal"
          onValueChange={(v) => {
            const next = (v as string[])[0] as HullScheduleFormat | undefined
            if (next && next !== format) onChange({ format: next, vessels })
          }}
        >
          {(["patria", "mhl"] as const).map((f) => (
            <ToggleGroupItem key={f} value={f}>
              {HULL_FORMAT_LABELS[f]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">No</TableHead>
              <TableHead>Kapal</TableHead>
              {sections.map((s) => (
                <TableHead key={s.key} className="text-right">
                  {sectionHeading(format, s.key)}
                </TableHead>
              ))}
              <TableHead className="text-right">Premi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vessels.length ? (
              vessels.map((v, i) => {
                const facts = [
                  v.type,
                  v.built && `Built ${v.built}`,
                  v.grt && `GRT ${v.grt}`,
                  v.classSociety,
                  v.flag,
                ]
                  .filter(Boolean)
                  .join(" · ")
                return (
                  <TableRow key={v.id}>
                    <TableCell className="align-top tabular-nums">{i + 1}</TableCell>
                    <TableCell className="min-w-44 align-top">
                      {locked ? (
                        <div className="font-medium">{v.name.trim() || "Nama kapal belum diisi"}</div>
                      ) : (
                        <button
                          type="button"
                          className="text-left font-medium underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                          aria-label={`Ubah ${v.name.trim() || `kapal ${i + 1}`}`}
                          onClick={() => setEditing({ vessel: v, index: i })}
                        >
                          {v.name.trim() || "Nama kapal belum diisi"}
                        </button>
                      )}
                      {facts ? (
                        <div className="max-w-56 text-xs whitespace-normal text-muted-foreground">{facts}</div>
                      ) : null}
                    </TableCell>
                    {sections.map((s) => {
                      const value = hullSectionValue(v, s.key)
                      const rate = hullSectionRate(v, s.key)
                      return (
                        <TableCell key={s.key} className="text-right align-top tabular-nums">
                          {value || rate ? (
                            <>
                              <div>{amount(value)}</div>
                              <div className="text-xs text-muted-foreground">
                                × {rateText(rate)} = {amount(hullSectionPremium(v, s.key))}
                              </div>
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-right align-top font-medium tabular-nums">
                      {amount(vesselPremium(v))}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={sections.length + 3} className="text-center text-muted-foreground">
                  Belum ada kapal. Tambah kapal atau upload jadwal dari Excel.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {vessels.length ? (
            <TableFooter>
              <TableRow>
                <TableCell />
                <TableCell className="font-medium">
                  Total {vessels.length.toLocaleString("id-ID")} kapal
                </TableCell>
                {sections.map((s) => (
                  <TableCell key={s.key} className="text-right align-top tabular-nums">
                    <div>{amount(sectionTotal[s.key].value)}</div>
                    <div className="text-xs text-muted-foreground">
                      premi {amount(sectionTotal[s.key].premium)}
                    </div>
                  </TableCell>
                ))}
                <TableCell className="text-right align-top font-semibold tabular-nums">
                  {amount(totals.premium)}
                </TableCell>
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </div>

      {previous ? (
        <p className="text-xs text-muted-foreground">
          Premi {policyYear - 1}: {money(previous.premium, currency)} · {policyYear}:{" "}
          {money(totals.premium, currency)}
          {change != null ? ` · perubahan ${change >= 0 ? "+" : ""}${num(change * 100, 0, 2)}%` : ""}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {locked ? null : (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing({ vessel: emptyVessel(uid("vessel")), index: null })}
            >
              <Plus data-icon="inline-start" />
              Tambah kapal
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
              <FileSpreadsheet data-icon="inline-start" />
              Upload Excel
            </Button>
          </>
        )}
        <Button type="button" variant="outline" size="sm" disabled={!vessels.length} onClick={onPrint}>
          <Printer data-icon="inline-start" />
          Cetak jadwal kapal
        </Button>
        {locked ? null : (
          <span className="text-xs text-muted-foreground">
            Premi per section = nilai × rate. TSI per kapal = H&amp;M + IV{format === "mhl" ? " + AOI" : ""}; War
            menjamin kapal yang sama, jadi hanya dipakai bila nilainya lebih besar (polis War saja).
          </span>
        )}
      </div>

      {editing ? (
        <VesselDrawer
          key={editing.vessel.id}
          vessel={editing.vessel}
          isNew={editing.index == null}
          format={format}
          currency={currency}
          policyYear={policyYear}
          onClose={() => setEditing(null)}
          onSave={(vessel) => saveVessel(vessel, editing.index)}
          onDelete={
            editing.index == null
              ? undefined
              : () => onChange({ format, vessels: vessels.filter((_, j) => j !== editing.index) })
          }
        />
      ) : null}
      {locked ? null : (
        <HullUpload
          slip={slip}
          schedule={schedule}
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onImport={onChange}
        />
      )}
    </div>
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  required,
  multiline,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  multiline?: boolean
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </FieldLabel>
      {multiline ? (
        <Textarea id={id} rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input id={id} value={value} required={required} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  )
}

/** Nilai dan rate per section untuk satu tahun polis, urutan section mengikuti format. */
function YearValuesFields({
  idPrefix,
  values,
  format,
  currency,
  onChange,
}: {
  idPrefix: string
  values: HullYearValues
  format: HullScheduleFormat
  currency: string
  onChange: (patch: Partial<HullYearValues>) => void
}) {
  const valueKey: Record<HullSection, keyof HullYearValues> = { hm: "hmValue", iv: "ivValue", war: "warValue" }
  const rateKey: Record<HullSection, keyof HullYearValues> = { hm: "hmRate", iv: "ivRate", war: "warRate" }
  return (
    <div className="flex flex-col gap-3">
      {HULL_SLIP_SECTIONS[format].map((s) => {
        const withAoi = format === "mhl" && s.key === "iv"
        return (
          <div key={s.key} className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">
                Section {s.code} {s.title}
              </span>
              <span className="tabular-nums text-muted-foreground">
                premi {money(hullSectionPremium(values, s.key), currency)}
              </span>
            </div>
            <div className={withAoi ? "grid gap-2 sm:grid-cols-3" : "grid gap-2 sm:grid-cols-2"}>
              <Field>
                <FieldLabel htmlFor={`${idPrefix}-${s.key}-value`}>
                  {withAoi ? "IV insured value" : "Insured value"} ({currency})
                </FieldLabel>
                <NumberInput
                  id={`${idPrefix}-${s.key}-value`}
                  value={values[valueKey[s.key]]}
                  onValueChange={(v) => onChange({ [valueKey[s.key]]: v })}
                />
              </Field>
              {withAoi ? (
                <Field>
                  <FieldLabel htmlFor={`${idPrefix}-aoi-value`}>AOI insured value ({currency})</FieldLabel>
                  <NumberInput
                    id={`${idPrefix}-aoi-value`}
                    value={values.aoiValue}
                    onValueChange={(v) => onChange({ aoiValue: v })}
                  />
                </Field>
              ) : null}
              <Field>
                <FieldLabel htmlFor={`${idPrefix}-${s.key}-rate`}>Rate (%)</FieldLabel>
                <NumberInput
                  id={`${idPrefix}-${s.key}-rate`}
                  preset="rate"
                  min={0}
                  max={100}
                  value={values[rateKey[s.key]]}
                  onValueChange={(v) => onChange({ [rateKey[s.key]]: v })}
                />
              </Field>
            </div>
          </div>
        )
      })}
      {format === "mhl" ? (
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-amd`}>AMD, Additional Machinery Deductible ({currency})</FieldLabel>
          <NumberInput id={`${idPrefix}-amd`} value={values.amd} onValueChange={(v) => onChange({ amd: v })} />
        </Field>
      ) : null}
    </div>
  )
}

/** Isian satu kapal. Kolom MHL (IMO, NRT, owner, nilai tahun lalu, dst.) hanya tampil di format MHL. */
function VesselDrawer({
  vessel,
  isNew,
  format,
  currency,
  policyYear,
  onClose,
  onSave,
  onDelete,
}: {
  vessel: Vessel
  isNew: boolean
  format: HullScheduleFormat
  currency: string
  policyYear: number
  onClose: () => void
  onSave: (vessel: Vessel) => void
  /** Hapus kapal yang sedang diubah; kosong untuk kapal baru. */
  onDelete?: () => void
}) {
  const [draft, setDraft] = React.useState(vessel)
  const [error, setError] = React.useState<string | null>(null)
  const set = (patch: Partial<Vessel>) => setDraft((d) => ({ ...d, ...patch }))
  const mhl = format === "mhl"
  const text = (key: "name" | "type" | "imo" | "built" | "grt" | "nrt" | "dwt" | "bhp" | "classSociety" | "flag" | "dimensions" | "cover" | "owner" | "managers" | "mortgagees") => ({
    id: `vessel-${key}`,
    value: draft[key],
    onChange: (value: string) => set({ [key]: value }),
  })

  return (
    <FormDrawer
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={isNew ? "Tambah Kapal" : `Ubah ${vessel.name || "Kapal"}`}
      description={`Premi kapal ini ${money(vesselPremium(draft), currency)}. Tersimpan saat slip disimpan.`}
      submitLabel={isNew ? "Tambahkan" : "Simpan"}
      onSubmit={() => {
        if (!draft.name.trim()) {
          setError("Isi nama kapal.")
          return false
        }
        onSave(draft)
        onClose()
      }}
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField label="Vessel" required {...text("name")} />
            {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
          </div>
          <TextField label="Type" {...text("type")} />
          {mhl ? <TextField label="IMO number" {...text("imo")} /> : null}
          <TextField label="Built" {...text("built")} />
          <TextField label="GRT" {...text("grt")} />
          {mhl ? (
            <>
              <TextField label="NRT" {...text("nrt")} />
              <TextField label="DWT" {...text("dwt")} />
              <TextField label="BHP" {...text("bhp")} />
            </>
          ) : null}
          <TextField label="Class" {...text("classSociety")} />
          <TextField label="Flag" {...text("flag")} />
          {mhl ? (
            <>
              <TextField label="Dimensions" {...text("dimensions")} />
              <TextField label="Cover" {...text("cover")} />
            </>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Nilai dan rate {mhl ? policyYear : ""}</p>
          <YearValuesFields
            idPrefix="vessel-current"
            values={draft}
            format={format}
            currency={currency}
            onChange={(patch) => set(patch)}
          />
        </div>

        {mhl ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="vessel-deductible">Deductible Clause 12 ({currency})</FieldLabel>
                <NumberInput
                  id="vessel-deductible"
                  value={draft.deductible}
                  onValueChange={(v) => set({ deductible: v })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="vessel-ga">General Average ({currency})</FieldLabel>
                <NumberInput
                  id="vessel-ga"
                  value={draft.generalAverage}
                  onValueChange={(v) => set({ generalAverage: v })}
                />
              </Field>
            </div>

            <div className="flex flex-col gap-3">
              <Field orientation="horizontal">
                <Switch
                  id="vessel-previous"
                  checked={draft.previous != null}
                  onCheckedChange={(on) => set({ previous: on ? { ...EMPTY_YEAR_VALUES } : null })}
                />
                <FieldLabel htmlFor="vessel-previous" className="font-normal">
                  Isi nilai tahun lalu ({policyYear - 1}) untuk perbandingan renewal
                </FieldLabel>
              </Field>
              {draft.previous ? (
                <YearValuesFields
                  idPrefix="vessel-previous"
                  values={draft.previous}
                  format={format}
                  currency={currency}
                  onChange={(patch) => set({ previous: { ...draft.previous!, ...patch } })}
                />
              ) : null}
            </div>

            <div className="flex flex-col gap-3">
              <TextField label="Owner" multiline {...text("owner")} />
              <TextField label="Managers" multiline {...text("managers")} />
              <TextField label="Mortgagees" multiline {...text("mortgagees")} />
              <FieldDescription>Owner, managers, dan mortgagees dicetak di jadwal format MHL.</FieldDescription>
            </div>
          </>
        ) : null}

        {onDelete ? (
          <div className="border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                onDelete()
                onClose()
              }}
            >
              <Trash2 data-icon="inline-start" />
              Hapus kapal dari jadwal
            </Button>
          </div>
        ) : null}
      </div>
    </FormDrawer>
  )
}
