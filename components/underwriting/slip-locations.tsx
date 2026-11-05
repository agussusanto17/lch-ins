"use client"

import { Plus, Trash2 } from "lucide-react"

import { SelectInput } from "@/components/shared/form-fields"
import { LineItemList, TotalBar } from "@/components/underwriting/line-items"
import { OccupationCombobox } from "@/components/underwriting/occupation-combobox"
import {
  OjkReference,
  type RateBounds,
} from "@/components/underwriting/ojk-reference"
import { CoverRateTable } from "@/components/underwriting/rate-tables"
import {
  addLocationPatch,
  locationRowsPatch,
  occupationParts,
  removeLocationPatch,
  updateLocationPatch,
} from "@/components/underwriting/slip-model"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  BI_BASE_LABELS,
  BI_RATE_LABELS,
  biRateBasis,
  rateUnitFor,
  sumItems,
  sumPremium,
} from "@/lib/calc"
import {
  CONSTRUCTION_CLASSES,
  type PlacingSlip,
  type RateException,
  type RateLine,
} from "@/lib/data"
import { money, num } from "@/lib/format"
import { locationGroups, type LocationGroup } from "@/lib/slip-locations"

const CONSTRUCTION_ITEMS = CONSTRUCTION_CLASSES.map((c) => ({
  label: `${c.label} — ${c.description}`,
  value: c.code,
}))

const isEqvet = (line: RateLine) => /eqvet/i.test(line.label)

/**
 * Keterangan baris BI satu lokasi, yang rate-nya dihitung dari baris lain di
 * lokasi itu.
 */
function biRateNote(
  slip: PlacingSlip,
  group: LocationGroup,
  basis: ReturnType<typeof biRateBasis>
) {
  const covered = sumItems(group.section2) > 0
  return (line: RateLine) => {
    const source =
      line.label === BI_RATE_LABELS[0]
        ? {
            text: "jumlah rate FLEXAS, FWTWD, RSMDCC, dan Other Losses",
            labels: BI_BASE_LABELS,
          }
        : line.label === BI_RATE_LABELS[1]
          ? { text: "rate EQVET", labels: ["EQVET"] }
          : null
    if (!source) return null
    const afterLossLimit = group.rateLines.some(
      (l) => source.labels.includes(l.label) && l.lossLimitPct != null
    )
    const scale =
      basis.scalePct !== 100
        ? ` × ${num(basis.scalePct, 0, 1)}% (Indemnity Period ${slip.indemnityPeriod})`
        : ""
    const when = covered
      ? "Otomatis"
      : "Otomatis setelah sum insured Section 2 diisi"
    return `${when}: ${source.text}${afterLossLimit ? " setelah loss limit" : ""}${scale}`
  }
}

/**
 * Daftar lokasi risiko slip Property (Harry, 5 November 2026). Tiap kartu
 * berisi alamat, okupasi, kelas konstruksi, sum insured Section 1 dan 2,
 * referensi tarif OJK, dan rate lokasi itu. Premi tiap lokasi dijumlah per
 * polis PAR dan EQVET.
 */
export function SlipLocations({
  slip,
  lines,
  locked,
  onChange,
  onPickRate,
  onPickIndemnity,
  onExceptionChange,
}: {
  slip: PlacingSlip
  /** Baris rate slip beserta batas OJK-nya (rateLinesWithBounds). */
  lines: RateLine[]
  locked: boolean
  onChange: (patch: Partial<PlacingSlip>) => void
  onPickRate: (
    locationId: string,
    label: string,
    value: number,
    bounds?: RateBounds
  ) => void
  onPickIndemnity: (months: number) => void
  onExceptionChange: (id: string, exception: RateException | null) => void
}) {
  const groups = locationGroups(slip)
  const multi = groups.length > 1
  const setLine = (id: string, patch: Partial<RateLine>) =>
    onChange({
      rateLines: slip.rateLines.map((l) =>
        l.id === id ? { ...l, ...patch } : l
      ),
    })

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => {
        const { location } = g
        const key = `lokasi-${g.no}`
        const update = (patch: Parameters<typeof updateLocationPatch>[2]) =>
          onChange(updateLocationPatch(slip, location.id, patch))
        const md = sumItems(g.section1)
        const bi = sumItems(g.section2)
        const ids = new Set(g.rateLines.map((l) => l.id))
        const locationLines = lines.filter((l) => ids.has(l.id))
        const ojkName = occupationParts(location.occupation).name
        const basis = biRateBasis({
          rateLines: g.rateLines,
          indemnityPeriod: slip.indemnityPeriod,
        })

        return (
          <div
            key={location.id}
            className="flex flex-col gap-4 rounded-xl border p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Lokasi {g.no}</p>
                <p className="text-xs text-muted-foreground">
                  Sum insured {money(md + bi, slip.currency)}
                </p>
              </div>
              {multi && !locked ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    onChange(removeLocationPatch(slip, location.id))
                  }
                >
                  <Trash2 data-icon="inline-start" />
                  Hapus lokasi
                </Button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field className="md:col-span-2">
                <FieldLabel htmlFor={`${key}-risk`}>Risk Location *</FieldLabel>
                <Textarea
                  id={`${key}-risk`}
                  rows={2}
                  value={location.riskLocation}
                  placeholder="Alamat lokasi risiko, sertakan kabupaten atau kota"
                  onChange={(e) => update({ riskLocation: e.target.value })}
                />
              </Field>
              <Field className="md:col-span-2">
                <FieldLabel>Okupasi (OJK) *</FieldLabel>
                <OccupationCombobox
                  value={location.occupation ?? ""}
                  onValueChange={(v) =>
                    update({ occupation: v, occupationLabel: undefined })
                  }
                />
              </Field>
              {/*
               * Nama okupasi OJK bisa sangat panjang (29371 berisi syarat
               * gudang). Seperti override klausul, teks ini hanya untuk
               * dokumen slip ini dan tidak mengubah master okupasi.
               */}
              <Field className="md:col-span-2">
                <FieldLabel htmlFor={`${key}-occupation-label`}>
                  Nama okupasi di slip
                </FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id={`${key}-occupation-label`}
                    value={location.occupationLabel ?? ojkName}
                    disabled={!location.occupation}
                    placeholder={ojkName || "Pilih okupasi OJK dulu"}
                    onChange={(e) => update({ occupationLabel: e.target.value })}
                  />
                  {location.occupationLabel !== undefined ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => update({ occupationLabel: undefined })}
                    >
                      Sesuai OJK
                    </Button>
                  ) : null}
                </div>
                <FieldDescription>
                  {location.occupation
                    ? `Hanya mengubah teks di dokumen slip ini. Kode ${occupationParts(location.occupation).code} tetap tercetak, dan master okupasi tetap sesuai OJK.`
                    : "Bisa diringkas setelah okupasi OJK dipilih."}
                </FieldDescription>
              </Field>
              <SelectInput
                id={`${key}-class`}
                label="Construction Class"
                required
                items={CONSTRUCTION_ITEMS}
                value={location.constructionClass ?? ""}
                onValueChange={(v) => update({ constructionClass: v })}
                placeholder="Pilih kelas konstruksi"
                description="Dipakai menentukan batas tarif FLEXAS okupasi."
              />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Section 1 — Material Damage</p>
              <LineItemList
                items={g.section1}
                onChange={(items) =>
                  onChange(
                    locationRowsPatch(
                      slip,
                      "sumInsuredSection1",
                      location.id,
                      items
                    )
                  )
                }
                descPlaceholder="Deskripsi"
                amountPlaceholder="Nilai"
              />
              <TotalBar
                label="Subtotal Material Damage"
                value={money(md, slip.currency)}
                tone="muted"
              />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                Section 2 — Business Interruption
              </p>
              <LineItemList
                items={g.section2}
                onChange={(items) =>
                  onChange(
                    locationRowsPatch(
                      slip,
                      "sumInsuredSection2",
                      location.id,
                      items
                    )
                  )
                }
                descPlaceholder="Deskripsi"
                amountPlaceholder="Nilai"
              />
              <TotalBar
                label="Subtotal Business Interruption"
                value={money(bi, slip.currency)}
                tone="muted"
              />
            </div>

            {!locked ? (
              <OjkReference
                mode="property"
                occupation={location.occupation}
                riskLocation={location.riskLocation}
                constructionClass={location.constructionClass}
                onConstructionClassChange={(code) =>
                  update({ constructionClass: code })
                }
                sumInsured={md + bi}
                baseRate={basis.par}
                eqRate={basis.eqvet || null}
                onPickRate={(label, value, bounds) =>
                  onPickRate(location.id, label, value, bounds)
                }
                onPickIndemnity={onPickIndemnity}
              />
            ) : null}

            <CoverRateTable
              lines={locationLines}
              currency={slip.currency}
              unit={rateUnitFor(slip.cob)}
              exceptions={slip.rateExceptions}
              readOnly={locked}
              onRateChange={(id, rate) => setLine(id, { rate })}
              onExceptionChange={onExceptionChange}
              onLossLimitChange={(id, lossLimitPct) =>
                setLine(id, { lossLimitPct })
              }
              autoRateNote={biRateNote(slip, g, basis)}
            />
            {multi ? (
              <TotalBar
                label={`Premi lokasi ${g.no}`}
                value={`PAR ${money(sumPremium(g.rateLines.filter((l) => !isEqvet(l))), slip.currency)} · EQVET ${money(sumPremium(g.rateLines.filter(isEqvet)), slip.currency)}`}
                tone="muted"
              />
            ) : null}
          </div>
        )
      })}

      {!locked ? (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(addLocationPatch(slip))}
          >
            <Plus data-icon="inline-start" />
            Tambah lokasi
          </Button>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Rate dalam per mil (‰). Premi = sum insured lokasi × rate × persentase
        loss limit; kosongkan loss limit untuk full value. Baris BI memakai sum
        insured Section 2 lokasi itu, sisanya Section 1. Batas FLEXAS terisi
        otomatis dari okupasi dan kelas konstruksi lokasi.
      </p>

      <TotalBar
        label={multi ? `Total Sum Insured (${groups.length} lokasi)` : "Total Sum Insured"}
        value={money(
          sumItems(slip.sumInsuredSection1) + sumItems(slip.sumInsuredSection2),
          slip.currency
        )}
      />
    </div>
  )
}
