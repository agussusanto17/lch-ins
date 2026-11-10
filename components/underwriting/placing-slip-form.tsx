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
import { NumberField, SelectInput } from "@/components/shared/form-fields"
import { useFormOptions } from "@/components/shared/form-options-provider"
import { SectionCard } from "@/components/shared/section-card"
import {
  SlipFormActions,
  SlipFormBody,
  SlipFormToolbar,
} from "@/components/underwriting/slip-form-chrome"
import { ClausePicker } from "@/components/underwriting/clause-picker"
import { DeductiblePerCover } from "@/components/underwriting/deductible-input"
import {
  LineItemList,
  StringList,
  TotalBar,
} from "@/components/underwriting/line-items"
import { InsuredPicker } from "@/components/underwriting/insured-picker"
import { InsurerCombobox } from "@/components/underwriting/insurer-combobox"
import { OccupationCombobox } from "@/components/underwriting/occupation-combobox"
import { SlipLocations } from "@/components/underwriting/slip-locations"
import { SlipItemRates } from "@/components/underwriting/slip-item-rates"
import { OpenCoverRates } from "@/components/underwriting/open-cover-rates"
import { SlipAttachments } from "@/components/underwriting/slip-attachments"
import { SlipParticipants } from "@/components/underwriting/slip-participants"
import { usesOpenCover } from "@/lib/open-cover"
import { effectivePaBenefitLimits } from "@/lib/pa-benefits"
import { participantsInterestItem, usesParticipants } from "@/lib/slip-participants"
import { SlipDetailRows } from "@/components/underwriting/slip-detail-rows"
import { SlipVehicles } from "@/components/underwriting/slip-vehicles"
import { type RateBounds } from "@/components/underwriting/ojk-reference"
import {
  coverCodeFor,
  DEFAULT_PERIOD_LABEL,
  DEFAULT_PERIOD_NOTE,
  joinCoverCodes,
  autoExpiryDate,
  nextCoverDefault,
  occupationParts,
  isOutOfBounds,
  isSingleDayPeriod,
  periodNoteNeedsTwoDates,
  propertyRateLinesPatch,
  rateLinesWithBounds,
  recalc,
  releaseIssues,
  switchCob,
  usesAdditionalFee,
  usesPropertyBlocks,
  sectionItemsPatch,
  slipSectionTitles,
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
} from "@/app/(app)/placement/actions"
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
import { letterheadFor } from "@/lib/document-dates"
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
  brokerageAmount,
  brokerageLimitIssue,
  brokerageLimitText,
  brokerageVatAmount,
  calculateParEqvet,
  discountAmount,
  effectiveBrokeragePct,
  isParEqvetSlip,
  parEqvetPolicyCharge,
  sumPercent,
  totalPayable,
  totalPremium,
  totalSumInsured,
  usesOjkTariff,
} from "@/lib/calc"
import {
  CLAUSES,
  type ClassOfBusiness,
  type PlacingSlip,
  type RateException,
  type RateLine,
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
import { cleanDetailLabels, withDetailLabels } from "@/lib/slip-details"
import { locationGroups, locationOwner } from "@/lib/slip-locations"
import {
  allowsFlatPremium,
  isLimitOnlyItem,
  itemOwner,
  itemSection,
} from "@/lib/slip-items"
import type { InsuredOption } from "@/lib/server/clients"
import { newId, store, useRecord } from "@/lib/store"
import { cn } from "@/lib/utils"

const SECTION_KEYS = [
  "basic",
  "details",
  "wording",
  "coverage",
  "interest",
  "participants",
  "sumInsured",
  "deductible",
  "attachments",
  "rate",
  "brokerage",
  "subjectivity",
  "security",
  "closing",
  "coverNote",
  "documentDates",
] as const
type SectionKey = (typeof SECTION_KEYS)[number]

/**
 * Tanggal yang dicetak di baris "Jakarta, …" tiap dokumen (Harry, 10 November
 * 2026). Draft Cover Note terbit setelah Closing Instruction, jadi ikut tanggal
 * closing (meeting LCH, 10 November 2026).
 */
const DOCUMENT_DATE_FIELDS = [
  { key: "releaseDate", label: "Placing Slip", hint: "Tanggal release" },
  { key: "quotedDate", label: "Quotation Slip", hint: "Tanggal quoted" },
  {
    key: "closingDate",
    label: "Closing Instruction & Draft Cover Note",
    hint: "Tanggal closing",
  },
] as const

const toItem = (v: string) => ({ label: v, value: v })
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
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
  mode: "new" | "edit" | "quotation" | "closing"
  vehicleOptions?: VehicleBrandOption[]
  clients: InsuredOption[]
}) {
  const stored = useRecord("slips", id ?? null)
  // Daftar slip tidak memuat peserta PA grup dan lampiran; ambil dari detail
  // slip. Lampiran selalu dari server karena berubah lewat aksinya sendiri.
  const source = stored
    ? {
        ...stored,
        participants: stored.participants ?? initial?.participants,
        attachments: initial?.attachments ?? stored.attachments,
      }
    : initial

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
          <Button render={<Link href="/placement" />} nativeButton={false}>
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
  mode: "new" | "edit" | "quotation" | "closing"
  vehicleOptions?: VehicleBrandOption[]
  clients: InsuredOption[]
}) {
  const router = useRouter()
  const today = useToday()
  const [isPending, startTransition] = React.useTransition()
  const [slip, setSlip] = React.useState<PlacingSlip>(() => recalc(initial))
  // Lampiran tersimpan langsung lewat aksinya, terpisah dari Simpan Draft.
  const [attachments, setAttachments] = React.useState(initial.attachments ?? [])
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
  const isClosing = mode === "closing"
  const showQuotationSections = isQuotation || isClosing || slip.status !== "Draft"

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
      // Polis otomatis tercatat di Policy Database (meeting LCH, 10 November 2026).
      if (res.notice) {
        toast.info("Policy Database", { description: res.notice, duration: 10000 })
      }
      router.push(`/placement/closing/${record.id}`)
    })
  }

  // Peringatan saat menutup tab dengan perubahan yang belum disimpan.
  React.useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [dirty])

  const locked = slip.status === "Cancelled"
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
  const currentCover = covers.find((c) => c.name === slip.typeOfCover)
  const deductibleChoices = deductibleChoicesFor(options, slip.cob, [
    slip.typeOfCover,
    slip.typeOfCover2 ?? "",
  ])
  const coverItems = withCurrent(
    covers.map((c) => c.name),
    slip.typeOfCover
  ).map(toItem)
  const coverItems2 = withCurrent(
    covers.map((c) => c.name),
    slip.typeOfCover2
  ).map(toItem)

  /** Token {COVER} nomor slip: singkatan type of cover pertama lalu kedua. */
  function slipCoverCode(typeOfCover: string, typeOfCover2?: string) {
    return joinCoverCodes(
      coverCodeFor(slip.cob, typeOfCover, covers),
      covers.find((c) => c.name === typeOfCover2)?.abbreviation
    )
  }
  /** Label bawaan Detail tambahan untuk type of cover pertama dan kedua. */
  function detailLabelsFor(typeOfCover?: string, typeOfCover2?: string) {
    return cleanDetailLabels(
      [typeOfCover, typeOfCover2].flatMap(
        (name) => covers.find((c) => c.name === name)?.detailLabels ?? []
      )
    )
  }
  const detailSuggestions = cleanDetailLabels(
    options.cobs.flatMap((c) => c.covers.flatMap((v) => v.detailLabels))
  )
  // Saran label periode: bawaan dokumen dan label periode semua type of cover.
  const periodLabelSuggestions = [
    ...new Set([
      DEFAULT_PERIOD_LABEL,
      ...options.cobs.flatMap((c) =>
        c.covers.flatMap((v) => (v.periodLabel?.trim() ? [v.periodLabel.trim()] : []))
      ),
    ]),
  ]
  const filledDetails = (slip.detailRows ?? []).filter((r) => r.value.trim()).length
  const wordingNames = options.wordingForms.map((w) => w.name)
  const insurerItems = options.insurers.map((ins) => ins.name)

  const lines = rateLinesWithBounds(slip)
  const locationCount = isProperty ? locationGroups(slip).length : 0
  const tsi = totalSumInsured(slip)
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

  const brokerageLimit = brokerageLimitText(slip)
  const brokerageIssue = brokerageLimitIssue(slip)
  // Klausula tanpa section dan Section 2 hanya untuk slip ber-section:
  // Property (Business Interruption) dan CAR/EAR (Third Party Liability).
  const sectionTitles = slipSectionTitles(slip)
  const clauseIds0 = sectionTitles ? (slip.clauseIdsGeneral ?? []) : []
  const clauseIds2 = sectionTitles ? (slip.clauseIdsSection2 ?? []) : []
  const clauseCount =
    clauseIds0.length + slip.clauseIds.length + clauseIds2.length
  const editedClauseCount =
    clauseIds0.filter((id) => slip.clauseOverridesGeneral?.[id]).length +
    slip.clauseIds.filter((id) => slip.clauseOverrides?.[id]).length +
    clauseIds2.filter((id) => slip.clauseOverridesSection2?.[id]).length
  const customWording = slip.wordingForms.filter(
    (w) => w && !wordingNames.includes(w)
  )

  /**
   * Isi satu baris rate dari panel referensi OJK, sekaligus catat batasnya.
   * Slip Property dan Motor Vehicle mengisi baris lokasi atau kendaraan yang
   * panelnya dipakai.
   */
  function applyOjkRate(
    label: string,
    value: number,
    bounds?: RateBounds,
    scope: { locationId?: string; vehicleId?: string } = {}
  ) {
    const location = locationOwner(slip)
    const vehicle = itemOwner(slip)
    const target = (l: RateLine) =>
      l.label.startsWith(label) &&
      (!scope.locationId || location(l.locationId) === scope.locationId) &&
      (!scope.vehicleId || vehicle(l.vehicleId) === scope.vehicleId)
    if (!slip.rateLines.some(target)) return
    setSlip((s) =>
      recalc({
        ...s,
        rateLines: s.rateLines.map((l) =>
          target(l)
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
    if (sectionTitles) {
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
      const res = await savePlacingSlipAction(
        toSend,
        isQuotation || isClosing ? "edit" : mode
      )
      if (!res.ok || !res.data) {
        toast.error("Gagal menyimpan slip", { description: res.error })
        return
      }
      const record = res.data
      store.upsert("slips", record)
      setSlip(record)
      setSavedJson(JSON.stringify(record))
      toast.success(
        record.status === "Draft"
          ? "Draft tersimpan"
          : record.status === "Closed"
            ? "Revisi tersimpan"
            : "Perubahan tersimpan",
        {
          description: record.slipNo ?? record.insuredName ?? undefined,
        }
      )
      if (mode === "new" || slip.id !== record.id) {
        router.replace(
          isClosing
            ? `/placement/closing/edit/${record.id}`
            : isQuotation
              ? `/placement/quotation/edit/${record.id}`
              : `/placement/edit/${record.id}`
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
          isQuotation || isClosing ? "edit" : mode
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
          isClosing
            ? `/placement/closing/edit/${record.id}`
            : isQuotation
              ? `/placement/quotation/edit/${record.id}`
              : `/placement/edit/${record.id}`
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
        router.push("/placement")
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
      if (sectionTitles) {
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
        const res = await savePlacingSlipAction(
          toSend,
          isQuotation || isClosing ? "edit" : mode
        )
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
    (mode === "edit" || isQuotation || isClosing) &&
    slip.status !== "Cancelled" &&
    slip.status !== "Closed"

  return (
    <PageShell className="gap-0 p-0">
      <SlipFormToolbar
        title={
          isClosing
            ? "Closing Instruction"
            : isQuotation
              ? "Quotation Slip"
              : mode === "new"
                ? "Buat Placing Slip Baru"
                : "Edit Placing Slip"
        }
        subtitle={`${slip.cob}${slip.typeOfCover ? ` · ${slip.typeOfCover}` : ""}`}
        status={slip.status}
        slipNo={slip.slipNo}
        backHref="/placement"
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
            {/* Open cover tidak punya TSI; nilai dicatat per deklarasi. */}
            {usesOpenCover(slip) ? (
              <span className="font-semibold text-foreground">Open cover</span>
            ) : (
              <>
                Total Sum Insured{" "}
                <span className="tabular font-semibold text-foreground">
                  {money(tsi, slip.currency)}
                </span>
              </>
            )}
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
        {slip.status === "Closed" ? (
          <p className="flex items-start gap-2 rounded-xl bg-info/10 border border-info/20 px-4 py-3 text-sm text-foreground">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            Closing instruction sudah diterbitkan. Anda tetap dapat melakukan revisi dan menyimpan perubahan di sini jika diperlukan.
          </p>
        ) : null}
        {locked ? (
          <p className="flex items-start gap-2 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
            <Ban className="mt-0.5 size-4 shrink-0" />
            Slip berstatus dibatalkan dan tidak bisa diubah lagi.
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
                      // Baris rate Property ikut type of cover, misalnya PSATSI
                      // memakai satu baris Terrorism & Sabotage.
                      ...propertyRateLinesPatch(
                        slip,
                        covers.find((c) => c.name === v)?.code
                      ),
                      typeOfCover: (v as string) ?? "",
                      typeOfCoverLabel: undefined,
                      coverCode: slipCoverCode(
                        (v as string) ?? "",
                        slip.typeOfCover2
                      ),
                      detailRows: withDetailLabels(
                        slip.detailRows,
                        detailLabelsFor((v as string) ?? "", slip.typeOfCover2)
                      ),
                      usesSections:
                        covers.find((c) => c.name === v)?.usesSections ?? false,
                      // Open cover bawaan type of cover, misalnya 0311 MOP.
                      openCover:
                        covers.find((c) => c.name === v)?.openCover ?? false,
                      // Heavy Equipment tanpa tarif OJK (Harry, 9 November 2026).
                      ojkTariff:
                        covers.find((c) => c.name === v)?.ojkTariff === false
                          ? false
                          : undefined,
                      periodLabel: nextCoverDefault(
                        slip.periodLabel,
                        covers.find((c) => c.name === slip.typeOfCover)?.periodLabel,
                        covers.find((c) => c.name === v)?.periodLabel
                      ),
                      periodEndText: nextCoverDefault(
                        slip.periodEndText,
                        covers.find((c) => c.name === slip.typeOfCover)?.periodEndText,
                        covers.find((c) => c.name === v)?.periodEndText
                      ),
                      // Lama periode bawaan mengisi tanggal akhir yang masih
                      // kosong, misalnya 14 hari setelah ETD.
                      expiryDate: autoExpiryDate({
                        inception: slip.inceptionDate,
                        previousInception: null,
                        expiry: slip.expiryDate,
                        days: covers.find((c) => c.name === v)?.periodDays,
                      }),
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

              {/*
               * CI LCH sering mencetak type of cover dengan nama panjang,
               * misalnya "PROPERTY ALL RISKS + RIOTS, STRIKES, ... INSURANCE."
               * (contoh SISKA RAHARJA, 5 November 2026). Master tidak berubah.
               */}
              <Field className="md:col-span-2">
                <FieldLabel htmlFor="toc-label">
                  Type of Cover di dokumen
                </FieldLabel>
                <Textarea
                  id="toc-label"
                  rows={2}
                  value={slip.typeOfCoverLabel ?? ""}
                  disabled={!slip.typeOfCover}
                  placeholder={slip.typeOfCover || "Pilih type of cover dulu"}
                  onChange={(e) =>
                    set({ typeOfCoverLabel: e.target.value || undefined })
                  }
                />
                <FieldDescription>
                  Kosongkan untuk mencetak nama type of cover dari master.
                </FieldDescription>
              </Field>

              {isProperty ? (
                <Field className="md:col-span-2">
                  <FieldLabel>Type of Cover Earthquake</FieldLabel>
                  <Select
                    items={[
                      { label: "Tanpa Earthquake", value: null },
                      ...coverItems2,
                    ]}
                    value={slip.typeOfCover2 || null}
                    onValueChange={(v) =>
                      set({
                        typeOfCover2: (v as string) ?? "",
                        typeOfCover2Label: undefined,
                        coverCode: slipCoverCode(
                          slip.typeOfCover,
                          (v as string) ?? ""
                        ),
                        detailRows: withDetailLabels(
                          slip.detailRows,
                          detailLabelsFor(slip.typeOfCover, (v as string) ?? "")
                        ),
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value={null}>Tanpa Earthquake</SelectItem>
                        {coverItems2.map((i) => (
                          <SelectItem key={i.value} value={i.value}>
                            {i.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Untuk slip PAR + EQVET. Dicetak di bawah type of cover di
                    atas dan dipakai polis EQVET.
                  </FieldDescription>
                </Field>
              ) : null}

              {isProperty && slip.typeOfCover2 ? (
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="toc2-label">
                    Type of Cover Earthquake di dokumen
                  </FieldLabel>
                  <Textarea
                    id="toc2-label"
                    rows={2}
                    value={slip.typeOfCover2Label ?? ""}
                    placeholder={slip.typeOfCover2}
                    onChange={(e) =>
                      set({ typeOfCover2Label: e.target.value || undefined })
                    }
                  />
                  <FieldDescription>
                    Kosongkan untuk mencetak nama type of cover dari master.
                  </FieldDescription>
                </Field>
              ) : null}

              <InsuredPicker
                clients={clients}
                clientId={slip.clientId}
                insuredName={slip.insuredName}
                insuredDescription={slip.insuredDescription}
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
                        set({
                          inceptionDate: e.target.value || null,
                          // Tanggal akhir ikut tanggal mulai bila type of
                          // cover punya lama periode bawaan dan tanggal
                          // akhirnya belum diubah sendiri.
                          expiryDate: autoExpiryDate({
                            inception: e.target.value || null,
                            previousInception: slip.inceptionDate,
                            expiry: slip.expiryDate,
                            days: currentCover?.periodDays,
                          }),
                        })
                      }
                    />
                    {currentCover?.periodDays != null ? (
                      <FieldDescription>
                        {currentCover.periodDays === 0
                          ? "Expiry date otomatis sama dengan inception date (satu hari). Bisa diubah."
                          : `Expiry date otomatis ${currentCover.periodDays} hari setelah inception date. Bisa diubah.`}
                      </FieldDescription>
                    ) : null}
                  </Field>
                  <Field
                    data-invalid={
                      slip.inceptionDate &&
                      slip.expiryDate &&
                      slip.expiryDate < slip.inceptionDate
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
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="period-note">
                      Keterangan periode
                    </FieldLabel>
                    <Input
                      id="period-note"
                      value={slip.periodNote ?? ""}
                      placeholder={DEFAULT_PERIOD_NOTE}
                      onChange={(e) => set({ periodNote: e.target.value })}
                    />
                    <FieldDescription>
                      {isSingleDayPeriod(slip) &&
                      periodNoteNeedsTwoDates(slip.periodNote)
                        ? "Tanggal mulai dan akhir sama, jadi keterangan yang menyebut “both days” tidak dicetak."
                        : "Dicetak di bawah periode asuransi, seperti CI LCH. Kosongkan bila tidak perlu."}
                    </FieldDescription>
                  </Field>
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="period-end-text">
                      Teks akhir periode di dokumen
                    </FieldLabel>
                    <Input
                      id="period-end-text"
                      maxLength={200}
                      value={slip.periodEndText ?? ""}
                      placeholder="Kosongkan untuk mencetak tanggal akhir"
                      onChange={(e) => set({ periodEndText: e.target.value })}
                    />
                    <FieldDescription>
                      Pengganti tanggal akhir di dokumen, misalnya &ldquo;until
                      final destination&rdquo; untuk single shipment: tercetak
                      tanggal mulai lalu teks ini, tanpa keterangan periode.
                      Expiry date tetap disimpan untuk polis.
                    </FieldDescription>
                  </Field>
                </>
              ) : null}

              <Field className="md:col-span-2">
                <FieldLabel htmlFor="period-label">
                  Label periode di dokumen
                </FieldLabel>
                <Input
                  id="period-label"
                  list="period-label-options"
                  maxLength={200}
                  value={slip.periodLabel ?? ""}
                  placeholder={DEFAULT_PERIOD_LABEL}
                  onChange={(e) => set({ periodLabel: e.target.value })}
                />
                <datalist id="period-label-options">
                  {periodLabelSuggestions.map((label) => (
                    <option key={label} value={label} />
                  ))}
                </datalist>
                <FieldDescription>
                  Misalnya Estimated Time of Departure (ETD) untuk single
                  shipment atau Date of Tournament untuk Hole in One. Tanggal
                  mulai dan akhir yang sama dicetak satu tanggal.
                </FieldDescription>
              </Field>

              <Field className="md:col-span-2">
                <FieldLabel htmlFor="period-text">
                  Teks periode di dokumen
                </FieldLabel>
                <Textarea
                  id="period-text"
                  rows={2}
                  maxLength={1000}
                  value={slip.periodText ?? ""}
                  placeholder={
                    slip.periodTba
                      ? "Kosongkan untuk mencetak To Be Advised"
                      : "Kosongkan untuk mencetak tanggal dan keterangan periode"
                  }
                  onChange={(e) => set({ periodText: e.target.value })}
                />
                <FieldDescription>
                  Dicetak sebagai pengganti tanggal, misalnya &ldquo;23rd /
                  24th / 25th October 2026 until final destination&rdquo;.
                  Tanggal tetap disimpan untuk polis.
                </FieldDescription>
              </Field>

              {/* Okupasi, risk location, dan kelas slip Property diisi per lokasi. */}
              {isProperty ? null : usesPropertyBlocks(slip.cob) ? (
                <>
                  <Field className="md:col-span-2">
                    <FieldLabel>Okupasi (OJK)</FieldLabel>
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                      <Textarea
                        id="occupation-label"
                        rows={2}
                        value={
                          slip.occupationLabel ??
                          occupationParts(slip.occupation).name
                        }
                        placeholder={
                          occupationParts(slip.occupation).name ||
                          "Ketik okupasi, misalnya Office"
                        }
                        onChange={(e) =>
                          set({ occupationLabel: e.target.value })
                        }
                      />
                      {slip.occupation && slip.occupationLabel !== undefined ? (
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
                        : "Boleh diketik tanpa kode OJK, misalnya Office atau Insurance Broker. Dicetak apa adanya; kode OJK hanya dipakai tarif Property."}
                    </FieldDescription>
                  </Field>
                  <Field className="md:col-span-2">
                    <FieldLabel htmlFor="risk">Risk Location</FieldLabel>
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
                    placeholder={
                      usesOjkTariff(slip)
                        ? "Alamat garasi atau kota domisili, dipakai menentukan wilayah tarif OJK"
                        : "Alamat garasi atau kota domisili"
                    }
                    onChange={(e) => set({ riskLocation: e.target.value })}
                  />
                </Field>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Detail Tambahan"
            {...sectionProps("details")}
            summary={filledDetails ? `${filledDetails} baris terisi` : undefined}
          >
            <SlipDetailRows
              rows={slip.detailRows ?? []}
              defaults={detailLabelsFor(slip.typeOfCover, slip.typeOfCover2)}
              suggestions={detailSuggestions}
              locked={locked}
              onChange={(detailRows) => set({ detailRows })}
            />
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
                : money(totalSumInsured(slip), slip.currency)
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
                {/*
                 * CAR dan EAR LCH dibagi Section 1 Material Damage dan Section 2
                 * Third Party Liability. Nilai awalnya dari type of cover.
                 */}
                {allowsFlatPremium(slip.cob) ? (
                  <Field orientation="horizontal">
                    <Switch
                      id="uses-sections"
                      checked={slip.usesSections ?? false}
                      disabled={locked}
                      onCheckedChange={(v) => set({ usesSections: v })}
                    />
                    <FieldLabel htmlFor="uses-sections">
                      Pakai Section 1 &amp; 2 (Material Damage dan Third Party
                      Liability)
                    </FieldLabel>
                  </Field>
                ) : null}
                {sectionTitles && !isProperty ? (
                  ([1, 2] as const).map((section) => (
                    <div key={section} className="flex flex-col gap-2">
                      <p className="text-sm font-medium">
                        {sectionTitles[section - 1]}
                      </p>
                      <LineItemList
                        items={slip.interestItems.filter(
                          (i) => itemSection(i) === section
                        )}
                        onChange={(items) =>
                          set(sectionItemsPatch(slip, section, items))
                        }
                        descPlaceholder={
                          section === 1
                            ? "Misalnya Contract Works atau Existing Structures"
                            : "Misalnya Third Party Liability any one occurrence and in the aggregate"
                        }
                        amountPlaceholder={section === 1 ? "Nilai" : "Limit"}
                        multiline
                        addLabel={
                          section === 1 ? "Tambah objek Section 1" : "Tambah limit Section 2"
                        }
                      />
                    </div>
                  ))
                ) : usesParticipants(slip.cob) && slip.participants?.length ? (
                  <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm">
                    Interest Insured diisi dari Daftar Peserta:{" "}
                    <span className="font-medium">
                      {slip.interestItems[0]?.description}
                    </span>
                    . Ubah peserta di bagian Daftar Peserta.
                  </p>
                ) : (
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
                    limitToggle={usesOpenCover(slip)}
                  />
                )}
                {/*
                 * Objek "limit saja" tidak ikut total. Diatur lewat Dasar di
                 * Rate & Premium, atau centang di atas untuk slip open cover.
                 */}
                <TotalBar
                  label={
                    slip.interestItems.some((i) => isLimitOnlyItem(slip.cob, i))
                      ? "Total Interest Insured (tanpa limit)"
                      : "Total Interest Insured"
                  }
                  value={money(totalSumInsured(slip), slip.currency)}
                />
              </div>
            )}
          </SectionCard>

          {/*
           * Peserta PA grup per orang (Harry, 6 November 2026): lampiran slip,
           * dan dasar klaim serta endorsement tambah/kurang peserta.
           */}
          {usesParticipants(slip.cob) ? (
            <SectionCard
              title="Daftar Peserta"
              {...sectionProps("participants")}
              summary={
                slip.participants?.length
                  ? `${slip.participants.length.toLocaleString("id-ID")} peserta`
                  : undefined
              }
            >
              <div className="flex flex-col gap-5">
                {/*
                 * Limit manfaat untuk peringatan klaim (Harry, 7 November
                 * 2026). Bawaan dari contoh slip PA LCH.
                 */}
                {options.paBenefits.length ? (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {options.paBenefits.map((b) => {
                        const limits = effectivePaBenefitLimits(slip.paBenefitLimits)
                        return (
                          <NumberField
                            key={b.code}
                            label={`Limit ${b.name} (% UP)`}
                            preset="percent"
                            min={0}
                            max={1000}
                            readOnly={locked}
                            value={limits[b.code] ?? null}
                            onValueChange={(v) => {
                              const next = { ...limits }
                              if (v == null) delete next[b.code]
                              else next[b.code] = v
                              set({ paBenefitLimits: next })
                            }}
                          />
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Dipakai untuk peringatan klaim. Manfaat yang dicetak di slip
                      tetap ditulis di Special Conditions.
                    </p>
                  </div>
                ) : null}
                <SlipParticipants
                  participants={slip.participants ?? []}
                  currency={slip.currency}
                  locked={locked}
                  onChange={(list) =>
                    set({
                      participants: list,
                      interestItems: list.length ? [participantsInterestItem(list)] : [],
                    })
                  }
                />
              </div>
            </SectionCard>
          ) : null}

          {isProperty ? (
            <SectionCard
              title="Lokasi & Sum Insured *"
              {...sectionProps("sumInsured")}
              summary={`${locationCount} lokasi · ${money(tsi, slip.currency)}`}
              action={
                unresolved ? (
                  <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                    {unresolved} rate butuh alasan
                  </span>
                ) : undefined
              }
            >
              <SlipLocations
                slip={slip}
                lines={lines}
                locked={locked}
                onChange={set}
                onPickRate={(locationId, label, value, bounds) =>
                  applyOjkRate(label, value, bounds, { locationId })
                }
                onPickIndemnity={(months) =>
                  set({ indemnityPeriod: `${months} months` })
                }
                onExceptionChange={setException}
              />
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
               * Oktober 2026), sampai lima isian per cover. Slip Motor Vehicle
               * bisa menambah baris Personal Accident dan Third Party Liability
               * (keduanya 4 November 2026).
               */}
              <Field>
                <FieldLabel htmlFor="deductible-intro">
                  Kalimat pengantar deductible
                </FieldLabel>
                <Textarea
                  id="deductible-intro"
                  rows={2}
                  maxLength={500}
                  placeholder="Misalnya: Any one loss or series of losses arising out of any one event:"
                  value={slip.deductibleIntro ?? ""}
                  onChange={(e) => set({ deductibleIntro: e.target.value })}
                />
                <FieldDescription>
                  Dicetak di atas daftar deductible. Kosongkan kalau tidak
                  perlu.
                </FieldDescription>
              </Field>

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
                  {locationCount > 1 ? (
                    <p className="text-xs text-muted-foreground">
                      Berlaku untuk semua lokasi. Deductible yang beda per
                      lokasi ditulis sebagai isian terpisah dengan lokasinya,
                      misalnya &quot;Nil (for Location 1)&quot;.
                    </p>
                  ) : null}
                </div>
                <DeductiblePerCover
                  slip={slip}
                  choices={deductibleChoices}
                  onChange={set}
                />
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

              {sectionTitles ? (
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="text-sm font-medium">Clauses</p>
                    <p className="text-xs text-muted-foreground">
                      Klausula untuk seluruh polis, tanpa section. Dicetak
                      paling atas, sebelum Section 1.
                    </p>
                  </div>
                  <ClausePicker
                    cob={slip.cob}
                    typeOfCover={slip.typeOfCover}
                    typeOfCover2={slip.typeOfCover2}
                    selected={clauseIds0}
                    taken={[...slip.clauseIds, ...clauseIds2]}
                    overrides={slip.clauseOverridesGeneral ?? {}}
                    copies={slip.clauseCopiesGeneral}
                    onChange={(ids) => set({ clauseIdsGeneral: ids })}
                    onOverridesChange={(o) =>
                      set({ clauseOverridesGeneral: o })
                    }
                    masterClauses={masterClauses}
                  />
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">
                  {sectionTitles ? `Clauses ${sectionTitles[0]}` : "Clauses"}
                </p>
                <ClausePicker
                  cob={slip.cob}
                  typeOfCover={slip.typeOfCover}
                  typeOfCover2={slip.typeOfCover2}
                  selected={slip.clauseIds}
                  taken={sectionTitles ? [...clauseIds0, ...clauseIds2] : undefined}
                  overrides={slip.clauseOverrides ?? {}}
                  copies={slip.clauseCopies}
                  onChange={(ids) => set({ clauseIds: ids })}
                  onOverridesChange={(o) => set({ clauseOverrides: o })}
                  // Slip tanpa section boleh mengelompokkan klausul dengan
                  // judul, misalnya Extensions dan General Conditions.
                  {...(sectionTitles
                    ? {}
                    : {
                        groups: slip.clauseGroups,
                        onGroupsChange: (g: Record<string, string>) =>
                          set({ clauseGroups: g }),
                      })}
                  masterClauses={masterClauses}
                />
              </div>

              {sectionTitles ? (
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      Clauses {sectionTitles[1]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pilih klausula khusus Section 2. Setiap klausula hanya boleh dipilih di satu kelompok.
                    </p>
                  </div>
                  <ClausePicker
                    cob={slip.cob}
                    typeOfCover={slip.typeOfCover}
                    typeOfCover2={slip.typeOfCover2}
                    selected={clauseIds2}
                    taken={[...clauseIds0, ...slip.clauseIds]}
                    overrides={slip.clauseOverridesSection2 ?? {}}
                    copies={slip.clauseCopiesSection2}
                    onChange={(ids) => set({ clauseIdsSection2: ids })}
                    onOverridesChange={(o) =>
                      set({ clauseOverridesSection2: o })
                    }
                    masterClauses={masterClauses}
                  />
                </div>
              ) : null}

              {/* Validation warning for duplicate clauses */}
              {sectionTitles && (
                <div className="flex flex-col gap-2">
                  {(() => {
                    const issues = validateClauseUniquenessAcrossSections(
                      {
                        clauseIds: slip.clauseIds ?? [],
                        clauseIdsSection2: slip.clauseIdsSection2 ?? [],
                        clauseIdsGeneral: slip.clauseIdsGeneral ?? [],
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

              <Field>
                <FieldLabel htmlFor="exclusions">Exclusions</FieldLabel>
                <Textarea
                  id="exclusions"
                  rows={4}
                  maxLength={4000}
                  placeholder={
                    "Satu exclusion per baris, misalnya\na) Workers Compensation Risks\nb) Professional liability"
                  }
                  value={slip.exclusions ?? ""}
                  onChange={(e) => set({ exclusions: e.target.value })}
                />
                <FieldDescription>
                  Dicetak sebagai blok EXCLUSIONS setelah CLAUSES. Ketik
                  nomornya sendiri, misalnya a) atau 1); baris tanpa nomor
                  dicetak apa adanya.
                </FieldDescription>
              </Field>
            </div>
          </SectionCard>

          {/*
           * Lampiran slip (vessel schedule, daftar unit, klausul hasil scan),
           * analisa contoh slip LCH Tahap 3 nomor 19.
           */}
          <SectionCard
            title="Lampiran"
            {...sectionProps("attachments")}
            summary={attachments.length ? `${attachments.length} file` : undefined}
          >
            <SlipAttachments
              slipId={mode !== "new" && UUID_RE.test(slip.id) ? slip.id : null}
              attachments={attachments}
              locked={locked}
              onChange={setAttachments}
            />
          </SectionCard>

          <SectionCard
            title="Rate & Premium"
            {...sectionProps("rate")}
            summary={usesOpenCover(slip) ? "Open cover" : money(payable, slip.currency)}
            action={
              unresolved ? (
                <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                  {unresolved} rate butuh alasan
                </span>
              ) : undefined
            }
          >
            <div className="flex flex-col gap-4">
              {isProperty ? (
                <p className="text-xs text-muted-foreground">
                  Rate slip Property diisi per lokasi di bagian Lokasi &amp; Sum
                  Insured.
                </p>
              ) : null}

              {isMotor ? (
                <SlipVehicles
                  slip={slip}
                  lines={lines}
                  locked={locked}
                  onChange={set}
                  onPickRate={(vehicleId, label, value, bounds) =>
                    applyOjkRate(label, value, bounds, { vehicleId })
                  }
                  onExceptionChange={setException}
                />
              ) : null}

              {/*
               * Open cover (MOP, container): rate per kategori tanpa TSI dan
               * premi; premi dicatat per deklarasi di polis.
               */}
              {!isProperty && !isMotor ? (
                <Field orientation="horizontal">
                  <Switch
                    id="open-cover"
                    checked={slip.openCover ?? false}
                    disabled={locked}
                    onCheckedChange={(v) => set({ openCover: v })}
                  />
                  <FieldLabel htmlFor="open-cover">
                    Open cover: rate per kategori tanpa premi pasti, premi
                    dicatat per deklarasi di polis
                  </FieldLabel>
                </Field>
              ) : null}

              {usesOpenCover(slip) ? (
                <OpenCoverRates
                  rates={slip.openCoverRates ?? []}
                  currency={slip.currency}
                  locked={locked}
                  onChange={(rows) => set({ openCoverRates: rows })}
                />
              ) : null}

              {!isProperty && !isMotor && !usesOpenCover(slip) ? (
                <SlipItemRates slip={slip} locked={locked} onChange={set} />
              ) : null}

              {usesOpenCover(slip) ? null : (
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
              )}
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
                    {usesOpenCover(slip)
                      ? "Per deklarasi"
                      : money(brokerageAmount(slip), slip.currency)}
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
                      <InsurerCombobox
                        disabled={locked}
                        items={withCurrent(insurerItems, row.insurer)}
                        value={row.insurer}
                        aria-label="Perusahaan asuransi"
                        onValueChange={(insurer) =>
                          patchPanelRow(row.id, { insurer })
                        }
                      />

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

          <SectionCard
            title="Tanggal Dokumen"
            description="Dicetak di baris “Jakarta, …” di atas tanda tangan. Terisi otomatis saat slip di-release, quoted, dan closing; ubah untuk dokumen lama."
            {...sectionProps("documentDates")}
          >
            <div className="grid gap-4 md:grid-cols-3">
              {DOCUMENT_DATE_FIELDS.map((field) => {
                const value = slip[field.key] ?? ""
                const lestari = value !== "" && letterheadFor(value) === "lestari"
                return (
                  <Field key={field.key}>
                    <FieldLabel htmlFor={`document-date-${field.key}`}>
                      {field.label}
                    </FieldLabel>
                    <Input
                      id={`document-date-${field.key}`}
                      type="date"
                      value={value}
                      disabled={locked}
                      onChange={(e) => {
                        const patch: Partial<PlacingSlip> = {}
                        patch[field.key] = e.target.value || null
                        set(patch)
                      }}
                    />
                    <FieldDescription>
                      {lestari
                        ? `${field.hint} · kop Lestari Cipta Hokindo`
                        : field.hint}
                    </FieldDescription>
                  </Field>
                )
              })}
            </div>
          </SectionCard>
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
            render={<Link href="/placement" />}
            nativeButton={false}
          >
            {dirty ? "Batal" : "Tutup"}
          </Button>

          {isClosing ? (
            <>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => goTo((id) => `/placement/quotation/${id}`)}
              >
                <FileText data-icon="inline-start" />
                Quotation Slip
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
                      ? slip.status === "Closed"
                        ? "Simpan Revisi"
                        : "Simpan Perubahan"
                      : "Tersimpan"}
                </Button>
              ) : null}
              <Button
                variant="outline"
                disabled={
                  slip.status === "Closed"
                    ? isPending
                    : !panelValid || slip.status === "Draft" || isPending
                }
                title={
                  slip.status !== "Closed" && !panelValid
                    ? "Lengkapi panel asuransi dulu"
                    : undefined
                }
                onClick={() => goTo((id) => `/placement/closing/${id}`)}
              >
                <FileCheck2 data-icon="inline-start" />
                Dokumen Closing
              </Button>
              {/* Draft Cover Note terbit setelah Closing Instruction (meeting LCH, 10 November 2026). */}
              <Button
                variant="outline"
                disabled={slip.status !== "Closed" || isPending}
                title={
                  slip.status !== "Closed"
                    ? "Tersedia setelah Closing Instruction diterbitkan"
                    : undefined
                }
                onClick={() => goTo((id) => `/placement/cover-note/${id}`)}
              >
                <ScrollText data-icon="inline-start" />
                Draft Cover Note
              </Button>
              {slip.status !== "Closed" ? (
                <Button
                  disabled={
                    !panelValid || slip.status === "Draft" || locked || isPending
                  }
                  onClick={() => setConfirmClose(true)}
                >
                  <FileCheck2 data-icon="inline-start" />
                  Terbitkan Closing Instruction
                </Button>
              ) : null}
            </>
          ) : isQuotation ? (
            <>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => goTo((id) => `/placement/slip/${id}`)}
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
                onClick={() => goTo((id) => `/placement/quotation/${id}`)}
              >
                <FileText data-icon="inline-start" />
                Quotation Slip
              </Button>
              <Button
                disabled={!panelValid || slip.status === "Draft" || isPending}
                title={!panelValid ? "Lengkapi panel asuransi dulu" : undefined}
                onClick={() => goTo((id) => `/placement/closing/edit/${id}`)}
              >
                <Send data-icon="inline-start" />
                Lanjut ke Closing Instruction
              </Button>
            </>
          ) : (
            <>
              {mode === "edit" ? (
                <Button
                  variant="outline"
                  onClick={() => goTo((id) => `/placement/slip/${id}`)}
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
              ) : slip.status === "Released" ||
                slip.status === "Quoted" ||
                slip.status === "Closed" ? (
                <Button
                  onClick={() =>
                    goTo((id) => `/placement/quotation/edit/${id}`)
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
              Penutupan akan di-close (status Closed) dan dokumen Closing Instruction siap dicetak. Detail penutupan tetap dapat diedit kembali jika membutuhkan revisi.
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
