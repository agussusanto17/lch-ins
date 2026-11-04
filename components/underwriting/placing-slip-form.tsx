"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  CircleCheck,
  Eye,
  FileCheck2,
  FileText,
  Info,
  Plus,
  Save,
  ScrollText,
  Send,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/layout/page-header"
import { useToday } from "@/components/layout/today-provider"
import { SelectInput } from "@/components/shared/form-fields"
import { useFormOptions } from "@/components/shared/form-options-provider"
import { SectionCard } from "@/components/shared/section-card"
import {
  SlipFormActions,
  SlipFormBody,
  SlipFormToolbar,
} from "@/components/underwriting/slip-form-chrome"
import { ClausePicker } from "@/components/underwriting/clause-picker"
import { DeductibleList } from "@/components/underwriting/deductible-input"
import {
  LineItemList,
  StringList,
  TotalBar,
} from "@/components/underwriting/line-items"
import { InsuredPicker } from "@/components/underwriting/insured-picker"
import { OccupationCombobox } from "@/components/underwriting/occupation-combobox"
import {
  OjkReference,
  type RateBounds,
} from "@/components/underwriting/ojk-reference"
import {
  CoverRateTable,
  LimitRateTable,
} from "@/components/underwriting/rate-tables"
import {
  coverCodeFor,
  coverLabel,
  occupationParts,
  isOutOfBounds,
  rateLinesWithBounds,
  recalc,
  releaseIssues,
  switchCob,
  usesAdditionalFee,
  usesPropertyBlocks,
  usesSectionSumInsured,
} from "@/components/underwriting/slip-model"
import { validateClauseUniquenessAcrossSections } from "@/lib/validation"
import {
  deletePlacingSlipAction,
  getClausesForPickerAction,
  previewSlipNumberAction,
  releasePlacingSlipAction,
  savePlacingSlipAction,
  togglePlacingSlipStatusAction,
  type ClausePickerItem,
} from "@/app/(app)/underwriting/actions"
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
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import {
  BI_BASE_LABELS,
  brokerageAmount,
  brokerageLimitIssue,
  brokerageLimitText,
  brokerageVatAmount,
  calculateParEqvet,
  discountAmount,
  effectiveBrokeragePct,
  isParEqvetSlip,
  parEqvetPolicyCharge,
  rateUnitFor,
  slipLossLimit,
  sumItems,
  sumPercent,
  totalPayable,
  totalPremium,
  totalSumInsured,
} from "@/lib/calc"
import {
  CLAUSES,
  CONSTRUCTION_CLASSES,
  type ClassOfBusiness,
  type PlacingSlip,
  type RateException,
  type SecurityPanelRow,
  type VehicleBrandOption,
} from "@/lib/data"
import { BI_SCALE_OJK } from "@/lib/data/ojk-tariff"
import {
  cobLabels,
  coversFor,
  deductibleChoicesFor,
  withCurrent,
} from "@/lib/form-options"
import { money, num, percent } from "@/lib/format"
import type { InsuredOption } from "@/lib/server/clients"
import { newId, store, useRecord } from "@/lib/store"
import { cn } from "@/lib/utils"

const SECTION_KEYS = [
  "basic",
  "wording",
  "coverage",
  "interest",
  "sumInsured",
  "deductible",
  "rate",
  "brokerage",
  "subjectivity",
  "security",
  "closing",
  "coverNote",
] as const
type SectionKey = (typeof SECTION_KEYS)[number]

const toItem = (v: string) => ({ label: v, value: v })
const CONSTRUCTION_ITEMS = CONSTRUCTION_CLASSES.map((c) => ({
  label: `${c.label} — ${c.description}`,
  value: c.code,
}))
const INDEMNITY_ITEMS = BI_SCALE_OJK.map((s) => ({
  label: `${s.months} bulan · ${s.pct}% tarif dasar`,
  value: `${s.months} months`,
}))

const ROLE_ITEMS = [
  { label: "As Leader", value: "As Leader" },
  { label: "As Member", value: "As Member" },
]

export function panelIssues(panel: SecurityPanelRow[]): string[] {
  const issues: string[] = []
  const filled = panel.filter((r) => r.insurer)
  if (!filled.length) {
    issues.push("Tambahkan minimal 1 perusahaan asuransi.")
    return issues
  }
  const totalShare = sumPercent(panel.map((r) => r.share))
  if (totalShare !== 100) {
    issues.push(
      `Total share harus 100% (saat ini ${num(totalShare, 2)}%, ${
        totalShare < 100 ? "kurang" : "lebih"
      } ${num(Math.abs(100 - totalShare), 2)}%).`
    )
  }
  // Satu asuransi 100% tidak punya leader atau member (LCH, 3 November 2026).
  const leaders = filled.filter((r) => r.role === "As Leader").length
  if (filled.length > 1 && leaders !== 1) {
    issues.push("Panel wajib punya tepat satu leader.")
  }
  const withoutInsurer = panel.filter((r) => r.share > 0 && !r.insurer)
  if (withoutInsurer.length) {
    issues.push("Ada baris panel yang belum memilih nama asuransi.")
  }
  const duplicate = filled
    .map((r) => r.insurer)
    .filter((name, i, all) => name && all.indexOf(name) !== i)
  if (duplicate.length) {
    issues.push(
      `Asuransi ganda: ${[...new Set(duplicate)].join(", ")}. Gabungkan share ke satu baris.`
    )
  }
  return issues
}

const emptySecurityRow = (): SecurityPanelRow => ({
  id: newId("sec"),
  insurer: "",
  share: 0,
  role: "As Member",
})

// Isian putih di panel abu ringkasan premi hanya 1,04:1 tanpa garis tepi.
// Garis muted-foreground/80 memberi 3,32:1 (terang) dan 4,09:1 (gelap)
// terhadap panel, memenuhi 3:1 untuk batas komponen (WCAG 1.4.11).
const PANEL_INPUT = "border-muted-foreground/80 bg-background"

/**
 * Form placing slip. Mengambil slip dari store sesi (termasuk slip yang baru
 * dibuat) dan jatuh ke data server bila belum ada di store.
 */
export function PlacingSlipForm({
  id,
  initial,
  mode,
  vehicleOptions,
  clients,
}: {
  id?: string
  initial: PlacingSlip | null
  mode: "new" | "edit" | "quotation"
  vehicleOptions?: VehicleBrandOption[]
  clients: InsuredOption[]
}) {
  const stored = useRecord("slips", id ?? null)
  const source = stored ?? initial

  if (!source) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <h1 className="text-lg font-semibold">
            Placing slip tidak ditemukan
          </h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Slip mungkin sudah dihapus, atau dibuat di sesi lain dan belum
            tersimpan ke server.
          </p>
          <Button render={<Link href="/underwriting" />} nativeButton={false}>
            <ArrowLeft data-icon="inline-start" />
            Kembali ke Placement
          </Button>
        </div>
      </PageShell>
    )
  }
  return (
    <SlipEditor
      key={source.id}
      initial={source}
      mode={mode}
      vehicleOptions={vehicleOptions}
      clients={clients}
    />
  )
}

function SlipEditor({
  initial,
  mode,
  vehicleOptions,
  clients,
}: {
  initial: PlacingSlip
  mode: "new" | "edit" | "quotation"
  vehicleOptions?: VehicleBrandOption[]
  clients: InsuredOption[]
}) {
  const router = useRouter()
  const today = useToday()
  const [isPending, startTransition] = React.useTransition()
  const [slip, setSlip] = React.useState<PlacingSlip>(() => recalc(initial))
  const [savedJson, setSavedJson] = React.useState(() =>
    JSON.stringify(recalc(initial))
  )
  const dirty = JSON.stringify(slip) !== savedJson
  // Slip baru (termasuk yang terisi dari SPPA) selalu bisa disimpan sebagai draft.
  const canSave = dirty || mode === "new"

  const set = React.useCallback((patch: Partial<PlacingSlip>) => {
    setSlip((s) => recalc({ ...s, ...patch }))
  }, [])

  const isQuotation = mode === "quotation"
  const showQuotationSections = isQuotation || slip.status !== "Draft"

  const availableKeys = React.useMemo(() => {
    if (showQuotationSections) {
      return SECTION_KEYS
    }
    return SECTION_KEYS.filter(
      (k) => !["subjectivity", "security", "closing", "coverNote"].includes(k)
    )
  }, [showQuotationSections])

  const [openSections, setOpenSections] = React.useState<
    Record<string, boolean>
  >(() => Object.fromEntries(SECTION_KEYS.map((k) => [k, true])))
  const allOpen = availableKeys.every((k) => openSections[k])
  const sectionProps = (key: SectionKey) => ({
    collapsible: true as const,
    open: openSections[key],
    onOpenChange: (v: boolean) => setOpenSections((o) => ({ ...o, [key]: v })),
  })

  const [issues, setIssues] = React.useState<string[] | null>(null)
  const [confirmRelease, setConfirmRelease] = React.useState(false)
  const [releaseNoPreview, setReleaseNoPreview] = React.useState<string | null>(null)
  const previewSeqRef = React.useRef(0)
  const [confirmDestroy, setConfirmDestroy] = React.useState(false)
  const [confirmClose, setConfirmClose] = React.useState(false)
  const [masterClauses, setMasterClauses] = React.useState<ClausePickerItem[]>([])

  React.useEffect(() => {
    let active = true
    getClausesForPickerAction().then((res) => {
      if (active && res.ok && res.data) {
        setMasterClauses(res.data)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const clauseTitleLookup = React.useCallback(
    (id: string) => {
      return (
        masterClauses.find((c) => c.id === id)?.title ||
        CLAUSES.find((c) => c.id === id)?.title ||
        undefined
      )
    },
    [masterClauses]
  )

  const panel = slip.securityPanel ?? []
  const multiInsurer = panel.filter((r) => r.insurer).length > 1
  const totalShare = sumPercent(panel.map((r) => r.share))
  const pIssues = panelIssues(panel)
  const panelValid = pIssues.length === 0
  const duplicateInsurerNames = new Set(
    panel
      .map((r) => r.insurer)
      .filter((name, i, all) => name && all.indexOf(name) !== i)
  )

  function prepareSecurityPanel(p: SecurityPanelRow[] = panel) {
    const isMulti = p.filter((r) => r.insurer).length > 1
    return p
      .filter((r) => r.insurer || r.share)
      .map((r) =>
        !isMulti && r.insurer ? { ...r, role: "As Leader" as const } : r
      )
  }

  function patchPanelRow(rowId: string, next: Partial<SecurityPanelRow>) {
    const nextPanel = (slip.securityPanel ?? []).map((r) =>
      r.id === rowId ? { ...r, ...next } : r
    )
    set({ securityPanel: nextPanel })
  }

  function setLeader(rowId: string) {
    const nextPanel = (slip.securityPanel ?? []).map((r) => ({
      ...r,
      role: (r.id === rowId ? "As Leader" : "As Member") as "As Leader" | "As Member",
    }))
    set({ securityPanel: nextPanel })
  }

  function removePanelRow(rowId: string) {
    const nextPanel = (slip.securityPanel ?? []).filter((r) => r.id !== rowId)
    set({ securityPanel: nextPanel })
  }

  function addPanelRow() {
    const nextPanel = [...(slip.securityPanel ?? []), emptySecurityRow()]
    set({ securityPanel: nextPanel })
  }

  function issueClosing() {
    setConfirmClose(false)
    startTransition(async () => {
      const withBounds = rateLinesWithBounds(slip)
      const exceptions = Object.fromEntries(
        Object.entries(slip.rateExceptions ?? {}).filter(([lineId]) =>
          withBounds.some((l) => l.id === lineId && isOutOfBounds(l))
        )
      )
      const toSend: PlacingSlip = {
        ...slip,
        status: "Closed",
        rateLines: withBounds,
        rateExceptions: exceptions,
        securityPanel: prepareSecurityPanel(slip.securityPanel),
        updatedAt: today,
      }
      const res = await savePlacingSlipAction(toSend, "edit")
      if (!res.ok || !res.data) {
        toast.error("Gagal menerbitkan closing instruction", {
          description: res.error,
        })
        return
      }
      const record = res.data
      store.upsert("slips", record)
      setSlip(record)
      setSavedJson(JSON.stringify(record))
      toast.success("Closing instruction diterbitkan", {
        description: `Placing slip ${record.slipNo ?? ""} selesai dan di-close.`,
      })
      router.push(`/underwriting/closing/${record.id}`)
    })
  }

  // Peringatan saat menutup tab dengan perubahan yang belum disimpan.
  React.useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [dirty])

  const locked = slip.status === "Cancelled" || slip.status === "Closed"
  const isProperty = slip.cob === "Property"
  const isMotor = slip.cob === "Motor Vehicle"

  // Pilihan dari master data. Nilai slip yang sudah tidak ada di master tetap
  // ditampilkan supaya slip lama tidak kehilangan isiannya saat diedit.
  const options = useFormOptions()
  const cobItems = withCurrent(cobLabels(options), slip.cob).map(toItem)
  const currencyItems = withCurrent(
    options.currencies.map((c) => c.code),
    slip.currency
  ).map(toItem)
  const covers = coversFor(options, slip.cob)
  const deductibleChoices = deductibleChoicesFor(
    options,
    slip.cob,
    slip.typeOfCover
  )
  const coverItems = withCurrent(
    covers.map((c) => c.name),
    slip.typeOfCover
  ).map(toItem)
  const wordingNames = options.wordingForms.map((w) => w.name)
  const insurerItems = options.insurers.map((ins) => ins.name)

  const lines = rateLinesWithBounds(slip)
  const md = sumItems(slip.sumInsuredSection1)
  const bi = sumItems(slip.sumInsuredSection2)
  const tsi = totalSumInsured(slip)
  const lossLimit = slipLossLimit(slip)
  const premium = totalPremium(slip)
  const discount = discountAmount(slip)
  const payable = totalPayable(slip)
  // Slip PAR + EQVET: Admin Cost dan Stamp Duty dikenakan per polis yang
  // berpremi, jadi ringkasan menyebut jumlah polisnya.
  const parEqvet = isParEqvetSlip(slip) ? calculateParEqvet(slip) : null
  const policyCharge = parEqvetPolicyCharge(slip)
  const chargedPolicies = parEqvet
    ? [parEqvet.par, parEqvet.eqvet].filter((g) => g.policyCost > 0).length
    : 0
  const unresolved = lines.filter(
    (l) => isOutOfBounds(l) && !slip.rateExceptions?.[l.id]
  ).length

  /** Tarif dasar BI: jumlah FLEXAS, FWTWD, RSMDCC, dan Other Losses. */
  const biBaseRate = slip.rateLines
    .filter((l) => BI_BASE_LABELS.includes(l.label))
    .reduce((a, l) => a + (l.rate ?? 0), 0)
  const eqRate = slip.rateLines.find((l) => l.label === "EQVET")?.rate ?? null
  const brokerageLimit = brokerageLimitText(slip)
  const brokerageIssue = brokerageLimitIssue(slip)
  // Klausula Section 2 (Business Interruption) hanya berlaku untuk Property.
  const clauseIds2 = usesSectionSumInsured(slip.cob)
    ? (slip.clauseIdsSection2 ?? [])
    : []
  const clauseCount = slip.clauseIds.length + clauseIds2.length
  const editedClauseCount =
    slip.clauseIds.filter((id) => slip.clauseOverrides?.[id]).length +
    clauseIds2.filter((id) => slip.clauseOverridesSection2?.[id]).length
  const customWording = slip.wordingForms.filter(
    (w) => w && !wordingNames.includes(w)
  )

  /** Isi satu baris rate dari panel referensi OJK, sekaligus catat batasnya. */
  function applyOjkRate(label: string, value: number, bounds?: RateBounds) {
    if (!slip.rateLines.some((l) => l.label.startsWith(label))) return
    // Satu klik BI mengisi dua baris sekaligus, jadi wajib pakai updater agar
    // panggilan kedua tidak menimpa hasil panggilan pertama.
    setSlip((s) =>
      recalc({
        ...s,
        rateLines: s.rateLines.map((l) =>
          l.label.startsWith(label)
            ? {
                ...l,
                rate: value,
                ...(bounds
                  ? {
                      min: bounds.min,
                      max: bounds.max,
                      boundSource: bounds.source,
                    }
                  : {}),
              }
            : l
        ),
      })
    )
    toast.success(`Rate ${label} diisi ${value.toLocaleString("id-ID")}`, {
      description: bounds?.source,
    })
  }

  function setException(lineId: string, exception: RateException | null) {
    const next = { ...(slip.rateExceptions ?? {}) }
    if (exception) next[lineId] = exception
    else delete next[lineId]
    set({ rateExceptions: next })
  }

  function handleSave() {
    if (usesSectionSumInsured(slip.cob)) {
      const clauseIssues = validateClauseUniquenessAcrossSections(
        slip,
        clauseTitleLookup
      )
      if (clauseIssues.length > 0) {
        toast.error("Klausula tidak valid", { description: clauseIssues[0] })
        return
      }
    }
    startTransition(async () => {
      const withBounds = rateLinesWithBounds(slip)
      const exceptions = Object.fromEntries(
        Object.entries(slip.rateExceptions ?? {}).filter(([lineId]) =>
          withBounds.some((l) => l.id === lineId && isOutOfBounds(l))
        )
      )
      const status =
        isQuotation && slip.status === "Released" && panelValid
          ? "Quoted"
          : slip.status

      const toSend: PlacingSlip = {
        ...slip,
        status,
        rateLines: withBounds,
        rateExceptions: exceptions,
        securityPanel: prepareSecurityPanel(slip.securityPanel),
        updatedAt: today,
      }
      const res = await savePlacingSlipAction(toSend, isQuotation ? "edit" : mode)
      if (!res.ok || !res.data) {
        toast.error("Gagal menyimpan slip", { description: res.error })
        return
      }
      const record = res.data
      store.upsert("slips", record)
      setSlip(record)
      setSavedJson(JSON.stringify(record))
      toast.success(
        record.status === "Draft" ? "Draft tersimpan" : "Perubahan tersimpan",
        {
          description: record.slipNo ?? record.insuredName ?? undefined,
        }
      )
      if (mode === "new" || slip.id !== record.id) {
        router.replace(
          isQuotation
            ? `/underwriting/quotation/edit/${record.id}`
            : `/underwriting/edit/${record.id}`
        )
      }
    })
  }

  function startRelease() {
    const found = releaseIssues(slip)
    if (found.length) {
      setIssues(found)
      return
    }
    const seq = ++previewSeqRef.current
    setReleaseNoPreview(null)
    setConfirmRelease(true)
    previewSlipNumberAction(slip.coverCode).then((res) => {
      if (seq !== previewSeqRef.current) return
      if (res.ok) setReleaseNoPreview(res.data ?? null)
    })
  }

  function doRelease() {
    startTransition(async () => {
      let targetId = slip.id
      if (dirty || mode === "new" || targetId === "new" || targetId.startsWith("s-")) {
        const withBounds = rateLinesWithBounds(slip)
        const exceptions = Object.fromEntries(
          Object.entries(slip.rateExceptions ?? {}).filter(([lineId]) =>
            withBounds.some((l) => l.id === lineId && isOutOfBounds(l))
          )
        )
        const toSend: PlacingSlip = {
          ...slip,
          rateLines: withBounds,
          rateExceptions: exceptions,
          securityPanel: prepareSecurityPanel(slip.securityPanel),
          updatedAt: today,
        }
        const saveRes = await savePlacingSlipAction(
          toSend,
          isQuotation ? "edit" : mode
        )
        if (!saveRes.ok || !saveRes.data) {
          toast.error("Gagal menyimpan slip sebelum rilis", { description: saveRes.error })
          return
        }
        targetId = saveRes.data.id
        store.upsert("slips", saveRes.data)
        setSlip(saveRes.data)
      }

      const relRes = await releasePlacingSlipAction(targetId)
      if (!relRes.ok || !relRes.data) {
        toast.error("Gagal merilis slip", { description: relRes.error })
        return
      }
      const record = relRes.data
      setConfirmRelease(false)
      store.upsert("slips", record)
      setSlip(record)
      setSavedJson(JSON.stringify(record))
      toast.success("Slip di-release", { description: `No. slip ${record.slipNo}` })
      if (mode === "new" || slip.id !== record.id) {
        router.replace(
          isQuotation
            ? `/underwriting/quotation/edit/${record.id}`
            : `/underwriting/edit/${record.id}`
        )
      }
    })
  }

  function doDestroy() {
    setConfirmDestroy(false)
    startTransition(async () => {
      if (slip.status === "Draft") {
        store.remove("slips", slip.id)
        setSavedJson(JSON.stringify(slip))
        const delRes = await deletePlacingSlipAction(slip.id)
        if (!delRes.ok && delRes.error) {
          toast.error("Gagal menghapus draft", { description: delRes.error })
          return
        }
        toast.success("Draft slip dihapus")
        router.push("/underwriting")
        return
      }
      const cancelRes = await togglePlacingSlipStatusAction(slip.id, "Cancelled")
      if (!cancelRes.ok && cancelRes.error) {
        toast.error("Gagal membatalkan slip", { description: cancelRes.error })
        return
      }
      if (cancelRes.data) {
        store.upsert("slips", cancelRes.data)
        setSlip(cancelRes.data)
        setSavedJson(JSON.stringify(cancelRes.data))
      }
      toast.success("Slip dibatalkan", {
        description: `Nomor ${slip.slipNo} tetap tercatat supaya penomoran tidak bolong.`,
      })
    })
  }

  /** Buka dokumen atau quotation; perubahan disimpan dulu supaya dokumen sama dengan form. */
  function goTo(path: (id: string) => string) {
    if (dirty || mode === "new") {
      if (usesSectionSumInsured(slip.cob)) {
        const clauseIssues = validateClauseUniquenessAcrossSections(
          slip,
          clauseTitleLookup
        )
        if (clauseIssues.length > 0) {
          toast.error("Klausula tidak valid", { description: clauseIssues[0] })
          return
        }
      }
      startTransition(async () => {
        const withBounds = rateLinesWithBounds(slip)
        const exceptions = Object.fromEntries(
          Object.entries(slip.rateExceptions ?? {}).filter(([lineId]) =>
            withBounds.some((l) => l.id === lineId && isOutOfBounds(l))
          )
        )
        const status =
          isQuotation && slip.status === "Released" && panelValid
            ? "Quoted"
            : slip.status

        const toSend: PlacingSlip = {
          ...slip,
          status,
          rateLines: withBounds,
          rateExceptions: exceptions,
          securityPanel: prepareSecurityPanel(slip.securityPanel),
          updatedAt: today,
        }
        const res = await savePlacingSlipAction(toSend, isQuotation ? "edit" : mode)
        if (res.ok && res.data) {
          store.upsert("slips", res.data)
          router.push(path(res.data.id))
        } else {
          toast.error("Gagal menyimpan slip", { description: res.error })
          return
        }
      })
    } else {
      router.push(path(slip.id))
    }
  }

  const destroyLabel = slip.status === "Draft" ? "Hapus Draft" : "Batalkan Slip"
  const canDestroy =
    (mode === "edit" || isQuotation) &&
    slip.status !== "Cancelled" &&
    slip.status !== "Closed"

  return (
    <PageShell className="gap-0 p-0">
      <SlipFormToolbar
        title={
          isQuotation
            ? "Quotation Slip"
            : mode === "new"
              ? "Buat Placing Slip Baru"
              : "Edit Placing Slip"
        }
        subtitle={`${slip.cob}${slip.typeOfCover ? ` · ${slip.typeOfCover}` : ""}`}
        status={slip.status}
        slipNo={slip.slipNo}
        backHref="/underwriting"
        allOpen={allOpen}
        onToggleAll={() => {
          const next = !allOpen
          setOpenSections(
            (prev) =>
              ({
                ...prev,
                ...Object.fromEntries(availableKeys.map((k) => [k, next])),
              }) as Record<SectionKey, boolean>
          )
        }}
        meta={
          <>
            Total Sum Insured{" "}
            <span className="tabular font-semibold text-foreground">
              {money(tsi, slip.currency)}
            </span>
            {dirty ? (
              <span className="ml-3 text-warning">· belum disimpan</span>
            ) : null}
          </>
        }
      />

      <SlipFormBody>
        {slip.sppaId ? (
          <p className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
            <Info className="size-4 shrink-0" />
            Dibuat dari SPPA {slip.insuredName}. Data dasar terisi dari SPPA dan
            tetap bisa diubah.
          </p>
        ) : null}
        {slip.status === "Released" || slip.status === "Quoted" ? (
          <p className="flex items-start gap-2 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Slip sudah di-release dengan nomor {slip.slipNo}. Perubahan setelah
            release tetap bisa disimpan, sementara aturan revisi menunggu
            keputusan LCH.
          </p>
        ) : null}
        {locked ? (
          <p className="flex items-start gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
            <Ban className="mt-0.5 size-4 shrink-0" />
            Slip berstatus{" "}
            {slip.status === "Cancelled" ? "dibatalkan" : "Closed"} dan tidak
            bisa diubah lagi.
          </p>
        ) : null}

        <fieldset disabled={locked} className="contents">
          <SectionCard
            title="Informasi Dasar"
            {...sectionProps("basic")}
            summary={slip.insuredName || "Belum ada tertanggung"}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>Class of Business *</FieldLabel>
                <Select
                  items={cobItems}
                  value={slip.cob}
                  onValueChange={(v) =>
                    setSlip((s) => switchCob(s, v as ClassOfBusiness))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {cobItems.map((i) => (
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
                  items={currencyItems}
                  value={slip.currency}
                  onValueChange={(v) => set({ currency: v as string })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {currencyItems.map((i) => (
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
                      coverCode: coverCodeFor(
                        slip.cob,
                        (v as string) ?? "",
                        covers
                      ),
                    })
                  }
                >
                  <SelectTrigger className="w-full">
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

              <InsuredPicker
                clients={clients}
                clientId={slip.clientId}
                insuredName={slip.insuredName}
                correspondenceAddress={slip.correspondenceAddress}
                onChange={set}
              />

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
                  <Field
                    data-invalid={
                      slip.inceptionDate &&
                      slip.expiryDate &&
                      slip.expiryDate <= slip.inceptionDate
                        ? true
                        : undefined
                    }
                  >
                    <FieldLabel htmlFor="expiry">Expiry Date</FieldLabel>
                    <Input
                      id="expiry"
                      type="date"
                      min={slip.inceptionDate ?? undefined}
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
                    <FieldLabel>
                      Okupasi (OJK){isProperty ? " *" : ""}
                    </FieldLabel>
                    <OccupationCombobox
                      value={slip.occupation ?? ""}
                      onValueChange={(v) =>
                        set({ occupation: v, occupationLabel: undefined })
                      }
                    />
                  </Field>
                  {/*
                   * Nama okupasi OJK bisa sangat panjang (29371 berisi syarat
                   * gudang). Seperti override klausul, teks ini hanya untuk
                   * dokumen slip ini dan tidak mengubah master okupasi.
                   */}
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="occupation-label">
                      Nama okupasi di slip
                    </FieldLabel>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="occupation-label"
                        value={
                          slip.occupationLabel ??
                          occupationParts(slip.occupation).name
                        }
                        disabled={!slip.occupation}
                        placeholder={
                          occupationParts(slip.occupation).name ||
                          "Pilih okupasi OJK dulu"
                        }
                        onChange={(e) =>
                          set({ occupationLabel: e.target.value })
                        }
                      />
                      {slip.occupationLabel !== undefined ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => set({ occupationLabel: undefined })}
                        >
                          Sesuai OJK
                        </Button>
                      ) : null}
                    </div>
                    <FieldDescription>
                      {slip.occupation
                        ? `Hanya mengubah teks di dokumen slip ini. Kode ${occupationParts(slip.occupation).code} tetap tercetak, dan master okupasi tetap sesuai OJK.`
                        : "Bisa diringkas setelah okupasi OJK dipilih."}
                    </FieldDescription>
                  </Field>
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="risk">
                      Risk Location{isProperty ? " *" : ""}
                    </FieldLabel>
                    <Textarea
                      id="risk"
                      rows={2}
                      value={slip.riskLocation ?? ""}
                      placeholder="Alamat lokasi risiko, sertakan kabupaten atau kota"
                      onChange={(e) => set({ riskLocation: e.target.value })}
                    />
                  </Field>
                </>
              ) : (
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="domicile">Domisili Kendaraan</FieldLabel>
                  <Textarea
                    id="domicile"
                    rows={2}
                    value={slip.riskLocation ?? ""}
                    placeholder="Alamat garasi atau kota domisili, dipakai menentukan wilayah tarif OJK"
                    onChange={(e) => set({ riskLocation: e.target.value })}
                  />
                </Field>
              )}
            </div>
          </SectionCard>

          {usesPropertyBlocks(slip.cob) ? (
            <>
              <SectionCard
                title="Wording Form"
                {...sectionProps("wording")}
                summary={`${slip.wordingForms.filter(Boolean).length} wording`}
              >
                <div className="flex flex-wrap gap-2">
                  {wordingNames.map((w) => {
                    const active = slip.wordingForms.includes(w)
                    return (
                      <Toggle
                        key={w}
                        size="sm"
                        pressed={active}
                        // Nama wording bisa panjang; biarkan pindah baris daripada terpotong.
                        className="h-auto min-h-8 max-w-full py-1.5 text-left whitespace-normal"
                        onPressedChange={() =>
                          set({
                            wordingForms: active
                              ? slip.wordingForms.filter((x) => x !== w)
                              : [...slip.wordingForms.filter(Boolean), w],
                          })
                        }
                      >
                        {active ? <Check data-icon="inline-start" /> : null}
                        {w}
                      </Toggle>
                    )
                  })}
                </div>
                {customWording.length ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">
                      Wording di luar master (data lama). Tambahkan ke master
                      data bila masih dipakai.
                    </p>
                    <StringList
                      values={customWording}
                      onChange={(v) =>
                        set({
                          wordingForms: [
                            ...slip.wordingForms.filter((w) =>
                              wordingNames.includes(w)
                            ),
                            ...v,
                          ],
                        })
                      }
                      addLabel="Tambah"
                    />
                  </div>
                ) : null}
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
                  {isProperty ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <SelectInput
                        label="Construction Class"
                        required
                        items={CONSTRUCTION_ITEMS}
                        value={slip.constructionClass ?? ""}
                        onValueChange={(v) => set({ constructionClass: v })}
                        placeholder="Pilih kelas konstruksi"
                        description="Dipakai menentukan batas tarif FLEXAS okupasi."
                      />
                      <SelectInput
                        label="Indemnity Period"
                        items={INDEMNITY_ITEMS}
                        value={slip.indemnityPeriod ?? ""}
                        onValueChange={(v) => set({ indemnityPeriod: v })}
                        placeholder="Pilih periode (skala BI OJK)"
                        description="Terisi juga saat memilih skala BI di panel tarif OJK."
                      />
                    </div>
                  ) : null}
                </div>
              </SectionCard>
            </>
          ) : null}

          <SectionCard
            title={
              usesSectionSumInsured(slip.cob)
                ? "Interest Insured"
                : "Interest Insured *"
            }
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
                  descPlaceholder={
                    isMotor
                      ? "Tahun, No. Polisi, No. Rangka / Mesin, Penggunaan"
                      : "Deskripsi objek pertanggungan"
                  }
                  amountPlaceholder="Nilai"
                  multiline
                  addLabel={isMotor ? "Tambah kendaraan" : "Tambah interest"}
                  vehicleOptions={isMotor ? vehicleOptions : undefined}
                />
                <TotalBar
                  label="Total Interest Insured"
                  value={money(sumItems(slip.interestItems), slip.currency)}
                />
              </div>
            )}
          </SectionCard>

          {usesSectionSumInsured(slip.cob) ? (
            <SectionCard
              title="Sum Insured *"
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
                  <Field className="mt-2 md:max-w-sm">
                    <FieldLabel htmlFor="loss-limit">
                      Loss Limit ({slip.currency})
                    </FieldLabel>
                    <NumberInput
                      id="loss-limit"
                      preset="money"
                      min={0}
                      value={slip.lossLimit || null}
                      onValueChange={(v) => set({ lossLimit: v || null })}
                    />
                    <FieldDescription>
                      {!slip.lossLimit
                        ? "Kosongkan untuk full value."
                        : lossLimit
                          ? `${percent(lossLimit.valuesPct, 2)} dari nilai Section 1. Premi Material Damage ${percent(lossLimit.premiumPct, 2)} dari premi full value (skala OJK Tabel I.B).`
                          : "Loss limit tidak di bawah nilai Section 1, jadi dihitung full value."}
                    </FieldDescription>
                  </Field>
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

          <SectionCard
            title="Deductible & Clauses"
            {...sectionProps("deductible")}
            summary={`${clauseCount} klausula${
              editedClauseCount ? ` · ${editedClauseCount} diedit` : ""
            }`}
          >
            <div className="flex flex-col gap-5">
              {/*
               * Deductible per cover untuk tiap baris rate (instruksi LCH 29
               * Oktober 2026), sampai lima isian per cover (4 November 2026).
               * Baris TPL dan PA tidak ikut: risiko sendiri motor berlaku untuk
               * kendaraan dan perluasannya.
               */}
              <div className="flex flex-col gap-2">
                <div>
                  <p className="text-sm font-medium">Deductible per cover</p>
                  <p className="text-xs text-muted-foreground">
                    {!slip.typeOfCover
                      ? "Pilih Type of Cover untuk memakai pilihan deductible dari master data."
                      : deductibleChoices.length
                        ? "Klik Pilih untuk mengisi dari master data, lalu ubah teksnya bila perlu."
                        : `Belum ada pilihan deductible untuk ${slip.typeOfCover}. Tambahkan di Master Data > Deductible.`}
                  </p>
                </div>
                <div className="overflow-hidden rounded-xl border">
                  {slip.rateLines.map((line) => (
                    <div
                      key={line.id}
                      className="grid grid-cols-1 items-start gap-x-4 gap-y-1.5 border-b px-3 py-2.5 last:border-0 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]"
                    >
                      <label
                        htmlFor={`deductible-${line.id}`}
                        className="truncate text-sm text-muted-foreground sm:pt-2"
                        title={coverLabel(slip, line)}
                      >
                        {coverLabel(slip, line)}
                      </label>
                      <DeductibleList
                        id={`deductible-${line.id}`}
                        cover={coverLabel(slip, line)}
                        values={line.deductibles ?? []}
                        choices={deductibleChoices}
                        onChange={(values) =>
                          set({
                            rateLines: slip.rateLines.map((l) =>
                              l.id === line.id
                                ? { ...l, deductibles: values }
                                : l
                            ),
                          })
                        }
                        placeholder={
                          line.label.startsWith("BI")
                            ? "Contoh: 14 days waiting period"
                            : "Contoh: 10% of claim minimum IDR 10,000,000"
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

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
                <p className="text-sm font-medium">
                  {usesSectionSumInsured(slip.cob)
                    ? "Clauses Section 1 — Material Damage"
                    : "Clauses"}
                </p>
                <ClausePicker
                  cob={slip.cob}
                  typeOfCover={slip.typeOfCover}
                  selected={slip.clauseIds}
                  overrides={slip.clauseOverrides ?? {}}
                  onChange={(ids) => set({ clauseIds: ids })}
                  onOverridesChange={(o) => set({ clauseOverrides: o })}
                  masterClauses={masterClauses}
                />
              </div>

              {usesSectionSumInsured(slip.cob) ? (
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      Clauses Section 2 — Business Interruption
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pilih klausula khusus Section 2. Setiap klausula hanya boleh dipilih di salah satu section.
                    </p>
                  </div>
                  <ClausePicker
                    cob={slip.cob}
                    typeOfCover={slip.typeOfCover}
                    selected={clauseIds2}
                    overrides={slip.clauseOverridesSection2 ?? {}}
                    onChange={(ids) => set({ clauseIdsSection2: ids })}
                    onOverridesChange={(o) =>
                      set({ clauseOverridesSection2: o })
                    }
                    masterClauses={masterClauses}
                  />
                </div>
              ) : null}

              {/* Validation warning for duplicate clauses */}
              {usesSectionSumInsured(slip.cob) && (
                <div className="flex flex-col gap-2">
                  {(() => {
                    const issues = validateClauseUniquenessAcrossSections(
                      {
                        clauseIds: slip.clauseIds ?? [],
                        clauseIdsSection2: slip.clauseIdsSection2 ?? [],
                      },
                      clauseTitleLookup
                    )
                    if (issues.length > 0) {
                      return (
                        <div className="flex flex-col gap-1 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                          <div className="flex gap-1.5">
                            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                            {issues[0]}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Rate & Premium"
            {...sectionProps("rate")}
            summary={money(payable, slip.currency)}
            action={
              unresolved ? (
                <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                  {unresolved} rate butuh alasan
                </span>
              ) : undefined
            }
          >
            <div className="flex flex-col gap-4">
              {lossLimit ? (
                <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  Premi Material Damage dihitung{" "}
                  {percent(lossLimit.premiumPct, 2)} dari premi full value,
                  karena loss limit {percent(lossLimit.valuesPct, 2)} dari
                  nilai Section 1. Premi BI tetap penuh.
                </p>
              ) : null}
              {(isProperty || isMotor) && !locked ? (
                <OjkReference
                  mode={isMotor ? "motor" : "property"}
                  occupation={slip.occupation}
                  riskLocation={slip.riskLocation ?? ""}
                  constructionClass={slip.constructionClass}
                  onConstructionClassChange={(code) =>
                    set({ constructionClass: code })
                  }
                  sumInsured={tsi}
                  baseRate={biBaseRate}
                  eqRate={eqRate}
                  onPickRate={applyOjkRate}
                  onPickIndemnity={(months) =>
                    set({ indemnityPeriod: `${months} months` })
                  }
                />
              ) : null}

              {isProperty || isMotor ? (
                <>
                  <CoverRateTable
                    lines={lines}
                    currency={slip.currency}
                    unit={rateUnitFor(slip.cob)}
                    exceptions={slip.rateExceptions}
                    readOnly={locked}
                    onRateChange={(id, rate) =>
                      set({
                        rateLines: slip.rateLines.map((l) =>
                          l.id === id ? { ...l, rate } : l
                        ),
                      })
                    }
                    onExceptionChange={setException}
                  />
                  {isProperty ? (
                    <p className="text-xs text-muted-foreground">
                      Rate dalam per mil (‰). Baris BI dihitung dari sum insured
                      Section 2, sisanya dari Section 1. Batas FLEXAS terisi
                      otomatis dari okupasi dan kelas konstruksi.
                    </p>
                  ) : null}
                </>
              ) : null}

              {isMotor ? (
                <>
                  <LimitRateTable
                    title="Third Party Liability"
                    lines={slip.tplLines}
                    currency={slip.currency}
                    totalLabel="Total TPL"
                    readOnly={locked}
                    onChange={(l) => set({ tplLines: l })}
                  />
                  <LimitRateTable
                    title="Personal Accident"
                    lines={slip.paLines}
                    currency={slip.currency}
                    totalLabel="Total PA"
                    showCoverColumn
                    readOnly={locked}
                    onChange={(l) => set({ paLines: l })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Limit PA: IDR 5.000.000/orang, maks. 4 orang (selain truck
                    &amp; motorcycle) · maks. 2 orang (truck).
                  </p>
                </>
              ) : null}

              {!isProperty && !isMotor ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="rate-std">
                      Rate ({rateUnitFor(slip.cob)})
                    </FieldLabel>
                    <NumberInput
                      id="rate-std"
                      preset="rate"
                      placeholder="0,000"
                      value={slip.rateLines[0]?.rate ?? null}
                      onValueChange={(v) =>
                        set({
                          rateLines: slip.rateLines.map((l, i) =>
                            i === 0 ? { ...l, rate: v } : l
                          ),
                        })
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="basis">Basis perhitungan</FieldLabel>
                    <Input
                      id="basis"
                      readOnly
                      className="tabular bg-muted/60"
                      value={money(tsi, slip.currency)}
                    />
                  </Field>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Total Premium</span>
                  <span className="tabular">
                    {money(premium, slip.currency)}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="disc">Discount (%)</FieldLabel>
                    <NumberInput
                      id="disc"
                      preset="percent"
                      className={PANEL_INPUT}
                      min={0}
                      max={100}
                      invalid={slip.discountPct < 0 || slip.discountPct > 100}
                      value={slip.discountPct || null}
                      onValueChange={(v) => set({ discountPct: v ?? 0 })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="admin">Admin Cost</FieldLabel>
                    <NumberInput
                      id="admin"
                      preset="money"
                      className={PANEL_INPUT}
                      value={slip.adminCost || null}
                      onValueChange={(v) => set({ adminCost: v ?? 0 })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="stamp">Stamp Duty</FieldLabel>
                    <NumberInput
                      id="stamp"
                      preset="money"
                      className={PANEL_INPUT}
                      value={slip.stampDuty || null}
                      onValueChange={(v) => set({ stampDuty: v ?? 0 })}
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
                {chargedPolicies > 0 ? (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Policy cost + stamp duty: {chargedPolicies} polis ×{" "}
                      {money(policyCharge, slip.currency)}
                    </span>
                    <span className="tabular">
                      {money(chargedPolicies * policyCharge, slip.currency)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t pt-3 text-[15px] font-bold text-primary">
                  <span>Total Payable</span>
                  <span className="tabular">
                    {money(payable, slip.currency)}
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Brokerage"
            {...sectionProps("brokerage")}
            summary={percent(effectiveBrokeragePct(slip), 2)}
          >
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="brokerage">Brokerage (%)</FieldLabel>
                  <NumberInput
                    id="brokerage"
                    preset="percent"
                    min={0}
                    max={100}
                    invalid={slip.brokeragePct < 0 || slip.brokeragePct > 100}
                    value={slip.brokeragePct || null}
                    onValueChange={(v) => set({ brokeragePct: v ?? 0 })}
                  />
                </Field>
                <Field orientation="horizontal" className="pb-2">
                  <Switch
                    id="vat"
                    checked={slip.includeVat}
                    onCheckedChange={(v) => set({ includeVat: Boolean(v) })}
                  />
                  <FieldLabel htmlFor="vat" className="font-normal">
                    Include VAT (PPN 2,2%)
                  </FieldLabel>
                </Field>
              </div>
              {brokerageLimit ? (
                brokerageIssue ? (
                  <p className="flex items-start gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    {brokerageIssue} Slip belum bisa disimpan sebelum brokerage
                    diperbaiki.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Batas OJK untuk {slip.cob}: {brokerageLimit}.
                  </p>
                )
              ) : null}
              {usesAdditionalFee(slip.cob) ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="additional-fee">
                      Additional Fee ({slip.currency})
                    </FieldLabel>
                    <NumberInput
                      id="additional-fee"
                      preset="money"
                      min={0}
                      value={slip.additionalFee || null}
                      onValueChange={(v) => set({ additionalFee: v ?? 0 })}
                    />
                    <FieldDescription>
                      Kosongkan kalau tidak ada. Hanya untuk produksi, tidak
                      dicetak di slip.
                    </FieldDescription>
                  </Field>
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/50 p-4 sm:grid-cols-2">
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
                {slip.includeVat ? (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        PPN 2,2% (termasuk)
                      </span>
                      <span className="tabular font-semibold">
                        {money(brokerageVatAmount(slip), slip.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Brokerage sebelum PPN
                      </span>
                      <span className="tabular font-semibold">
                        {money(
                          brokerageAmount(slip) - brokerageVatAmount(slip),
                          slip.currency
                        )}
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </SectionCard>

          {showQuotationSections ? (
            <>
              <SectionCard
                title="Subjectivity"
                description="Syarat yang harus dipenuhi sebelum polis diterbitkan."
                {...sectionProps("subjectivity")}
              >
                <Textarea
                  rows={5}
                  aria-label="Subjectivity"
                  value={slip.subjectivity ?? ""}
                  placeholder="1. …&#10;2. …"
                  disabled={locked}
                  onChange={(e) => set({ subjectivity: e.target.value })}
                />
              </SectionCard>

              <SectionCard
                title="Security (Panel Asuransi)"
                description="Struktur co-insurance — satu risiko dibagi ke beberapa insurer dengan share %."
                {...sectionProps("security")}
                action={
                  <span
                    className={cn(
                      "tabular rounded-full px-3 py-1 text-xs font-semibold",
                      totalShare === 100
                        ? "bg-success/12 text-success"
                        : "bg-warning/15 text-warning"
                    )}
                  >
                    Total share {num(totalShare, 2)}%
                  </span>
                }
              >
                <div className="flex flex-col gap-2">
                  <div className="hidden gap-3 text-xs text-muted-foreground lg:grid lg:grid-cols-[minmax(0,1fr)_120px_150px_40px]">
                    <span>Perusahaan Asuransi</span>
                    <span>Share (%)</span>
                    <span>{multiInsurer ? "Peran" : null}</span>
                    <span className="sr-only">Aksi</span>
                  </div>

                  {panel.map((row) => (
                    <div
                      key={row.id}
                      className={cn(
                        "flex flex-col gap-2 rounded-xl border bg-card p-3 lg:grid lg:grid-cols-[minmax(0,1fr)_120px_150px_40px] lg:items-center lg:gap-3 lg:p-0 lg:border-0 lg:bg-transparent",
                        row.insurer && duplicateInsurerNames.has(row.insurer) && "border-destructive/60"
                      )}
                    >
                      <Select
                        disabled={locked}
                        value={row.insurer || undefined}
                        onValueChange={(insurer) =>
                          patchPanelRow(row.id, { insurer: insurer ?? "" })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pilih asuransi…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {withCurrent(insurerItems, row.insurer).map((ins) => (
                              <SelectItem key={ins} value={ins}>
                                {ins}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>

                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 lg:contents">
                        <NumberInput
                          disabled={locked}
                          preset="percent"
                          min={0}
                          max={100}
                          value={row.share}
                          invalid={row.share <= 0 || row.share > 100}
                          aria-label={`Share ${row.insurer || "insurer"}`}
                          onValueChange={(val) =>
                            patchPanelRow(row.id, { share: val ?? 0 })
                          }
                        />

                        {multiInsurer ? (
                          <Select
                            disabled={locked}
                            value={row.role}
                            onValueChange={(role) => {
                              if (role === "As Leader") {
                                setLeader(row.id)
                              } else {
                                patchPanelRow(row.id, { role: "As Member" })
                              }
                            }}
                          >
                            <SelectTrigger className="w-full min-w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {ROLE_ITEMS.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span aria-hidden="true" />
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={locked || panel.length <= 1}
                          aria-label={`Hapus ${row.insurer || "panel"}`}
                          onClick={() => removePanelRow(row.id)}
                        >
                          <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={locked}
                      onClick={addPanelRow}
                    >
                      <Plus data-icon="inline-start" />
                      Tambah panel
                    </Button>
                    {panelValid ? (
                      <p className="flex items-center gap-1.5 text-xs text-success">
                        <CircleCheck className="size-3.5" />
                        Panel lengkap — siap generate dokumen.
                      </p>
                    ) : null}
                  </div>

                  {!panelValid ? (
                    <ul className="mt-1 flex flex-col gap-1 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
                      {pIssues.map((i) => (
                        <li key={i} className="flex gap-1.5">
                          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                          {i}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {panel.some((r) => r.insurer) ? (
                    <div className="mt-2 flex flex-col gap-1.5">
                      {panel
                        .filter((r) => r.insurer)
                        .map((r) => (
                          <div
                            key={`bar-${r.id}`}
                            className="flex items-center gap-3 text-xs"
                          >
                            <span className="w-40 truncate sm:w-64">
                              {r.insurer}
                              {multiInsurer ? (
                                <span className="ml-1 text-muted-foreground">
                                  ({r.role.replace("As ", "")})
                                </span>
                              ) : null}
                            </span>
                            <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                              <span
                                className={cn(
                                  "block h-full rounded-full",
                                  !multiInsurer || r.role === "As Leader"
                                    ? "bg-primary"
                                    : "bg-primary/45"
                                )}
                                style={{ width: `${Math.min(100, r.share)}%` }}
                              />
                            </span>
                            <span className="w-16 text-right tabular text-muted-foreground">
                              {num(r.share, 2)}%
                            </span>
                          </div>
                        ))}
                    </div>
                  ) : null}
                </div>
              </SectionCard>

              <SectionCard
                title="Closing Instruction"
                description="Instruksi penutupan untuk insurer saat slip di-close."
                {...sectionProps("closing")}
              >
                <Textarea
                  rows={4}
                  aria-label="Closing instruction"
                  value={slip.closingInstruction ?? ""}
                  placeholder="Masukkan closing instruction…"
                  disabled={locked}
                  onChange={(e) => set({ closingInstruction: e.target.value })}
                />
              </SectionCard>

              <SectionCard
                title="Catatan Draft Cover Note"
                description="Catatan tambahan untuk cover note (tanpa brokerage)."
                {...sectionProps("coverNote")}
              >
                <Textarea
                  rows={3}
                  aria-label="Catatan cover note"
                  value={slip.coverNoteRemarks ?? ""}
                  placeholder="Catatan cover note…"
                  disabled={locked}
                  onChange={(e) => set({ coverNoteRemarks: e.target.value })}
                />
              </SectionCard>
            </>
          ) : null}
        </fieldset>
      </SlipFormBody>

      <SlipFormActions>
        {canDestroy ? (
          <Button variant="destructive" onClick={() => setConfirmDestroy(true)}>
            {slip.status === "Draft" ? (
              <Trash2 data-icon="inline-start" />
            ) : (
              <Ban data-icon="inline-start" />
            )}
            {destroyLabel}
          </Button>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            render={<Link href="/underwriting" />}
            nativeButton={false}
          >
            {dirty ? "Batal" : "Tutup"}
          </Button>

          {isQuotation ? (
            <>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => goTo((id) => `/underwriting/slip/${id}`)}
              >
                <Eye data-icon="inline-start" />
                Lihat Placing Slip
              </Button>
              {!locked ? (
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={!canSave || isPending}
                >
                  <Save data-icon="inline-start" />
                  {isPending
                    ? "Menyimpan…"
                    : canSave
                      ? slip.status === "Draft"
                        ? "Simpan Draft"
                        : "Simpan Perubahan"
                      : "Tersimpan"}
                </Button>
              ) : null}
              <Button
                variant="outline"
                disabled={!panelValid || slip.status === "Draft" || isPending}
                title={!panelValid ? "Lengkapi panel asuransi dulu" : undefined}
                onClick={() => goTo((id) => `/underwriting/quotation/${id}`)}
              >
                <FileText data-icon="inline-start" />
                Quotation Slip
              </Button>
              <Button
                variant="outline"
                disabled={!panelValid || slip.status === "Draft" || isPending}
                title={!panelValid ? "Lengkapi panel asuransi dulu" : undefined}
                onClick={() => goTo((id) => `/underwriting/cover-note/${id}`)}
              >
                <ScrollText data-icon="inline-start" />
                Draft Cover Note
              </Button>
              {slip.status === "Closed" ? (
                <Button
                  disabled={isPending}
                  onClick={() => router.push(`/underwriting/closing/${slip.id}`)}
                >
                  <FileCheck2 data-icon="inline-start" />
                  Closing Instruction
                </Button>
              ) : (
                <Button
                  disabled={
                    !panelValid || slip.status === "Draft" || locked || isPending
                  }
                  onClick={() => setConfirmClose(true)}
                >
                  <FileCheck2 data-icon="inline-start" />
                  Terbitkan Closing Instruction
                </Button>
              )}
            </>
          ) : (
            <>
              {mode === "edit" ? (
                <Button
                  variant="outline"
                  onClick={() => goTo((id) => `/underwriting/slip/${id}`)}
                >
                  <Eye data-icon="inline-start" />
                  Lihat Dokumen
                </Button>
              ) : null}
              {!locked ? (
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={!canSave || isPending}
                >
                  <Save data-icon="inline-start" />
                  {isPending
                    ? "Menyimpan…"
                    : canSave
                      ? slip.status === "Draft"
                        ? "Simpan Draft"
                        : "Simpan Perubahan"
                      : "Tersimpan"}
                </Button>
              ) : null}
              {slip.status === "Draft" ? (
                <Button onClick={startRelease} disabled={isPending}>
                  <Send data-icon="inline-start" />
                  {isPending ? "Memproses…" : "Release & Generate No. Slip"}
                </Button>
              ) : slip.status === "Released" || slip.status === "Quoted" ? (
                <Button
                  onClick={() =>
                    goTo((id) => `/underwriting/quotation/edit/${id}`)
                  }
                  disabled={isPending}
                >
                  <Send data-icon="inline-start" />
                  Lanjut ke Quotation Slip
                </Button>
              ) : null}
            </>
          )}
        </div>
      </SlipFormActions>

      {/* Konfirmasi penerbitan closing instruction */}
      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terbitkan Closing Instruction?</AlertDialogTitle>
            <AlertDialogDescription>
              Penutupan akan di-close (status Closed) dan mengunci form dari
              perubahan. Pastikan semua detail quotation dan panel asuransi
              sudah disetujui klien.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={issueClosing}>
              Terbitkan &amp; Buka Dokumen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hal yang harus dilengkapi sebelum release */}
      <AlertDialog
        open={issues != null}
        onOpenChange={(open) => !open && setIssues(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slip belum bisa di-release</AlertDialogTitle>
            <AlertDialogDescription>
              Lengkapi dulu hal berikut, lalu coba lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="flex flex-col gap-1.5 text-sm">
            {issues?.map((issue) => (
              <li key={issue} className="flex gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                {issue}
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Mengerti</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRelease} onOpenChange={setConfirmRelease}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release placing slip?</AlertDialogTitle>
            <AlertDialogDescription>
              Nomor slip dibuat sekarang dan tidak bisa diubah
              {releaseNoPreview ? (
                <>
                  , perkiraan:{" "}
                  <span className="tabular font-semibold text-foreground">
                    {releaseNoPreview}
                  </span>
                </>
              ) : null}
              . Setelah release, slip bisa dilanjutkan ke Quotation Slip.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doRelease}>Release</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDestroy} onOpenChange={setConfirmDestroy}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {slip.status === "Draft"
                ? "Hapus draft placing slip ini?"
                : `Batalkan slip ${slip.slipNo}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {slip.status === "Draft"
                ? `Draft untuk ${slip.insuredName || "tertanggung"} dihapus permanen karena belum bernomor.`
                : "Slip bernomor tidak dihapus supaya nomor tidak bolong. Statusnya menjadi Dibatalkan dan slip tidak bisa diubah lagi."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={doDestroy}>
              {destroyLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <span className={cn("sr-only")} aria-live="polite">
        {dirty
          ? "Ada perubahan yang belum disimpan"
          : "Semua perubahan tersimpan"}
      </span>
    </PageShell>
  )
}
