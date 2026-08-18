"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Save, Send, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/layout/page-header"
import { SectionCard } from "@/components/shared/section-card"
import {
  SlipFormActions,
  SlipFormBody,
  SlipFormToolbar,
} from "@/components/underwriting/slip-form-chrome"
import { ClausePicker } from "@/components/underwriting/clause-picker"
import {
  LineItemList,
  StringList,
  TotalBar,
} from "@/components/underwriting/line-items"
import { OccupationCombobox } from "@/components/underwriting/occupation-combobox"
import { OjkReference } from "@/components/underwriting/ojk-reference"
import {
  CoverRateTable,
  LimitRateTable,
} from "@/components/underwriting/rate-tables"
import {
  coverCodeFor,
  recalc,
  switchCob,
  usesPropertyBlocks,
  usesSectionSumInsured,
} from "@/components/underwriting/slip-model"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  brokerageAmount,
  discountAmount,
  effectiveBrokeragePct,
  sumItems,
  totalPremium,
  totalSumInsured,
} from "@/lib/calc"
import {
  CLASSES_OF_BUSINESS,
  CURRENCIES,
  TYPE_OF_COVER,
  WORDING_FORMS,
  type ClassOfBusiness,
  type PlacingSlip,
} from "@/lib/data"
import { money, num, percent, romanMonth } from "@/lib/format"

const SECTION_KEYS = [
  "basic",
  "wording",
  "coverage",
  "interest",
  "sumInsured",
  "deductible",
  "rate",
  "brokerage",
] as const
type SectionKey = (typeof SECTION_KEYS)[number]

const COB_ITEMS = CLASSES_OF_BUSINESS.map((c) => ({ label: c, value: c }))
const CURRENCY_ITEMS = CURRENCIES.map((c) => ({ label: c, value: c }))

export function PlacingSlipForm({
  initial,
  mode,
}: {
  initial: PlacingSlip
  mode: "new" | "edit"
}) {
  const router = useRouter()
  const [slip, setSlip] = React.useState<PlacingSlip>(() => recalc(initial))

  const set = React.useCallback((patch: Partial<PlacingSlip>) => {
    setSlip((s) => recalc({ ...s, ...patch }))
  }, [])

  const [openSections, setOpenSections] = React.useState<
    Record<string, boolean>
  >(() => Object.fromEntries(SECTION_KEYS.map((k) => [k, true])))
  const allOpen = SECTION_KEYS.every((k) => openSections[k])

  const sectionProps = (key: SectionKey) => ({
    collapsible: true as const,
    open: openSections[key],
    onOpenChange: (v: boolean) => setOpenSections((o) => ({ ...o, [key]: v })),
  })

  const isProperty = slip.cob === "Property"
  const isMotor = slip.cob === "Motor Vehicle"
  const coverItems = (TYPE_OF_COVER[slip.cob] ?? []).map((t) => ({
    label: t.label,
    value: t.label,
  }))

  const md = sumItems(slip.sumInsuredSection1)
  const bi = sumItems(slip.sumInsuredSection2)
  const tsi = totalSumInsured(slip)
  const premium = totalPremium(slip)
  const discount = discountAmount(slip)
  const payable = premium - discount + slip.adminCost + slip.stampDuty

  function handleRelease() {
    const now = new Date()
    const code = coverCodeFor(slip.cob, slip.typeOfCover)
    const nextSeq = 6
    const no = `${String(nextSeq).padStart(3, "0")}/LCH-PLCMT/${code ? `PS-${code}` : "PS"}/${romanMonth(now.getMonth())}/${now.getFullYear()}`
    set({ status: "Released", slipNo: no, seq: nextSeq })
    toast.success("Slip di-release", {
      description: `No. slip ${no} berhasil digenerate.`,
    })
  }

  return (
    <PageShell className="gap-0 p-0">
      <SlipFormToolbar
        title={mode === "new" ? "Buat Placing Slip Baru" : "Edit Placing Slip"}
        subtitle={`${slip.cob}${slip.typeOfCover ? ` · ${slip.typeOfCover}` : ""}`}
        status={slip.status}
        slipNo={slip.slipNo}
        backHref="/underwriting"
        allOpen={allOpen}
        onToggleAll={() =>
          setOpenSections(
            Object.fromEntries(SECTION_KEYS.map((k) => [k, !allOpen]))
          )
        }
        meta={
          <>
            Total Sum Insured{" "}
            <span className="tabular font-semibold text-foreground">
              {money(tsi, slip.currency)}
            </span>
          </>
        }
      />

      <SlipFormBody>
        {/* ---------- Informasi Dasar ---------- */}
        <SectionCard
          title="Informasi Dasar"
          {...sectionProps("basic")}
          summary={slip.insuredName || "Belum ada tertanggung"}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Class of Business *</FieldLabel>
              <Select
                items={COB_ITEMS}
                value={slip.cob}
                onValueChange={(v) =>
                  setSlip((s) => switchCob(s, v as ClassOfBusiness))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {COB_ITEMS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Currency</FieldLabel>
              <Select
                items={CURRENCY_ITEMS}
                value={slip.currency}
                onValueChange={(v) => set({ currency: v as string })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {CURRENCY_ITEMS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel>Type of Cover *</FieldLabel>
              <Select
                items={[
                  { label: "Pilih type of cover…", value: null },
                  ...coverItems,
                ]}
                value={slip.typeOfCover || null}
                onValueChange={(v) =>
                  set({
                    typeOfCover: (v as string) ?? "",
                    coverCode: coverCodeFor(slip.cob, (v as string) ?? ""),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {coverItems.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel htmlFor="insured">
                Nama Tertanggung / Insured Name *
              </FieldLabel>
              <Input
                id="insured"
                value={slip.insuredName}
                placeholder="PT / Mr. / Mrs. …"
                onChange={(e) => set({ insuredName: e.target.value })}
              />
            </Field>

            <Field className="md:col-span-2">
              <FieldLabel htmlFor="addr">Correspondence Address</FieldLabel>
              <Textarea
                id="addr"
                rows={2}
                value={slip.correspondenceAddress}
                placeholder="Alamat korespondensi tertanggung"
                onChange={(e) => set({ correspondenceAddress: e.target.value })}
              />
            </Field>

            <Field orientation="horizontal" className="md:col-span-2">
              <Switch
                id="tba"
                checked={slip.periodTba}
                onCheckedChange={(v) => set({ periodTba: Boolean(v) })}
              />
              <FieldLabel htmlFor="tba" className="font-normal">
                Period TBA (to be advised)
              </FieldLabel>
            </Field>

            {!slip.periodTba ? (
              <>
                <Field>
                  <FieldLabel htmlFor="inception">Inception Date</FieldLabel>
                  <Input
                    id="inception"
                    type="date"
                    value={slip.inceptionDate ?? ""}
                    onChange={(e) =>
                      set({ inceptionDate: e.target.value || null })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="expiry">Expiry Date</FieldLabel>
                  <Input
                    id="expiry"
                    type="date"
                    value={slip.expiryDate ?? ""}
                    onChange={(e) =>
                      set({ expiryDate: e.target.value || null })
                    }
                  />
                </Field>
              </>
            ) : null}

            {usesPropertyBlocks(slip.cob) ? (
              <>
                <Field className="md:col-span-2">
                  <FieldLabel>Okupasi (OJK)</FieldLabel>
                  <OccupationCombobox
                    value={slip.occupation ?? ""}
                    onValueChange={(v) => set({ occupation: v })}
                  />
                </Field>
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="risk">Risk Location</FieldLabel>
                  <Textarea
                    id="risk"
                    rows={2}
                    value={slip.riskLocation ?? ""}
                    placeholder="Alamat lokasi risiko"
                    onChange={(e) => set({ riskLocation: e.target.value })}
                  />
                </Field>
              </>
            ) : null}
          </div>

          {isMotor ? (
            <p className="mt-4 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
              Okupasi (OJK), Risk Location, Wording Form, dan Detail Coverage
              tidak dirender untuk COB Motor Vehicle.
            </p>
          ) : null}
        </SectionCard>

        {/* ---------- Wording Form + Detail Coverage ---------- */}
        {usesPropertyBlocks(slip.cob) ? (
          <>
            <SectionCard
              title="Wording Form"
              {...sectionProps("wording")}
              summary={`${slip.wordingForms.filter(Boolean).length} wording`}
            >
              <StringList
                values={slip.wordingForms}
                onChange={(v) => set({ wordingForms: v })}
                placeholder={WORDING_FORMS[0]}
                addLabel="Tambah wording"
              />
            </SectionCard>

            <SectionCard
              title="Detail Coverage & Ketentuan"
              {...sectionProps("coverage")}
              summary={slip.indemnityPeriod || undefined}
            >
              <div className="flex flex-col gap-4">
                <Field>
                  <FieldLabel htmlFor="coverage">Coverage</FieldLabel>
                  <Textarea
                    id="coverage"
                    rows={3}
                    value={slip.coverage ?? ""}
                    placeholder="Uraian jaminan yang diberikan"
                    onChange={(e) => set({ coverage: e.target.value })}
                  />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="construction">
                      Construction Class
                    </FieldLabel>
                    <Input
                      id="construction"
                      value={slip.constructionClass ?? ""}
                      placeholder="mis. Class 1 — Reinforced Concrete"
                      onChange={(e) =>
                        set({ constructionClass: e.target.value })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="indemnity">
                      Indemnity Period
                    </FieldLabel>
                    <Input
                      id="indemnity"
                      value={slip.indemnityPeriod ?? ""}
                      placeholder="mis. 12 months"
                      onChange={(e) => set({ indemnityPeriod: e.target.value })}
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>
          </>
        ) : null}

        {/* ---------- Interest Insured ---------- */}
        <SectionCard
          title="Interest Insured"
          {...sectionProps("interest")}
          summary={
            usesSectionSumInsured(slip.cob)
              ? undefined
              : money(sumItems(slip.interestItems), slip.currency)
          }
        >
          {usesSectionSumInsured(slip.cob) ? (
            <div className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="int1">
                  Section 1 — Material Damage
                </FieldLabel>
                <Textarea
                  id="int1"
                  rows={3}
                  value={slip.interestSection1 ?? ""}
                  onChange={(e) => set({ interestSection1: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="int2">
                  Section 2 — Business Interruption
                </FieldLabel>
                <Textarea
                  id="int2"
                  rows={3}
                  value={slip.interestSection2 ?? ""}
                  onChange={(e) => set({ interestSection2: e.target.value })}
                />
              </Field>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <LineItemList
                items={slip.interestItems}
                onChange={(items) => set({ interestItems: items })}
                descPlaceholder="Deskripsi objek pertanggungan"
                amountPlaceholder="Nilai"
                multiline
                addLabel="Tambah interest"
              />
              <TotalBar
                label="Total Interest Insured"
                value={money(sumItems(slip.interestItems), slip.currency)}
              />
            </div>
          )}
        </SectionCard>

        {/* ---------- Sum Insured (Property) ---------- */}
        {usesSectionSumInsured(slip.cob) ? (
          <SectionCard
            title="Sum Insured"
            {...sectionProps("sumInsured")}
            summary={money(md + bi, slip.currency)}
          >
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">
                  Section 1 — Material Damage
                </p>
                <LineItemList
                  items={slip.sumInsuredSection1}
                  onChange={(items) => set({ sumInsuredSection1: items })}
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
                  items={slip.sumInsuredSection2}
                  onChange={(items) => set({ sumInsuredSection2: items })}
                  descPlaceholder="Deskripsi"
                  amountPlaceholder="Nilai"
                />
                <TotalBar
                  label="Subtotal Business Interruption"
                  value={money(bi, slip.currency)}
                  tone="muted"
                />
              </div>
              <TotalBar
                label="Total Sum Insured"
                value={money(md + bi, slip.currency)}
              />
            </div>
          </SectionCard>
        ) : null}

        {/* ---------- Deductible & Clauses ---------- */}
        <SectionCard
          title="Deductible & Clauses"
          {...sectionProps("deductible")}
          summary={`${slip.clauseIds.length} klausula`}
        >
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                {isProperty
                  ? "Deductible — Section 1 (Material Damage)"
                  : "Deductible"}
              </p>
              <StringList
                values={slip.deductiblesSection1}
                onChange={(v) => set({ deductiblesSection1: v })}
                placeholder="Contoh: 10% of claim minimum IDR 10,000,000"
                addLabel="Tambah deductible"
              />
            </div>

            {isProperty ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">
                  Deductible — Section 2 (Business Interruption)
                </p>
                <StringList
                  values={slip.deductiblesSection2}
                  onChange={(v) => set({ deductiblesSection2: v })}
                  placeholder="Contoh: 14 days waiting period"
                  addLabel="Tambah deductible"
                />
              </div>
            ) : null}

            <Field>
              <FieldLabel htmlFor="special">Special Conditions</FieldLabel>
              <Textarea
                id="special"
                rows={3}
                value={slip.specialConditions ?? ""}
                onChange={(e) => set({ specialConditions: e.target.value })}
              />
            </Field>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Clauses</p>
              <ClausePicker
                cob={slip.cob}
                typeOfCover={slip.typeOfCover}
                selected={slip.clauseIds}
                onChange={(ids) => set({ clauseIds: ids })}
              />
            </div>
          </div>
        </SectionCard>

        {/* ---------- Rate & Premium ---------- */}
        <SectionCard
          title="Rate & Premium"
          {...sectionProps("rate")}
          summary={money(payable, slip.currency)}
          action={
            isProperty || isMotor ? (
              <OjkReference
                occupation={slip.occupation}
                onPickRate={(label, value) => {
                  set({
                    rateLines: slip.rateLines.map((l) =>
                      l.label.startsWith(label) ? { ...l, rate: value } : l
                    ),
                  })
                  toast.success(`Rate ${label} diisi ${num(value, 3)}`)
                }}
              />
            ) : null
          }
        >
          <div className="flex flex-col gap-4">
            {isProperty ? (
              <>
                <CoverRateTable
                  lines={slip.rateLines}
                  currency={slip.currency}
                  unit="‰"
                  onRateChange={(id, rate) =>
                    set({
                      rateLines: slip.rateLines.map((l) =>
                        l.id === id ? { ...l, rate } : l
                      ),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Rate dalam per mil (‰). Baris BI dihitung dari sum insured
                  Section 2, sisanya dari Section 1.
                </p>
              </>
            ) : null}

            {isMotor ? (
              <>
                <CoverRateTable
                  lines={slip.rateLines}
                  currency={slip.currency}
                  unit="%"
                  onRateChange={(id, rate) =>
                    set({
                      rateLines: slip.rateLines.map((l) =>
                        l.id === id ? { ...l, rate } : l
                      ),
                    })
                  }
                />
                <LimitRateTable
                  title="Third Party Liability"
                  lines={slip.tplLines}
                  currency={slip.currency}
                  totalLabel="Total TPL"
                  onChange={(lines) => set({ tplLines: lines })}
                />
                <LimitRateTable
                  title="Personal Accident"
                  lines={slip.paLines}
                  currency={slip.currency}
                  totalLabel="Total PA"
                  showCoverColumn
                  onChange={(lines) => set({ paLines: lines })}
                />
                <p className="text-xs text-muted-foreground">
                  Limit PA: IDR 5.000.000/orang, maks. 4 orang (selain truck
                  &amp; motorcycle) · maks. 2 orang (truck).
                </p>
              </>
            ) : null}

            {!isProperty && !isMotor ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Rate (‰)</FieldLabel>
                  <Input
                    className="tabular"
                    inputMode="decimal"
                    value={slip.rateLines[0]?.rate ?? ""}
                    placeholder="0.000"
                    onChange={(e) => {
                      const raw = e.target.value.replace(",", ".")
                      set({
                        rateLines: slip.rateLines.map((l, i) =>
                          i === 0
                            ? {
                                ...l,
                                rate: raw === "" ? null : Number(raw) || 0,
                              }
                            : l
                        ),
                      })
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel>Basis perhitungan</FieldLabel>
                  <Input
                    readOnly
                    className="tabular"
                    value={money(tsi, slip.currency)}
                  />
                </Field>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Total Premium</span>
                <span className="tabular">{money(premium, slip.currency)}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="disc">Discount (%)</FieldLabel>
                  <Input
                    id="disc"
                    className="tabular bg-background"
                    inputMode="decimal"
                    value={slip.discountPct || ""}
                    onChange={(e) =>
                      set({
                        discountPct:
                          Number(e.target.value.replace(",", ".")) || 0,
                      })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="admin">Admin Cost</FieldLabel>
                  <Input
                    id="admin"
                    className="tabular bg-background"
                    inputMode="numeric"
                    value={slip.adminCost ? num(slip.adminCost) : ""}
                    onChange={(e) =>
                      set({
                        adminCost:
                          Number(e.target.value.replace(/\D/g, "")) || 0,
                      })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="stamp">Stamp Duty</FieldLabel>
                  <Input
                    id="stamp"
                    className="tabular bg-background"
                    inputMode="numeric"
                    value={slip.stampDuty ? num(slip.stampDuty) : ""}
                    onChange={(e) =>
                      set({
                        stampDuty:
                          Number(e.target.value.replace(/\D/g, "")) || 0,
                      })
                    }
                  />
                </Field>
              </div>
              {discount > 0 ? (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Discount {percent(slip.discountPct)}</span>
                  <span className="tabular">
                    ({money(discount, slip.currency)})
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t pt-3 text-[15px] font-bold text-primary">
                <span>Total Payable</span>
                <span className="tabular">{money(payable, slip.currency)}</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ---------- Brokerage ---------- */}
        <SectionCard
          title="Brokerage"
          {...sectionProps("brokerage")}
          summary={percent(effectiveBrokeragePct(slip), 2)}
        >
          <div className="flex flex-col gap-4">
            <div className="grid items-end gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="brokerage">Brokerage (%)</FieldLabel>
                <Input
                  id="brokerage"
                  className="tabular"
                  inputMode="decimal"
                  value={slip.brokeragePct || ""}
                  onChange={(e) =>
                    set({
                      brokeragePct:
                        Number(e.target.value.replace(",", ".")) || 0,
                    })
                  }
                />
              </Field>
              <Field orientation="horizontal" className="pb-2">
                <Switch
                  id="vat"
                  checked={slip.includeVat}
                  onCheckedChange={(v) => set({ includeVat: Boolean(v) })}
                />
                <FieldLabel htmlFor="vat" className="font-normal">
                  Include VAT (PPN 11%)
                </FieldLabel>
              </Field>
            </div>
            <div className="grid gap-3 rounded-lg border bg-muted/50 p-4 sm:grid-cols-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Effective Brokerage
                </span>
                <span className="tabular font-semibold">
                  {percent(effectiveBrokeragePct(slip), 4)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Nilai Brokerage</span>
                <span className="tabular font-semibold">
                  {money(brokerageAmount(slip), slip.currency)}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ---------- Action bar ---------- */}
      </SlipFormBody>

      <SlipFormActions>
        {mode === "edit" ? (
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              <Trash2 data-icon="inline-start" />
              Hapus Slip
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus placing slip ini?</AlertDialogTitle>
                <AlertDialogDescription>
                  Slip {slip.slipNo ?? "draft"} untuk{" "}
                  {slip.insuredName || "tertanggung"} akan dihapus permanen.
                  Tindakan ini tidak bisa dibatalkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    toast.success("Slip dihapus", {
                      description: "Demo statis.",
                    })
                    router.push("/underwriting")
                  }}
                >
                  Hapus
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            render={<Link href="/underwriting" />}
            nativeButton={false}
          >
            Batal
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.success("Draft tersimpan", { description: "Demo statis." })
            }
          >
            <Save data-icon="inline-start" />
            Simpan Draft
          </Button>
          {slip.status === "Draft" ? (
            <Button onClick={handleRelease}>
              <Send data-icon="inline-start" />
              Release & Generate No. Slip
            </Button>
          ) : (
            <Button
              render={<Link href={`/underwriting/quotation/edit/${slip.id}`} />}
              nativeButton={false}
            >
              <Send data-icon="inline-start" />
              Lanjut ke Quotation Slip
            </Button>
          )}
        </div>
      </SlipFormActions>
    </PageShell>
  )
}
