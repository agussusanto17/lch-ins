"use client"

import * as React from "react"
import { FileSpreadsheet, Plus, Trash2 } from "lucide-react"

import { SelectInput } from "@/components/shared/form-fields"
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
import { LineItemList, TotalBar } from "@/components/underwriting/line-items"
import { OccupationCombobox } from "@/components/underwriting/occupation-combobox"
import {
  OjkReference,
  type RateBounds,
} from "@/components/underwriting/ojk-reference"
import { LocationUpload } from "@/components/underwriting/location-upload"
import { CoverRateTable } from "@/components/underwriting/rate-tables"
import {
  addLocationPatch,
  copyFirstOccupationPatch,
  floatingDropsLocationData,
  floatingSumInsuredPatch,
  isOutOfBounds,
  locationRowsPatch,
  occupationParts,
  removeLocationPatch,
  updateLocationPatch,
} from "@/components/underwriting/slip-model"
import { UnitCard } from "@/components/underwriting/unit-card"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  BI_BASE_LABELS,
  BI_RATE_LABELS,
  biRateBasis,
  rateUnitFor,
  sumItems,
  sumPremium,
  totalSumInsured,
} from "@/lib/calc"
import {
  CONSTRUCTION_CLASSES,
  constructionClassLabel,
  type PlacingSlip,
  type RateException,
  type RateLine,
} from "@/lib/data"
import { money, num } from "@/lib/format"
import {
  isFloatingSumInsured,
  locationGroups,
  needsConstructionClass,
  oneLineAddress,
  type LocationGroup,
} from "@/lib/slip-locations"

const CONSTRUCTION_ITEMS = CONSTRUCTION_CLASSES.map((c) => ({
  label: `${c.label} — ${c.description}`,
  value: c.code,
}))

const isEqvet = (line: RateLine) => /eqvet/i.test(line.label)

/** Keterangan baris BI satu lokasi, yang rate-nya dihitung dari baris lain di lokasi itu. */
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
 * Daftar lokasi risiko slip Property (Harry, 5 November 2026).
 * Premi tiap lokasi dijumlah per polis PAR dan EQVET. Slip floating mengisi sum insured, rate,
 * dan deductible sekali untuk semua lokasi (MoM review Phase 1, poin 5).
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
  /** Lokasi kosong berarti baris rate bersama slip floating. */
  onPickRate: (
    locationId: string | undefined,
    label: string,
    value: number,
    bounds?: RateBounds
  ) => void
  onPickIndemnity: (months: number) => void
  onExceptionChange: (id: string, exception: RateException | null) => void
}) {
  const groups = locationGroups(slip)
  const multi = groups.length > 1
  const floating = isFloatingSumInsured(slip)
  // Slip floating: semua sum insured dan rate menempel di lokasi pertama.
  const shared = groups[0]
  const first = shared.location
  const setLine = (id: string, patch: Partial<RateLine>) =>
    onChange({
      rateLines: slip.rateLines.map((l) =>
        l.id === id ? { ...l, ...patch } : l
      ),
    })

  // Kartu terbuka dicatat per urutan, bukan per id, karena id lokasi berganti setiap disimpan.
  // Slip multi lokasi mulai terlipat; lokasi yang baru ditambah langsung terbuka.
  const [startOpen, setStartOpen] = React.useState(() => groups.length <= 1)
  const [openAt, setOpenAt] = React.useState<Record<number, boolean>>({})
  const isOpen = (index: number) => openAt[index] ?? startOpen
  const allOpen = groups.every((_, i) => isOpen(i))
  const [confirmFloating, setConfirmFloating] = React.useState(false)
  const [uploadOpen, setUploadOpen] = React.useState(false)

  function addLocation() {
    setOpenAt((o) => ({ ...o, [groups.length]: true }))
    onChange(addLocationPatch(slip))
  }

  function removeLocation(index: number, locationId: string) {
    setOpenAt((o) =>
      Object.fromEntries(
        Object.entries(o)
          .filter(([i]) => Number(i) !== index)
          .map(([i, v]) => [Number(i) > index ? Number(i) - 1 : Number(i), v])
      )
    )
    onChange(removeLocationPatch(slip, locationId))
  }

  function setFloating(on: boolean) {
    if (on && floatingDropsLocationData(slip)) setConfirmFloating(true)
    else onChange(floatingSumInsuredPatch(slip, on))
  }

  /** Sum insured Section 1 dan 2 satu lokasi, atau seluruh lokasi slip floating. */
  const sumInsuredLists = (g: LocationGroup) => (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Section 1 — Material Damage</p>
        <LineItemList
          items={g.section1}
          onChange={(items) =>
            onChange(
              locationRowsPatch(slip, "sumInsuredSection1", g.location.id, items)
            )
          }
          descPlaceholder="Deskripsi"
          amountPlaceholder="Nilai"
        />
        <TotalBar
          label="Subtotal Material Damage"
          value={money(sumItems(g.section1), slip.currency)}
          tone="muted"
        />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Section 2 — Business Interruption</p>
        <LineItemList
          items={g.section2}
          onChange={(items) =>
            onChange(
              locationRowsPatch(slip, "sumInsuredSection2", g.location.id, items)
            )
          }
          descPlaceholder="Deskripsi"
          amountPlaceholder="Nilai"
        />
        <TotalBar
          label="Subtotal Business Interruption"
          value={money(sumItems(g.section2), slip.currency)}
          tone="muted"
        />
      </div>
    </>
  )

  const rateBasis = (g: LocationGroup) =>
    biRateBasis({ rateLines: g.rateLines, indemnityPeriod: slip.indemnityPeriod })

  /** Tabel rate baris milik satu lokasi, atau baris bersama slip floating. */
  const rateTable = (g: LocationGroup) => {
    const ids = new Set(g.rateLines.map((l) => l.id))
    return (
      <CoverRateTable
        lines={lines.filter((l) => ids.has(l.id))}
        currency={slip.currency}
        unit={rateUnitFor(slip.cob)}
        exceptions={slip.rateExceptions}
        readOnly={locked}
        onRateChange={(id, rate) => setLine(id, { rate })}
        onExceptionChange={onExceptionChange}
        onLossLimitChange={(id, lossLimitPct) => setLine(id, { lossLimitPct })}
        autoRateNote={biRateNote(slip, g, rateBasis(g))}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Field orientation="horizontal">
        <Switch
          id="floating-sum-insured"
          checked={floating}
          disabled={locked}
          onCheckedChange={setFloating}
        />
        <FieldContent>
          <FieldLabel htmlFor="floating-sum-insured" className="font-normal">
            Floating Sum Insured
          </FieldLabel>
          <FieldDescription>
            {floating
              ? "Sum insured, rate, dan deductible diisi sekali untuk semua lokasi. Tiap lokasi cukup diisi alamat, okupasi, dan kelas konstruksi."
              : "Nyalakan bila satu sum insured berlaku untuk semua lokasi, misalnya stok yang berpindah antar gudang."}
          </FieldDescription>
        </FieldContent>
      </Field>
      {floating ? (
        <Field>
          <FieldLabel htmlFor="floating-sum-insured-text">
            Keterangan Total Sum Insured
          </FieldLabel>
          <Input
            id="floating-sum-insured-text"
            maxLength={100}
            value={slip.floatingSumInsuredText ?? ""}
            disabled={locked}
            placeholder="On Floating Stock"
            onChange={(e) => onChange({ floatingSumInsuredText: e.target.value })}
          />
          <FieldDescription>
            Dicetak sebelum nilainya, misalnya On Floating Stock –{" "}
            {money(12_000_000_000, slip.currency)}. Kosongkan bila cukup nilainya.
          </FieldDescription>
        </Field>
      ) : null}

      {multi ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/*
           * Lokasi satu slip sering berokupasi sama, misalnya lima unit
           * apartemen (CI SISKA RAHARJA): cukup isi lokasi 1 lalu samakan.
           */}
          {!locked && first.occupation ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange(copyFirstOccupationPatch(slip))}
            >
              Samakan okupasi & kelas dengan Lokasi 1
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setOpenAt(Object.fromEntries(groups.map((_, i) => [i, !allOpen])))
            }
          >
            {allOpen ? "Tutup semua lokasi" : "Buka semua lokasi"}
          </Button>
        </div>
      ) : null}
      {groups.map((g, index) => {
        const { location } = g
        const key = `lokasi-${g.no}`
        const update = (patch: Parameters<typeof updateLocationPatch>[2]) =>
          onChange(updateLocationPatch(slip, location.id, patch))
        const md = sumItems(g.section1)
        const bi = sumItems(g.section2)
        const ids = new Set(g.rateLines.map((l) => l.id))
        const ojkName = occupationParts(location.occupation).name
        // Panel tarif OJK slip floating mengisi baris rate bersama dari lokasi mana pun.
        const basis = rateBasis(floating ? shared : g)
        const incomplete =
          !location.riskLocation.trim() ||
          !location.occupation ||
          !location.constructionClass ||
          (!floating && md + bi <= 0)
        const unresolved = floating
          ? 0
          : lines.filter(
              (l) => ids.has(l.id) && isOutOfBounds(l) && !slip.rateExceptions?.[l.id]
            ).length
        const facts = [
          occupationParts(location.occupation).code,
          location.constructionClass
            ? constructionClassLabel(location.constructionClass)
            : "",
          ...(floating
            ? []
            : [
                `Sum insured ${money(md + bi, slip.currency)}`,
                `Premi ${money(sumPremium(g.rateLines), slip.currency)}`,
              ]),
        ].filter(Boolean)

        return (
          <UnitCard
            key={location.id}
            title={`Lokasi ${g.no}`}
            open={isOpen(index)}
            onOpenChange={(open) => setOpenAt((o) => ({ ...o, [index]: open }))}
            status={
              <>
                {incomplete ? (
                  <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                    Belum lengkap
                  </span>
                ) : null}
                {unresolved ? (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    {unresolved} rate butuh alasan
                  </span>
                ) : null}
              </>
            }
            summary={
              <>
                {location.insuredName?.trim() ? (
                  <span className="block truncate font-medium text-foreground">
                    {location.insuredName.trim()}
                  </span>
                ) : null}
                <span className="block truncate">
                  {oneLineAddress(location.riskLocation) || "Alamat belum diisi"}
                </span>
                {facts.length ? (
                  <span className="block">{facts.join(" · ")}</span>
                ) : null}
              </>
            }
            action={
              multi && !locked ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeLocation(index, location.id)}
                >
                  <Trash2 data-icon="inline-start" />
                  Hapus lokasi
                </Button>
              ) : null
            }
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Tertanggung per lokasi seperti lampiran polis SPIL (MoM review Phase 1, poin 6). */}
              <Field className="md:col-span-2">
                <FieldLabel htmlFor={`${key}-insured`}>Nama Tertanggung</FieldLabel>
                <Input
                  id={`${key}-insured`}
                  maxLength={500}
                  value={location.insuredName ?? ""}
                  placeholder={slip.insuredName.trim() || "Sama dengan tertanggung slip"}
                  onChange={(e) => update({ insuredName: e.target.value || undefined })}
                />
                <FieldDescription>
                  Isi bila tertanggung lokasi ini berbeda, misalnya PT A QQ B. Kosong berarti sama
                  dengan tertanggung slip.
                </FieldDescription>
              </Field>
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
               * Nama okupasi OJK bisa sangat panjang. Seperti override klausul, teks ini
               * hanya untuk slip ini dan tidak mengubah master okupasi.
               */}
              <Field className="md:col-span-2">
                <FieldLabel htmlFor={`${key}-occupation-label`}>
                  Nama okupasi di slip
                </FieldLabel>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <Textarea
                    id={`${key}-occupation-label`}
                    rows={2}
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
                required={needsConstructionClass(floating ? slip.rateLines : g.rateLines)}
                items={CONSTRUCTION_ITEMS}
                value={location.constructionClass ?? ""}
                onValueChange={(v) => update({ constructionClass: v })}
                placeholder="Pilih kelas konstruksi"
                description="Dipakai menentukan batas tarif FLEXAS dan EQVET. Wajib bila rate FLEXAS atau EQVET diisi; boleh kosong untuk slip tanpa keduanya, misalnya Terrorism & Sabotage."
              />
            </div>

            {floating ? null : sumInsuredLists(g)}

            {!locked ? (
              <OjkReference
                mode="property"
                occupation={location.occupation}
                riskLocation={location.riskLocation}
                constructionClass={location.constructionClass}
                onConstructionClassChange={(code) =>
                  update({ constructionClass: code })
                }
                sumInsured={floating ? totalSumInsured(slip) : md + bi}
                baseRate={basis.par}
                eqRate={basis.eqvet || null}
                onPickRate={(label, value, bounds) =>
                  onPickRate(floating ? undefined : location.id, label, value, bounds)
                }
                onPickIndemnity={onPickIndemnity}
              />
            ) : null}

            {floating ? null : rateTable(g)}
            {multi && !floating ? (
              <TotalBar
                label={`Premi lokasi ${g.no}`}
                value={`PAR ${money(sumPremium(g.rateLines.filter((l) => !isEqvet(l))), slip.currency)} · EQVET ${money(sumPremium(g.rateLines.filter(isEqvet)), slip.currency)}`}
                tone="muted"
              />
            ) : null}
          </UnitCard>
        )
      })}

      {!locked ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLocation}
          >
            <Plus data-icon="inline-start" />
            Tambah lokasi
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setUploadOpen(true)}
          >
            <FileSpreadsheet data-icon="inline-start" />
            Upload Excel
          </Button>
        </div>
      ) : null}

      {floating ? (
        <div className="flex flex-col gap-4 rounded-xl border p-4">
          <div>
            <p className="text-sm font-medium">Sum insured & rate semua lokasi</p>
            <p className="text-xs text-muted-foreground">
              Berlaku untuk {groups.length} lokasi di atas. Premi dihitung sekali dari
              total sum insured.
            </p>
          </div>
          {sumInsuredLists(shared)}
          {rateTable(shared)}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {floating
          ? "Rate dalam per mil (‰). Premi = total sum insured × rate × persentase loss limit; kosongkan loss limit untuk full value. Baris BI memakai sum insured Section 2, sisanya Section 1. Batas FLEXAS mengikuti lokasi dengan batas bawah tertinggi."
          : "Rate dalam per mil (‰). Premi = sum insured lokasi × rate × persentase loss limit; kosongkan loss limit untuk full value. Baris BI memakai sum insured Section 2 lokasi itu, sisanya Section 1. Batas FLEXAS terisi otomatis dari okupasi dan kelas konstruksi lokasi."}
      </p>

      <TotalBar
        label={
          floating
            ? `Total Sum Insured (floating, ${groups.length} lokasi)`
            : multi
              ? `Total Sum Insured (${groups.length} lokasi)`
              : "Total Sum Insured"
        }
        value={money(totalSumInsured(slip), slip.currency)}
      />

      {!locked ? (
        <LocationUpload
          slip={slip}
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onImport={(patch) => {
            // Puluhan lokasi dari Excel ditampilkan terlipat.
            setStartOpen(false)
            setOpenAt({})
            onChange(patch)
          }}
        />
      ) : null}

      <AlertDialog open={confirmFloating} onOpenChange={setConfirmFloating}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pakai floating sum insured?</AlertDialogTitle>
            <AlertDialogDescription>
              Rate, loss limit, dan deductible Lokasi 1 berlaku untuk semua lokasi.
              Isian rate dan deductible lokasi lain dihapus. Sum insured semua lokasi
              digabung ke satu daftar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onChange(floatingSumInsuredPatch(slip, true))
                setConfirmFloating(false)
              }}
            >
              Pakai floating
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
