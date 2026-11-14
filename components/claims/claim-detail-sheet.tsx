"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  FileUp,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Printer,
  Send,
  Trash2,
  TriangleAlert,
  User,
} from "lucide-react"
import { toast } from "sonner"

import {
  addClaimDocumentAction,
  addClaimFollowupAction,
  deleteClaimDocumentAction,
  deleteClaimFollowupAction,
  listClaimDocumentsAction,
  listClaimFollowupsAction,
  toggleClaimDocumentAction,
  uploadClaimDocumentFileAction,
} from "@/app/(app)/claims/actions"
import { StatusBadge, ToneBadge } from "@/components/shared/status-badge"
import {
  PolicyFilesList,
  PremiumStatusBadge,
  useClaimPolicyInfo,
} from "@/components/claims/claim-policy-info"
import { usePermission } from "@/components/auth/permission-provider"
import { useFormOptions } from "@/components/shared/form-options-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { todayIso } from "@/lib/date"
import { Textarea } from "@/components/ui/textarea"
import type { Claim } from "@/lib/data"
import { dateShort, money } from "@/lib/format"
import { CLAIM_STATUS_CODES, fixedLookupLabel } from "@/lib/form-options"
import { paClaimWarnings } from "@/lib/pa-benefits"
import type { ClaimDocumentRecord, ClaimFollowupRecord } from "@/lib/server/claims"
import { cn } from "@/lib/utils"
import { compressImage } from "@/lib/image-compress"
import { UPLOAD_ACCEPT, UPLOAD_HINT, uploadProblem } from "@/lib/uploads"

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

const TIMELINE: { key: keyof Claim; label: string }[] = [
  { key: "lossDate", label: "Tanggal kejadian" },
  { key: "reportedDate", label: "Dilaporkan" },
  { key: "documentCompleteDate", label: "Dokumen lengkap" },
  { key: "spkDate", label: "SPK / SPGR terbit" },
]

export function ClaimDetailSheet({
  claim,
  open,
  onOpenChange,
  onEdit,
}: {
  claim: Claim | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (claim: Claim) => void
}) {
  const permission = usePermission()
  const canManage = permission.canManage("/claims")
  const masterOptions = useFormOptions()
  // Status premi dan file polis untuk bagian Polis terkait.
  const { info: policyInfo } = useClaimPolicyInfo(open ? claim?.policyId : null)
  const [activeTab, setActiveTab] = React.useState("overview")
  const [documents, setDocuments] = React.useState<ClaimDocumentRecord[]>([])
  // Loading diturunkan dari id klaim yang datanya sudah dimuat, tanpa setState sinkron di effect.
  const [docsLoadedFor, setDocsLoadedFor] = React.useState<string | null>(null)
  const [togglingDocId, setTogglingDocId] = React.useState<string | null>(null)
  const [uploadingDocId, setUploadingDocId] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const uploadTargetRef = React.useRef<ClaimDocumentRecord | null>(null)

  const [newDocName, setNewDocName] = React.useState("")
  const [newDocRequired, setNewDocRequired] = React.useState(false)
  const [isAddingDoc, setIsAddingDoc] = React.useState(false)

  const [followups, setFollowups] = React.useState<ClaimFollowupRecord[]>([])
  const [followupsLoadedFor, setFollowupsLoadedFor] = React.useState<string | null>(null)
  const [followupNote, setFollowupNote] = React.useState("")
  const [followupDate, setFollowupDate] = React.useState(
    () => new Date().toISOString().slice(0, 10)
  )
  const [isAddingFollowup, setIsAddingFollowup] = React.useState(false)
  const [deletingFollowupId, setDeletingFollowupId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!claim?.id || !open) return
    const claimId = claim.id
    let active = true

    listClaimDocumentsAction(claimId).then((res) => {
      if (active) {
        if (res.ok && res.data) {
          setDocuments(res.data)
        } else {
          toast.error(res.error ?? "Gagal memuat dokumen klaim")
        }
        setDocsLoadedFor(claimId)
      }
    })

    listClaimFollowupsAction(claimId).then((res) => {
      if (active) {
        if (res.ok && res.data) {
          setFollowups(res.data)
        } else {
          toast.error(res.error ?? "Gagal memuat tindak lanjut klaim")
        }
        setFollowupsLoadedFor(claimId)
      }
    })

    return () => {
      active = false
    }
  }, [claim?.id, open])

  const isLoadingDocs = Boolean(claim?.id) && docsLoadedFor !== claim?.id
  const isLoadingFollowups = Boolean(claim?.id) && followupsLoadedFor !== claim?.id

  const receivedCount = documents.filter((d) => d.isReceived).length
  const requiredDocs = documents.filter((d) => d.isRequired)
  const requiredReceivedCount = requiredDocs.filter((d) => d.isReceived).length
  const allRequiredReceived =
    requiredDocs.length > 0 && requiredReceivedCount === requiredDocs.length

  async function handleToggleDocument(doc: ClaimDocumentRecord, checked: boolean) {
    setTogglingDocId(doc.id)
    const prevDocs = documents
    const todayStr = todayIso()

    setDocuments((prev) =>
      prev.map((d) =>
        d.id === doc.id
          ? { ...d, isReceived: checked, receivedDate: checked ? todayStr : null }
          : d
      )
    )

    const res = await toggleClaimDocumentAction(doc.id, checked, todayStr)
    setTogglingDocId(null)

    if (!res.ok) {
      setDocuments(prevDocs)
      toast.error(res.error ?? "Gagal memperbarui status dokumen")
      return
    }

    if (res.data) {
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? res.data! : d)))
      toast.success(
        checked
          ? `Berkas "${doc.documentTypeName}" ditandai diterima`
          : `Berkas "${doc.documentTypeName}" ditandai belum diterima`
      )
    }
  }

  async function handleAddDocument(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!claim?.id || !newDocName.trim()) return

    setIsAddingDoc(true)
    const res = await addClaimDocumentAction(claim.id, {
      name: newDocName.trim(),
      isRequired: newDocRequired,
    })
    setIsAddingDoc(false)

    if (!res.ok) {
      toast.error(res.error ?? "Gagal menambahkan dokumen klaim")
      return
    }

    if (res.data) {
      setDocuments((prev) => [...prev, res.data!])
      setNewDocName("")
      setNewDocRequired(false)
      toast.success(`Dokumen "${res.data.documentTypeName}" berhasil ditambahkan`)
    }
  }

  function pickFile(doc: ClaimDocumentRecord) {
    uploadTargetRef.current = doc
    fileInputRef.current?.click()
  }

  async function handleUploadFile(picked: File) {
    const doc = uploadTargetRef.current
    uploadTargetRef.current = null
    if (!doc) return
    const file = await compressImage(picked)
    const problem = uploadProblem(file)
    if (problem) {
      toast.error(problem, { description: file.name })
      return
    }

    setUploadingDocId(doc.id)
    const body = new FormData()
    body.append("file", file)
    const res = await uploadClaimDocumentFileAction(doc.id, body)
    setUploadingDocId(null)

    if (!res.ok || !res.data) {
      toast.error(`Gagal mengunggah ${file.name}`, { description: res.error })
      return
    }
    setDocuments((prev) => prev.map((d) => (d.id === doc.id ? res.data! : d)))
    // Upload pertama menandai dokumen diterima, dengan tanggal upload.
    const receivedNow = !doc.isReceived && res.data.isReceived
    toast.success(`File "${doc.documentTypeName}" tersimpan`, {
      description: receivedNow
        ? `${file.name} · ditandai diterima ${res.data.receivedDate ? dateShort(res.data.receivedDate) : ""}`
        : file.name,
    })
  }

  async function handleDeleteDocument(doc: ClaimDocumentRecord) {
    const res = await deleteClaimDocumentAction(doc.id)
    if (!res.ok) {
      toast.error(res.error ?? "Gagal menghapus dokumen")
      return
    }
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
    toast.success(`Dokumen "${doc.documentTypeName}" berhasil dihapus`)
  }

  async function handleAddFollowup(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!claim?.id || !followupNote.trim()) return

    setIsAddingFollowup(true)
    const res = await addClaimFollowupAction(claim.id, {
      followupDate,
      note: followupNote.trim(),
    })
    setIsAddingFollowup(false)

    if (!res.ok) {
      toast.error(res.error ?? "Gagal menambahkan catatan tindak lanjut")
      return
    }

    if (res.data) {
      setFollowups((prev) => [res.data!, ...prev])
      setFollowupNote("")
      toast.success("Catatan tindak lanjut berhasil ditambahkan")
    }
  }

  async function handleDeleteFollowup(id: string) {
    setDeletingFollowupId(id)
    const res = await deleteClaimFollowupAction(id)
    setDeletingFollowupId(null)

    if (!res.ok) {
      toast.error(res.error ?? "Gagal menghapus tindak lanjut")
      return
    }

    setFollowups((prev) => prev.filter((f) => f.id !== id))
    toast.success("Catatan tindak lanjut berhasil dihapus")
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-152">
        {claim ? (
          <>
            <SheetHeader className="pb-2">
              <div className="flex items-start justify-between gap-3 pr-6">
                <div>
                  <SheetTitle className="tabular">{claim.claimNo}</SheetTitle>
                  <SheetDescription>
                    {claim.insuredName} · {claim.cob}
                  </SheetDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 shrink-0"
                  render={<Link href={`/claims/print/${claim.id}`} target="_blank" />}
                  nativeButton={false}
                >
                  <Printer className="size-3.5" />
                  Cetak
                </Button>
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-4 pb-8">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex flex-col gap-4"
              >
                <TabsList className="w-full justify-start rounded-lg bg-muted/60 p-1">
                  <TabsTrigger value="overview">Ringkasan</TabsTrigger>
                  <TabsTrigger value="documents" className="gap-1.5">
                    Berkas Dokumen
                    {documents.length > 0 && (
                      <span className="rounded-full bg-muted-foreground/15 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                        {receivedCount}/{documents.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="followups" className="gap-1.5">
                    Tindak Lanjut
                    {followups.length > 0 && (
                      <span className="rounded-full bg-muted-foreground/15 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                        {followups.length}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="flex flex-col gap-6 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      status={claim.status}
                      label={fixedLookupLabel(
                        masterOptions.systemLookups.claim_status,
                        CLAIM_STATUS_CODES,
                        claim.status
                      )}
                    />
                    <StatusBadge status={claim.stage} />
                    <span className="text-xs text-muted-foreground">
                      Adjuster: {claim.adjuster || "belum ditunjuk"}
                    </span>
                    {onEdit && canManage ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto"
                        onClick={() => onEdit(claim)}
                      >
                        <Pencil data-icon="inline-start" />
                        Edit
                      </Button>
                    ) : null}
                  </div>

                  <section>
                    <h3 className="mb-1 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                      Nilai klaim
                    </h3>
                    <div className="divide-y">
                      <Row
                        label="Estimasi kerugian"
                        value={money(claim.estimatedLoss, claim.currency)}
                      />
                      <Row
                        label="Jumlah klaim diajukan"
                        value={money(claim.claimedAmount, claim.currency)}
                      />
                      <Row
                        label="Jumlah dibayar"
                        value={money(claim.paidAmount, claim.currency)}
                      />
                    </div>
                    {/* Peringatan klaim PA di atas UP atau limit manfaat (Harry, 7 November 2026). */}
                    {claim.participantSumInsured ? (
                      <PaClaimWarnings claim={claim} />
                    ) : null}
                  </section>

                  <section>
                    <h3 className="mb-2 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                      Timeline
                    </h3>
                    <ol className="flex flex-col gap-0">
                      {TIMELINE.map((t, i) => {
                        const value = claim[t.key] as string | null
                        return (
                          <li key={t.label} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <span
                                className={`mt-1 size-2.5 shrink-0 rounded-full ${value ? "bg-primary" : "bg-muted-foreground/30"}`}
                              />
                              {i < TIMELINE.length - 1 ? (
                                <span className="w-px flex-1 bg-border" />
                              ) : null}
                            </div>
                            <div className="pb-4">
                              <p className="text-sm font-medium">{t.label}</p>
                              <p className="tabular text-xs text-muted-foreground">
                                {value ? dateShort(value) : "Belum ada"}
                              </p>
                            </div>
                          </li>
                        )
                      })}
                    </ol>
                  </section>

                  <Separator />

                  <section className="flex flex-col gap-3">
                    <div>
                      <h3 className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                        <MapPin className="size-3" />
                        Lokasi kejadian
                      </h3>
                      <p className="text-sm">{claim.location}</p>
                    </div>
                    <div>
                      <h3 className="mb-1 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                        Deskripsi kerugian
                      </h3>
                      <p className="text-sm leading-relaxed">
                        {claim.lossDescription}
                      </p>
                    </div>
                    <div>
                      <h3 className="mb-1 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                        Deskripsi aset
                      </h3>
                      <p className="text-sm">{claim.assetDescription}</p>
                    </div>
                  </section>

                  <Separator />

                  <section>
                    <h3 className="mb-1 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                      Polis terkait
                    </h3>
                    <div className="divide-y">
                      <Row
                        label="No. polis"
                        value={<span className="tabular">{claim.policyNo}</span>}
                      />
                      <Row label="Asuransi" value={claim.insurer} />
                      {policyInfo ? (
                        <>
                          <Row
                            label="Status premi"
                            value={<PremiumStatusBadge date={policyInfo.premiumPaidDate} />}
                          />
                          <Row
                            label="Berkas polis"
                            value={<PolicyFilesList files={policyInfo.policyFiles} />}
                          />
                        </>
                      ) : null}
                      {claim.participantName ? (
                        <Row label="Peserta" value={claim.participantName} />
                      ) : null}
                      {claim.paBenefitName ? (
                        <Row label="Jenis manfaat" value={claim.paBenefitName} />
                      ) : null}
                    </div>
                  </section>

                  {claim.notes ? (
                    <section className="rounded-lg bg-muted/60 p-3 text-sm">
                      <h3 className="mb-1 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                        Catatan
                      </h3>
                      <p className="text-sm leading-relaxed text-foreground/90">
                        {claim.notes}
                      </p>
                    </section>
                  ) : null}
                </TabsContent>

                {/* Berkas dokumen (PRD A-04) */}
                <TabsContent value="documents" className="flex flex-col gap-5 pt-1">
                  {requiredDocs.length > 0 && (
                    <div
                      className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs leading-relaxed ${
                        allRequiredReceived
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}
                    >
                      {allRequiredReceived ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      )}
                      <div>
                        <p className="font-semibold">
                          {allRequiredReceived
                            ? "Semua dokumen wajib telah lengkap"
                            : `Dokumen wajib belum lengkap (${requiredReceivedCount} dari ${requiredDocs.length} terpenuhi)`}
                        </p>
                        <p className="mt-0.5 opacity-90">
                          {allRequiredReceived
                            ? "Berkas klaim telah siap diproses ke penaksir (adjuster) atau penerbitan SPK/SPGR."
                            : "Unggah file atau centang berkas yang sudah diterima dari tertanggung. Tanggal upload dicatat sebagai tanggal dokumen diterima."}
                        </p>
                      </div>
                    </div>
                  )}

                  {isLoadingDocs ? (
                    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Memuat daftar berkas dokumen...
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                      <FileText className="mb-2 size-8 text-muted-foreground/60" />
                      <p className="font-medium text-foreground">Belum ada daftar dokumen</p>
                      <p className="text-xs">
                        {canManage
                          ? "Tambahkan dokumen yang disyaratkan di bawah ini."
                          : "Tidak ada dokumen yang disyaratkan."}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y rounded-lg border bg-card">
                      {documents.map((doc) => {
                        const isToggling = togglingDocId === doc.id
                        return (
                          <div
                            key={doc.id}
                            className="flex items-start gap-3 p-3.5 transition-colors hover:bg-muted/40"
                          >
                            <div className="pt-0.5">
                              <Checkbox
                                checked={doc.isReceived}
                                disabled={isToggling || !canManage}
                                onCheckedChange={(checked) =>
                                  handleToggleDocument(doc, checked === true)
                                }
                                aria-label={`Tandai ${doc.documentTypeName} diterima`}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`text-sm font-medium ${
                                    doc.isReceived
                                      ? "text-foreground"
                                      : "text-foreground/90"
                                  }`}
                                >
                                  {doc.documentTypeName}
                                </span>
                                {doc.isRequired ? (
                                  <ToneBadge tone="warning">Wajib</ToneBadge>
                                ) : (
                                  <ToneBadge tone="neutral">Opsional</ToneBadge>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {doc.isReceived ? (
                                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="size-3" />
                                    Diterima {doc.receivedDate ? dateShort(doc.receivedDate) : ""}
                                  </span>
                                ) : (
                                  <span>Belum diterima</span>
                                )}
                                {doc.notes ? (
                                  <>
                                    <span>·</span>
                                    <span className="truncate italic">{doc.notes}</span>
                                  </>
                                ) : null}
                                {doc.fileUrl ? (
                                  <>
                                    <span>·</span>
                                    <a
                                      href={doc.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
                                    >
                                      <ExternalLink className="size-3" />
                                      Lihat file
                                    </a>
                                  </>
                                ) : null}
                              </div>
                            </div>
                            {canManage && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={uploadingDocId === doc.id}
                                onClick={() => pickFile(doc)}
                                aria-label={`${doc.fileUrl ? "Ganti" : "Unggah"} file ${doc.documentTypeName}`}
                                className="text-muted-foreground"
                              >
                                {uploadingDocId === doc.id ? (
                                  <Loader2 data-icon="inline-start" className="animate-spin" />
                                ) : (
                                  <FileUp data-icon="inline-start" />
                                )}
                                {doc.fileUrl ? "Ganti" : "Unggah"}
                              </Button>
                            )}
                            {!doc.isRequired && canManage && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Hapus ${doc.documentTypeName}`}
                                onClick={() => handleDeleteDocument(doc)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {canManage && documents.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      File berkas: {UPLOAD_HINT}
                    </p>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={UPLOAD_ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ""
                      if (file) void handleUploadFile(file)
                    }}
                  />

                  {canManage && (
                    <form
                      onSubmit={handleAddDocument}
                      className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3.5"
                    >
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Tambah Berkas Tambahan
                      </h4>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          placeholder="Nama dokumen berkas klaim..."
                          value={newDocName}
                          onChange={(e) => setNewDocName(e.target.value)}
                          className="flex-1"
                          disabled={isAddingDoc}
                        />
                        <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                          <Checkbox
                            checked={newDocRequired}
                            onCheckedChange={(checked) => setNewDocRequired(checked === true)}
                            disabled={isAddingDoc}
                          />
                          Wajib
                        </label>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isAddingDoc || !newDocName.trim()}
                          className="sm:w-auto"
                        >
                          {isAddingDoc ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Plus data-icon="inline-start" className="size-3.5" />
                          )}
                          Tambah
                        </Button>
                      </div>
                    </form>
                  )}
                </TabsContent>

                {/* Tindak lanjut klaim (PRD A-18) */}
                <TabsContent value="followups" className="flex flex-col gap-5 pt-1">
                  {canManage && (
                    <form
                      onSubmit={handleAddFollowup}
                      className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3.5"
                    >
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Catat Tindak Lanjut Baru
                      </h4>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                            <Calendar className="size-3" />
                            Tanggal:
                          </label>
                          <Input
                            type="date"
                            value={followupDate}
                            onChange={(e) => setFollowupDate(e.target.value)}
                            className="w-40 h-8 text-xs"
                            disabled={isAddingFollowup}
                          />
                        </div>
                        <Textarea
                          placeholder="Tulis catatan penanganan klaim, negosiasi dengan adjuster, komunikasi tertanggung..."
                          value={followupNote}
                          onChange={(e) => setFollowupNote(e.target.value)}
                          rows={2}
                          className="min-h-16 text-xs"
                          disabled={isAddingFollowup}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isAddingFollowup || !followupNote.trim()}
                        >
                          {isAddingFollowup ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Send data-icon="inline-start" className="size-3.5" />
                          )}
                          Simpan Catatan
                        </Button>
                      </div>
                    </form>
                  )}

                  {isLoadingFollowups ? (
                    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Memuat riwayat tindak lanjut...
                    </div>
                  ) : followups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                      <Clock className="mb-2 size-8 text-muted-foreground/60" />
                      <p className="font-medium text-foreground">Belum ada riwayat tindak lanjut</p>
                      <p className="text-xs">
                        {canManage
                          ? "Catat aktivitas komunikasi atau investigasi klaim di atas."
                          : "Belum ada aktivitas komunikasi atau investigasi klaim."}
                      </p>
                    </div>
                  ) : (
                    // Timeline garis vertikal di kiri, terbaru di atas (Agus, 13 November 2026).
                    // Polanya sama dengan Timeline di tab Ringkasan.
                    <ol aria-label="Riwayat tindak lanjut" className="flex flex-col">
                      {followups.map((item, i) => {
                        const isDeleting = deletingFollowupId === item.id
                        const isLast = i === followups.length - 1
                        return (
                          <li key={item.id} className="flex gap-3">
                            <div className="flex w-2.5 shrink-0 flex-col items-center" aria-hidden>
                              <span className={cn("h-[7px] w-0.5", i > 0 && "bg-primary/25")} />
                              <span
                                className={cn(
                                  "size-2.5 shrink-0 rounded-full bg-primary",
                                  i === 0 && "ring-4 ring-primary/15"
                                )}
                              />
                              {isLast ? null : <span className="w-0.5 flex-1 bg-primary/25" />}
                            </div>
                            <div className={cn("flex min-w-0 flex-1 flex-col gap-1", !isLast && "pb-5")}>
                              <div className="flex min-h-6 items-center justify-between gap-2">
                                <time
                                  dateTime={item.followupDate}
                                  className="tabular text-sm font-semibold text-foreground"
                                >
                                  {dateShort(item.followupDate)}
                                </time>
                                <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <User className="size-3" />
                                    {item.createdByName || "Staf Klaim"}
                                  </span>
                                  {canManage && (
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      aria-label="Hapus catatan tindak lanjut"
                                      disabled={isDeleting}
                                      onClick={() => handleDeleteFollowup(item.id)}
                                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    >
                                      {isDeleting ? (
                                        <Loader2 className="size-3 animate-spin" />
                                      ) : (
                                        <Trash2 className="size-3" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                                {item.note}
                              </p>
                            </div>
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function PaClaimWarnings({ claim }: { claim: Claim }) {
  const warnings = paClaimWarnings(claim, {
    sumInsured: claim.participantSumInsured ?? 0,
    limitPct: claim.benefitLimitPct ?? null,
    benefitName: claim.paBenefitName || null,
  })
  if (!warnings.length) return null
  return (
    <div
      role="status"
      className="mt-2 flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2.5 text-sm text-warning"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <ul className="flex flex-col gap-1">
        {warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
    </div>
  )
}
