"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  FileCheck2,
  FileText,
  Plus,
  Save,
  ScrollText,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { PageHeader, PageShell } from "@/components/layout/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { totalPremium, totalSumInsured } from "@/lib/calc"
import { INSURERS, type PlacingSlip, type SecurityPanelRow } from "@/lib/data"
import { money, num } from "@/lib/format"

const ROLE_ITEMS = [
  { label: "As Leader", value: "As Leader" },
  { label: "As Member", value: "As Member" },
]
const INSURER_ITEMS = INSURERS.map((i) => ({ label: i, value: i }))

function emptyRow(index: number): SecurityPanelRow {
  return {
    id: `sp-${Date.now()}-${index}`,
    insurer: "",
    share: 0,
    role: "As Member",
  }
}

export function QuotationDraftForm({ slip }: { slip: PlacingSlip }) {
  const [subjectivity, setSubjectivity] = React.useState(
    slip.subjectivity ?? ""
  )
  const [closing, setClosing] = React.useState(slip.closingInstruction ?? "")
  const [coverNote, setCoverNote] = React.useState(slip.coverNoteRemarks ?? "")
  const [panel, setPanel] = React.useState<SecurityPanelRow[]>(
    slip.securityPanel?.length ? slip.securityPanel : [emptyRow(0), emptyRow(1)]
  )

  const totalShare = panel.reduce((a, r) => a + (r.share || 0), 0)
  const premium = totalPremium(slip)

  function patch(id: string, next: Partial<SecurityPanelRow>) {
    setPanel((rows) => rows.map((r) => (r.id === id ? { ...r, ...next } : r)))
  }

  return (
    <PageShell className="pb-24">
      <PageHeader
        title="Draft Quotation Slip"
        description={slip.insuredName}
        actions={
          <Button
            variant="outline"
            render={<Link href={`/underwriting/edit/${slip.id}`} />}
            nativeButton={false}
          >
            <ArrowLeft data-icon="inline-start" />
            Kembali
          </Button>
        }
      />

      <Card className="gap-2 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={slip.status} />
          <span className="tabular text-sm font-semibold text-primary">
            {slip.slipNo ?? "Belum di-release"}
          </span>
        </div>
        <div className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Type of Cover:</span>{" "}
            <span className="font-medium">{slip.typeOfCover}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Tertanggung:</span>{" "}
            <span className="font-medium">{slip.insuredName}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Total Sum Insured:</span>{" "}
            <span className="tabular font-medium">
              {money(totalSumInsured(slip), slip.currency)}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Total Premium:</span>{" "}
            <span className="tabular font-medium">
              {money(premium, slip.currency)}
            </span>
          </p>
        </div>
      </Card>

      <SectionCard
        title="Subjectivity"
        description="Syarat yang harus dipenuhi sebelum polis diterbitkan."
      >
        <Textarea
          rows={5}
          value={subjectivity}
          placeholder="1. …&#10;2. …"
          onChange={(e) => setSubjectivity(e.target.value)}
        />
      </SectionCard>

      <SectionCard
        title="Security (Panel Asuransi)"
        description="Struktur co-insurance — satu risiko dibagi ke beberapa insurer dengan share %."
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
          <div className="grid grid-cols-[1fr_120px_150px_40px] gap-3 text-xs text-muted-foreground max-md:hidden">
            <span>Nama Asuransi</span>
            <span>Share (%)</span>
            <span>Role</span>
            <span />
          </div>

          {panel.map((row, index) => (
            <div
              key={row.id}
              className="grid gap-3 md:grid-cols-[1fr_120px_150px_40px]"
            >
              <Select
                items={[
                  { label: `Panel ${index + 1}`, value: null },
                  ...INSURER_ITEMS,
                ]}
                value={row.insurer || null}
                onValueChange={(v) =>
                  patch(row.id, { insurer: (v as string) ?? "" })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {INSURER_ITEMS.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Input
                className="tabular text-right"
                inputMode="decimal"
                placeholder="0"
                value={row.share || ""}
                onChange={(e) =>
                  patch(row.id, {
                    share: Number(e.target.value.replace(",", ".")) || 0,
                  })
                }
              />

              <Select
                items={ROLE_ITEMS}
                value={row.role}
                onValueChange={(v) =>
                  patch(row.id, { role: v as SecurityPanelRow["role"] })
                }
              >
                <SelectTrigger className="w-full">
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

              <Button
                variant="ghost"
                size="icon"
                aria-label="Hapus panel"
                className="text-muted-foreground hover:text-destructive"
                onClick={() =>
                  setPanel((rows) => rows.filter((r) => r.id !== row.id))
                }
              >
                <Trash2 />
              </Button>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPanel((rows) => [...rows, emptyRow(rows.length)])
              }
            >
              <Plus data-icon="inline-start" />
              Tambah panel
            </Button>
            {totalShare !== 100 ? (
              <p className="text-xs text-warning">
                Total share harus 100% sebelum closing instruction diterbitkan.
              </p>
            ) : (
              <p className="text-xs text-success">
                Share sudah seimbang — siap generate dokumen.
              </p>
            )}
          </div>

          {panel.some((r) => r.insurer) ? (
            <div className="mt-2 flex flex-col gap-1.5">
              {panel
                .filter((r) => r.insurer)
                .map((r) => (
                  <div
                    key={`bar-${r.id}`}
                    className="flex items-center gap-3 text-xs"
                  >
                    <span className="w-64 truncate">{r.insurer}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn(
                          "block h-full rounded-full",
                          r.role === "As Leader"
                            ? "bg-primary"
                            : "bg-primary/45"
                        )}
                        style={{ width: `${Math.min(r.share, 100)}%` }}
                      />
                    </span>
                    <span className="tabular w-14 text-right font-medium">
                      {num(r.share, 0)}%
                    </span>
                    <span className="w-20 text-muted-foreground">
                      {r.role.replace("As ", "")}
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
      >
        <Textarea
          rows={4}
          value={closing}
          placeholder="Masukkan closing instruction…"
          onChange={(e) => setClosing(e.target.value)}
        />
      </SectionCard>

      <SectionCard
        title="Catatan Draft Cover Note"
        description="Catatan tambahan untuk cover note (tanpa brokerage)."
      >
        <Textarea
          rows={3}
          value={coverNote}
          placeholder="Catatan cover note…"
          onChange={(e) => setCoverNote(e.target.value)}
        />
      </SectionCard>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t bg-background/85 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
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
          Simpan
        </Button>
        <Button
          variant="outline"
          render={<Link href={`/underwriting/quotation/${slip.id}`} />}
          nativeButton={false}
        >
          <FileText data-icon="inline-start" />
          Quotation Slip
        </Button>
        <Button
          variant="outline"
          render={<Link href={`/underwriting/cover-note/${slip.id}`} />}
          nativeButton={false}
        >
          <ScrollText data-icon="inline-start" />
          Draft Cover Note
        </Button>
        <Button
          render={<Link href={`/underwriting/closing/${slip.id}`} />}
          nativeButton={false}
        >
          <FileCheck2 data-icon="inline-start" />
          Closing Instruction
        </Button>
      </div>
    </PageShell>
  )
}
