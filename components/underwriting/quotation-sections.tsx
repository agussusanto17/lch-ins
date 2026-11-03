"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertTriangle,
  CircleCheck,
  FileCheck2,
  FileText,
  Plus,
  Save,
  ScrollText,
  Trash2,
} from "lucide-react"

import { useFormOptions } from "@/components/shared/form-options-provider"
import { SectionCard } from "@/components/shared/section-card"
import { SlipFormActions } from "@/components/underwriting/slip-form-chrome"
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
import { NumberInput } from "@/components/ui/number-input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { sumPercent } from "@/lib/calc"
import type { PlacingSlip, SecurityPanelRow } from "@/lib/data"
import { withCurrent } from "@/lib/form-options"
import { num } from "@/lib/format"
import { newId } from "@/lib/store"
import { cn } from "@/lib/utils"

/*
 * Tahap quotation memakai form placing slip yang sama, ditambah bagian di
 * bawah Brokerage (Agus, 3 November 2026): Subjectivity, Security (panel
 * asuransi), Closing Instruction, dan Catatan Draft Cover Note.
 */

export const QUOTATION_SECTION_KEYS = [
  "subjectivity",
  "security",
  "closing",
  "coverNote",
] as const
export type QuotationSectionKey = (typeof QUOTATION_SECTION_KEYS)[number]

const ROLE_ITEMS = [
  { label: "As Leader", value: "As Leader" },
  { label: "As Member", value: "As Member" },
]

function emptyRow(
  role: SecurityPanelRow["role"] = "As Member"
): SecurityPanelRow {
  return { id: newId("sp"), insurer: "", share: 0, role }
}

/** Masalah panel co-insurance yang menghalangi penerbitan dokumen (PRD A-13). */
export function panelIssues(panel: SecurityPanelRow[]) {
  const issues: string[] = []
  const filled = panel.filter((r) => r.insurer)
  if (!filled.length) issues.push("Isi minimal satu asuransi di panel.")
  if (panel.some((r) => !r.insurer && r.share > 0)) {
    issues.push("Ada baris share tanpa nama asuransi.")
  }
  if (panel.some((r) => r.insurer && r.share <= 0)) {
    issues.push("Setiap asuransi di panel harus punya share lebih dari 0%.")
  }
  const names = filled.map((r) => r.insurer)
  if (new Set(names).size !== names.length) {
    issues.push("Asuransi yang sama tercantum lebih dari sekali.")
  }
  // Satu asuransi 100% tidak punya leader atau member (LCH, 3 November 2026).
  const leaders = filled.filter((r) => r.role === "As Leader").length
  if (filled.length > 1 && leaders !== 1) {
    issues.push("Panel wajib punya tepat satu leader.")
  }
  const total = sumPercent(panel.map((r) => r.share))
  if (total !== 100)
    issues.push(`Total share ${num(total, 2)}%, harus tepat 100%.`)
  return issues
}

/**
 * Panel yang dikirim ke server: baris kosong dibuang, dan asuransi tunggal
 * disimpan sebagai leader supaya urutan tanda tangan tetap konsisten walaupun
 * perannya tidak ditampilkan.
 */
export function panelForSave(panel: SecurityPanelRow[] = []) {
  const rows = panel.filter((r) => r.insurer || r.share)
  const single = rows.filter((r) => r.insurer).length === 1
  return rows.map((r) =>
    single && r.insurer ? { ...r, role: "As Leader" as const } : r
  )
}

/** Slip Released naik ke Quoted begitu panelnya lengkap. */
export function quotationStatus(slip: PlacingSlip): PlacingSlip["status"] {
  return slip.status === "Released" &&
    panelIssues(slip.securityPanel ?? []).length === 0
    ? "Quoted"
    : slip.status
}

export function QuotationSections({
  slip,
  onChange,
  sectionProps,
}: {
  slip: PlacingSlip
  onChange: (patch: Partial<PlacingSlip>) => void
  sectionProps: (key: QuotationSectionKey) => {
    collapsible: true
    open: boolean
    onOpenChange: (v: boolean) => void
  }
}) {
  const insurerNames = useFormOptions().insurers.map((i) => i.name)
  // Panel kosong tampil dengan dua baris awal tanpa mengubah slip, supaya
  // membuka halaman tidak dihitung sebagai perubahan.
  const [defaultRows] = React.useState(() => [
    emptyRow("As Leader"),
    emptyRow(),
  ])
  const panel = slip.securityPanel?.length ? slip.securityPanel : defaultRows

  const totalShare = sumPercent(panel.map((r) => r.share))
  const issues = panelIssues(panel)
  const panelValid = issues.length === 0
  // Peran leader/member baru berarti kalau asuransinya lebih dari satu.
  const multiInsurer = panel.filter((r) => r.insurer).length > 1
  const duplicateNames = new Set(
    panel
      .map((r) => r.insurer)
      .filter((name, i, all) => name && all.indexOf(name) !== i)
  )

  function setPanel(next: SecurityPanelRow[]) {
    onChange({ securityPanel: next })
  }

  function patch(rowId: string, next: Partial<SecurityPanelRow>) {
    setPanel(panel.map((r) => (r.id === rowId ? { ...r, ...next } : r)))
  }

  function setLeader(rowId: string) {
    // Hanya satu leader: memilih leader baru menjadikan yang lain member.
    setPanel(
      panel.map((r) => ({
        ...r,
        role: r.id === rowId ? "As Leader" : "As Member",
      }))
    )
  }

  return (
    <>
      <SectionCard
        title="Subjectivity"
        description="Syarat yang harus dipenuhi sebelum polis diterbitkan."
        {...sectionProps("subjectivity")}
      >
        <Textarea
          rows={4}
          aria-label="Subjectivity"
          value={slip.subjectivity ?? ""}
          placeholder="1. … 2. …"
          onChange={(e) => onChange({ subjectivity: e.target.value })}
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
          {/* Kolom tetap hanya di layar lebar. Di layar sempit tiap panel
              jadi kartu kecil: asuransi di baris atas, share + role + hapus
              di bawahnya, supaya tidak ada kolom yang terpotong. */}
          <div className="hidden gap-3 text-xs text-muted-foreground lg:grid lg:grid-cols-[minmax(0,1fr)_120px_150px_40px]">
            <span>Nama Asuransi</span>
            <span>Share (%)</span>
            <span>{multiInsurer ? "Role" : null}</span>
            <span />
          </div>

          {panel.map((row, index) => {
            // Asuransi yang sudah dinonaktifkan di master tetap tampil di
            // panel lama supaya isiannya tidak hilang.
            const insurerItems = withCurrent(insurerNames, row.insurer).map(
              (i) => ({ label: i, value: i })
            )
            return (
              <div
                key={row.id}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(0,1fr)_120px_150px_40px] lg:border-0 lg:p-0"
              >
                <Select
                  items={[
                    { label: `Panel ${index + 1}`, value: null },
                    ...insurerItems,
                  ]}
                  value={row.insurer || null}
                  onValueChange={(v) =>
                    patch(row.id, { insurer: (v as string) ?? "" })
                  }
                >
                  <SelectTrigger
                    className="col-span-3 w-full min-w-0 lg:col-span-1"
                    aria-label={`Asuransi panel ${index + 1}`}
                    aria-invalid={duplicateNames.has(row.insurer) || undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {insurerItems.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <NumberInput
                  preset="percent"
                  aria-label={`Share panel ${index + 1}`}
                  min={0}
                  max={100}
                  invalid={row.share < 0 || row.share > 100}
                  value={row.share || null}
                  onValueChange={(v) => patch(row.id, { share: v ?? 0 })}
                />

                {multiInsurer ? (
                  <Select
                    items={ROLE_ITEMS}
                    value={row.role}
                    onValueChange={(v) =>
                      v === "As Leader"
                        ? setLeader(row.id)
                        : patch(row.id, { role: "As Member" })
                    }
                  >
                    <SelectTrigger
                      className="w-full min-w-0"
                      aria-label={`Role panel ${index + 1}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {ROLE_ITEMS.map((i) => (
                          <SelectItem key={i.value} value={i.value}>
                            {i.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : (
                  // Kolom tetap diisi supaya tombol hapus tidak bergeser.
                  <span aria-hidden />
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Hapus panel ${index + 1}`}
                  className="text-muted-foreground hover:text-destructive"
                  disabled={panel.length === 1}
                  onClick={() => setPanel(panel.filter((r) => r.id !== row.id))}
                >
                  <Trash2 />
                </Button>
              </div>
            )
          })}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPanel([...panel, emptyRow()])}
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
              {issues.map((i) => (
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
                    <span className="w-40 truncate sm:w-64">{r.insurer}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn(
                          "block h-full rounded-full",
                          !multiInsurer || r.role === "As Leader"
                            ? "bg-primary"
                            : "bg-primary/45"
                        )}
                        style={{
                          width: `${Math.min(Math.max(r.share, 0), 100)}%`,
                        }}
                      />
                    </span>
                    <span className="tabular w-14 text-right font-medium">
                      {num(r.share, 2)}%
                    </span>
                    <span className="w-16 text-muted-foreground">
                      {multiInsurer ? r.role.replace("As ", "") : null}
                    </span>
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Closing Instruction"
        description="Instruksi ke insurer saat penutupan."
        {...sectionProps("closing")}
      >
        <Textarea
          rows={4}
          aria-label="Closing instruction"
          value={slip.closingInstruction ?? ""}
          placeholder="Masukkan closing instruction…"
          onChange={(e) => onChange({ closingInstruction: e.target.value })}
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
          onChange={(e) => onChange({ coverNoteRemarks: e.target.value })}
        />
      </SectionCard>
    </>
  )
}

/** Tombol bawah form pada tahap quotation, beserta konfirmasi closing. */
export function QuotationActions({
  slip,
  isPending,
  dirty,
  onSave,
  onOpenDoc,
  onIssueClosing,
}: {
  slip: PlacingSlip
  isPending: boolean
  dirty: boolean
  onSave: () => void
  onOpenDoc: (path: string) => void
  onIssueClosing: () => void
}) {
  const [confirmClose, setConfirmClose] = React.useState(false)
  const panelValid = panelIssues(slip.securityPanel ?? []).length === 0
  const notReleased = slip.status === "Draft"
  const locked = slip.status === "Closed" || slip.status === "Cancelled"

  return (
    <>
      <SlipFormActions className="justify-end">
        <Button
          variant="ghost"
          disabled={isPending}
          render={<Link href="/underwriting" />}
          nativeButton={false}
        >
          {dirty ? "Batal" : "Tutup"}
        </Button>
        {!locked ? (
          <Button variant="outline" disabled={isPending} onClick={onSave}>
            <Save data-icon="inline-start" />
            {isPending ? "Menyimpan…" : "Simpan"}
          </Button>
        ) : null}
        <Button
          variant="outline"
          disabled={!panelValid || notReleased || isPending}
          title={!panelValid ? "Lengkapi panel asuransi dulu" : undefined}
          onClick={() => onOpenDoc(`/underwriting/quotation/${slip.id}`)}
        >
          <FileText data-icon="inline-start" />
          Quotation Slip
        </Button>
        <Button
          variant="outline"
          disabled={!panelValid || notReleased || isPending}
          onClick={() => onOpenDoc(`/underwriting/cover-note/${slip.id}`)}
        >
          <ScrollText data-icon="inline-start" />
          Draft Cover Note
        </Button>
        {slip.status === "Closed" ? (
          <Button
            disabled={isPending}
            onClick={() => onOpenDoc(`/underwriting/closing/${slip.id}`)}
          >
            <FileCheck2 data-icon="inline-start" />
            Closing Instruction
          </Button>
        ) : (
          <Button
            disabled={!panelValid || notReleased || locked || isPending}
            onClick={() => setConfirmClose(true)}
          >
            <FileCheck2 data-icon="inline-start" />
            Terbitkan Closing Instruction
          </Button>
        )}
      </SlipFormActions>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terbitkan closing instruction?</AlertDialogTitle>
            <AlertDialogDescription>
              Status slip menjadi Closed dan slip tidak bisa diubah lagi. Panel
              asuransi ini menjadi dasar pembagian share di polis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={!panelValid || isPending}
              onClick={(e) => {
                // Dialog tetap terbuka sampai penyimpanan selesai; halaman
                // pindah ke dokumen closing kalau berhasil.
                e.preventDefault()
                onIssueClosing()
              }}
            >
              {isPending ? "Menerbitkan…" : "Terbitkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
