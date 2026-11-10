"use client"

import * as React from "react"
import {
  FilePlus2,
  FileText,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { deletePolicyAction } from "@/app/(app)/policies/actions"
import { useToday } from "@/components/layout/today-provider"
import { PageHeader } from "@/components/layout/page-header"
import { PolicyFilesSheet } from "@/components/policies/policy-files-sheet"
import { PolicyParticipantsSheet } from "@/components/policies/policy-participants-sheet"
import { PolicyForm } from "@/components/policies/policy-form"
import {
  ACTION_COL_CLASS,
  RowActions,
  type RowAction,
} from "@/components/shared/row-actions"
import { StatusBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import { TablePagination, usePagination } from "@/components/shared/table-pagination"
import { ExportButtons, SearchInput } from "@/components/shared/table-toolbar"
import { usePermission } from "@/components/auth/permission-provider"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useCobFilterItems,
  useFormOptions,
} from "@/components/shared/form-options-provider"
import {
  POLICY_TYPE_CODES,
  fixedLookupItems,
  fixedLookupLabel,
} from "@/lib/form-options"
import {
  POLICY_TYPES,
  policyStatus,
  premiumIdr,
  type PlacingSlip,
  type Policy,
  type PolicyType,
} from "@/lib/data"
import { addMonths } from "@/lib/date"
import type { ExportSpec } from "@/lib/export"
import { dateShort, money, rupiah } from "@/lib/format"
import type { ClientOption } from "@/lib/server/clients"
import { MAIN_POLICY_FILE_KINDS, latestPolicyFile } from "@/lib/policy-files"
import { parentPolicyNote } from "@/lib/policy-parent"
import type { PolicyFormOptions } from "@/lib/server/policies"
import { store } from "@/lib/store"

const STATUS_ITEMS = [
  { label: "Semua status", value: "all" },
  { label: "Active", value: "Active" },
  { label: "Expiring", value: "Expiring" },
  { label: "Expired", value: "Expired" },
]

/** File jenis Polis dari asuransi sudah diunggah atau belum (meeting LCH, 10 November 2026). */
const POLICY_FILE_ITEMS = [
  { label: "Semua berkas", value: "all" },
  { label: "Polis sudah diunggah", value: "uploaded" },
  { label: "Polis belum diunggah", value: "missing" },
]

type FormState = {
  key: number
  policy: Policy | null
  preset?: Partial<Policy>
}

export function PolicyDatabase({
  initialPolicies,
  clientOptions,
  formOptions,
  slips,
  claimCounts,
}: {
  initialPolicies: Policy[]
  clientOptions: ClientOption[]
  formOptions: PolicyFormOptions
  /** Slip yang bisa ditautkan ke polis. */
  slips: PlacingSlip[]
  /** Jumlah klaim per id polis. */
  claimCounts: Record<string, number>
}) {
  const cobItems = useCobFilterItems()
  // Nama tipe polis dari Master Data.
  const masterOptions = useFormOptions()
  const today = useToday()
  const permission = usePermission()
  const canManage = permission.canManage("/policies")
  const [, startDelete] = React.useTransition()

  const policies = initialPolicies

  // Downstream modules (dashboard, renewal notice, claims) still read the store.
  React.useEffect(() => {
    store.replace("policies", initialPolicies)
  }, [initialPolicies])

  const [query, setQuery] = React.useState("")
  const [cob, setCob] = React.useState("all")
  const [status, setStatus] = React.useState("all")
  const [fileFilter, setFileFilter] = React.useState("all")
  const [tab, setTab] = React.useState<"all" | PolicyType>("all")
  const [form, setForm] = React.useState<FormState | null>(null)
  const [filesFor, setFilesFor] = React.useState<string | null>(null)
  const [participantsFor, setParticipantsFor] = React.useState<string | null>(null)

  const openForm = (policy: Policy | null, preset?: Partial<Policy>) =>
    // Key baru setiap kali form dibuka supaya isiannya selalu mulai dari data terbaru.
    setForm((prev) => ({ key: (prev?.key ?? 0) + 1, policy, preset }))

  const base = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return policies.filter((p) => {
      if (cob !== "all" && p.cob !== cob) return false
      if (status !== "all" && policyStatus(p.expiryDate, today) !== status)
        return false
      if (
        fileFilter !== "all" &&
        (fileFilter === "uploaded") !== Boolean(latestPolicyFile(p.files, "Policy"))
      )
        return false
      if (!q) return true
      return [p.policyNo, p.insuredName, p.insurer, p.riskLocation].some((v) =>
        v.toLowerCase().includes(q)
      )
    })
  }, [policies, query, cob, status, fileFilter, today])

  const rows = tab === "all" ? base : base.filter((p) => p.type === tab)
  const totalPremium = rows.reduce((a, p) => a + premiumIdr(p), 0)
  const policyNoById = new Map(policies.map((p) => [p.id, p.policyNo]))
  // "renewal dari …", "endorsement …", atau "pembatalan …" di bawah no. polis.
  const parentNote = (p: Policy) =>
    parentPolicyNote({
      type: p.type,
      previousPolicyNo: p.previousPolicyNo,
      parentPolicyNo: p.parentPolicyId ? (policyNoById.get(p.parentPolicyId) ?? "—") : null,
    })

  const {
    page,
    pageSize,
    totalItems,
    paginatedItems: paginatedRows,
    setPage,
    setPageSize,
  } = usePagination(rows, 10)

  function actionsFor(p: Policy): RowAction[] {
    // Peserta PA grup: polis General Accident, termasuk endorsement-nya.
    const participantsAction: RowAction[] =
      p.cob === "General Accident"
        ? [
            {
              label: p.participantCount
                ? `Peserta (${p.participantCount.toLocaleString("id-ID")})`
                : "Peserta",
              icon: Users,
              onSelect: () => setParticipantsFor(p.id),
            },
          ]
        : []
    if (!canManage) {
      return [
        {
          label: "Berkas polis",
          icon: FileText,
          onSelect: () => setFilesFor(p.id),
        },
        ...participantsAction,
      ]
    }

    const claimCount = claimCounts[p.id] ?? 0
    const childCount = policies.filter((x) => x.parentPolicyId === p.id).length
    const blocked = claimCount > 0 || childCount > 0
    const renewable = p.type === "Baru" || p.type === "Renewal"
    const actions: RowAction[] = [
      { label: "Edit polis", icon: Pencil, onSelect: () => openForm(p) },
      {
        label: "Berkas polis",
        icon: FileText,
        onSelect: () => setFilesFor(p.id),
      },
      ...participantsAction,
    ]
    if (renewable) {
      actions.push(
        {
          label: "Buat renewal",
          icon: RefreshCcw,
          onSelect: () =>
            openForm(null, {
              type: "Renewal",
              parentPolicyId: p.id,
              clientId: p.clientId,
              insuredName: p.insuredName,
              insurer: p.insurer,
              insurers: p.insurers,
              cob: p.cob,
              typeOfCover: p.typeOfCover,
              currency: p.currency,
              riskLocation: p.riskLocation,
              brokeragePct: p.brokeragePct,
              cobOjkClassId: p.cobOjkClassId,
              placementLocationId: p.placementLocationId,
              groupingInsured: p.groupingInsured,
              sumInsured: p.sumInsured,
              inceptionDate: p.expiryDate,
              expiryDate: addMonths(p.expiryDate, 12),
            }),
        },
        {
          label: "Buat endorsement",
          icon: FilePlus2,
          onSelect: () =>
            openForm(null, {
              type: "Endorsement",
              parentPolicyId: p.id,
              clientId: p.clientId,
              insuredName: p.insuredName,
              insurer: p.insurer,
              insurers: p.insurers,
              cob: p.cob,
              typeOfCover: p.typeOfCover,
              currency: p.currency,
              riskLocation: p.riskLocation,
              brokeragePct: p.brokeragePct,
              cobOjkClassId: p.cobOjkClassId,
              placementLocationId: p.placementLocationId,
              groupingInsured: p.groupingInsured,
              expiryDate: p.expiryDate,
            }),
        }
      )
    }
    actions.push({
      label: blocked ? "Hapus (masih dipakai)" : "Hapus polis",
      icon: Trash2,
      destructive: true,
      disabled: blocked,
      confirm: {
        title: `Hapus polis ${p.policyNo}?`,
        description:
          "Polis dan riwayat softcopy-nya dihapus dari database. Tindakan ini tidak bisa dibatalkan.",
        actionLabel: "Hapus",
      },
      onSelect: () =>
        startDelete(async () => {
          const res = await deletePolicyAction(p.id)
          if (!res.ok) {
            toast.error("Gagal menghapus polis", { description: res.error })
            return
          }
          store.remove("policies", p.id)
          toast.success("Polis dihapus", { description: p.policyNo })
        }),
    })
    return actions
  }

  const exportSpec: ExportSpec<Policy> = {
    filename: "polis-lch",
    sheet: "Polis",
    rows,
    columns: [
      { header: "No. Polis", value: (p) => p.policyNo },
      { header: "Tipe", value: (p) => p.type },
      { header: "Endorsement Ke", value: (p) => p.endorsementSeq ?? "" },
      {
        header: "Polis Sebelumnya / Induk",
        value: (p) =>
          (p.parentPolicyId ? policyNoById.get(p.parentPolicyId) : p.previousPolicyNo) ?? "",
      },
      { header: "Tertanggung", value: (p) => p.insuredName, width: 36 },
      { header: "Asuransi", value: (p) => p.insurer, width: 36 },
      { header: "COB", value: (p) => p.cob },
      { header: "Mulai", value: (p) => p.inceptionDate, type: "date" },
      { header: "Berakhir", value: (p) => p.expiryDate, type: "date" },
      { header: "Mata Uang", value: (p) => p.currency },
      { header: "Sum Insured", value: (p) => p.sumInsured, type: "money" },
      { header: "Premium", value: (p) => p.premium, type: "money" },
      {
        header: "Brokerage (%)",
        value: (p) => p.brokeragePct,
        type: "percent",
      },
      {
        header: "Additional Fee",
        value: (p) => p.additionalFee ?? 0,
        type: "money",
      },
      { header: "Status", value: (p) => policyStatus(p.expiryDate, today) },
      { header: "Lokasi Risiko", value: (p) => p.riskLocation, width: 40 },
      { header: "Remarks", value: (p) => p.remarks ?? "", width: 40 },
      {
        header: "Berkas Polis",
        value: (p) => (latestPolicyFile(p.files, "Policy") ? "Sudah diunggah" : "Belum diunggah"),
      },
    ],
  }

  const filesPolicy = filesFor
    ? (policies.find((p) => p.id === filesFor) ?? null)
    : null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Policy Database"
        description="Database polis asuransi beserta softcopy dokumen"
        actions={
          canManage ? (
            <Button onClick={() => openForm(null)}>
              <Plus data-icon="inline-start" />
              Tambah Polis
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-4">
        <div className="no-print flex flex-wrap items-center gap-2">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Cari no. polis, tertanggung, asuransi…"
          />
          <Select
            items={cobItems}
            value={cob}
            onValueChange={(v) => setCob(v as string)}
          >
            <SelectTrigger
              size="sm"
              className="w-42"
              aria-label="Filter COB"
            >
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
          <Select
            items={STATUS_ITEMS}
            value={status}
            onValueChange={(v) => setStatus(v as string)}
          >
            <SelectTrigger
              size="sm"
              className="w-37.5"
              aria-label="Filter status"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {STATUS_ITEMS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            items={POLICY_FILE_ITEMS}
            value={fileFilter}
            onValueChange={(v) => setFileFilter(v as string)}
          >
            <SelectTrigger
              size="sm"
              className="w-50"
              aria-label="Filter berkas polis"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {POLICY_FILE_ITEMS.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <ExportButtons className="ml-auto" spec={exportSpec} />
        </div>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "all" | PolicyType)}
          className="flex flex-col gap-4"
        >
          <TabsList className="no-print max-w-full overflow-x-auto">
            <TabsTrigger value="all">Semua ({base.length})</TabsTrigger>
            {fixedLookupItems(masterOptions.systemLookups.policy_type, POLICY_TYPE_CODES)
              // Tipe yang dinonaktifkan tetap tampil selama masih ada polisnya.
              .concat(
                POLICY_TYPES.filter(
                  (t) =>
                    base.some((p) => p.type === t) &&
                    !masterOptions.systemLookups.policy_type.some(
                      (r) => r.code === POLICY_TYPE_CODES[t]
                    ) &&
                    masterOptions.systemLookups.policy_type.length > 0
                ).map((t) => ({ label: t, value: t }))
              )
              .map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label} ({base.filter((p) => p.type === t.value).length})
                </TabsTrigger>
              ))}
          </TabsList>

          <TabsContent value={tab}>
            <Card className="gap-0 overflow-hidden py-0">
              <Table className="min-w-[840px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={ACTION_COL_CLASS}>
                      <span className="sr-only">Aksi</span>
                    </TableHead>
                    <TableHead>No. Polis</TableHead>
                    <TableHead>Tertanggung</TableHead>
                    <TableHead>COB</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead className="text-right">Premium</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-4">Berkas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableEmpty
                      colSpan={9}
                      message="Tidak ada polis yang cocok"
                    />
                  ) : (
                    paginatedRows.map((p) => {
                      // Kelengkapan dihitung dari tiga jenis utama; Slip dari luar
                      // sistem hanya disebut di keterangan.
                      const kinds = MAIN_POLICY_FILE_KINDS.map((k) => ({
                        ...k,
                        latest: latestPolicyFile(p.files, k.kind),
                      }))
                      const uploaded = kinds.filter((k) => k.latest)
                      const slipFile = latestPolicyFile(p.files, "Slip")
                      return (
                        <TableRow key={p.id}>
                          <TableCell className={ACTION_COL_CLASS}>
                            <RowActions actions={actionsFor(p)} />
                          </TableCell>
                          <TableCell className="tabular font-medium">
                            {p.policyNo}
                            {parentNote(p) ? (
                              <span className="block text-xs font-normal text-muted-foreground">
                                {parentNote(p)}
                              </span>
                            ) : null}
                            {p.remarks ? (
                              <span
                                className="block max-w-56 truncate text-xs font-normal text-muted-foreground"
                                title={p.remarks}
                              >
                                {p.remarks}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="max-w-50">
                            <p className="truncate">{p.insuredName}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.insurer}
                            </p>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {p.cob}
                          </TableCell>
                          <TableCell className="tabular">
                            {dateShort(p.inceptionDate)}
                            <span className="block text-xs text-muted-foreground">
                              s/d {dateShort(p.expiryDate)}
                            </span>
                          </TableCell>
                          <TableCell
                            className={
                              p.premium < 0
                                ? "tabular text-right font-medium text-destructive"
                                : "tabular text-right font-medium"
                            }
                          >
                            {money(p.premium, p.currency)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={p.type}
                              label={fixedLookupLabel(
                                masterOptions.systemLookups.policy_type,
                                POLICY_TYPE_CODES,
                                p.type
                              )}
                            />
                            {p.endorsementSeq ? (
                              <span className="tabular ml-1.5 text-xs text-muted-foreground">
                                ke-{p.endorsementSeq}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={policyStatus(p.expiryDate, today)}
                            />
                          </TableCell>
                          <TableCell className="pr-4">
                            {uploaded.length ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="-mx-2 h-7 text-primary"
                                onClick={() => setFilesFor(p.id)}
                                title={[
                                  ...kinds.map((k) =>
                                    k.latest
                                      ? `${k.label} v${k.latest.version}`
                                      : `${k.label} belum ada`
                                  ),
                                  ...(slipFile ? [`Slip v${slipFile.version}`] : []),
                                ].join(" · ")}
                              >
                                <FileText data-icon="inline-start" />
                                {uploaded.length}/{kinds.length}
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="-mx-2 h-7 text-muted-foreground"
                                onClick={() => setFilesFor(p.id)}
                              >
                                Upload
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </Card>

            <div className="mt-3">
              <TablePagination
                page={page}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                itemName="polis"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>
            Total premium (setara IDR):{" "}
            <span className="tabular font-medium text-foreground">
              {rupiah(totalPremium)}
            </span>
          </span>
        </div>
      </div>

      {form ? (
        <PolicyForm
          key={form.key}
          open
          onOpenChange={(open) => {
            if (!open) setForm(null)
          }}
          policy={form.policy}
          preset={form.preset}
          clientOptions={clientOptions}
          formOptions={formOptions}
          policies={policies}
          slips={slips}
        />
      ) : null}
      <PolicyFilesSheet
        policy={filesPolicy}
        onOpenChange={(open) => {
          if (!open) setFilesFor(null)
        }}
      />
      <PolicyParticipantsSheet
        policy={participantsFor ? (policies.find((p) => p.id === participantsFor) ?? null) : null}
        onOpenChange={(open) => {
          if (!open) setParticipantsFor(null)
        }}
      />
    </div>
  )
}
