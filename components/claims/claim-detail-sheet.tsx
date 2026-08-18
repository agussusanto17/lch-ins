"use client"

import { CalendarDays, MapPin } from "lucide-react"

import { StatusBadge } from "@/components/shared/status-badge"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { Claim } from "@/lib/data"
import { dateShort, money } from "@/lib/format"

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
}: {
  claim: Claim | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-[34rem]">
        {claim ? (
          <>
            <SheetHeader>
              <SheetTitle className="tabular">{claim.claimNo}</SheetTitle>
              <SheetDescription>
                {claim.insuredName} · {claim.cob}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-6 px-4 pb-8">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={claim.status} />
                <span className="text-xs text-muted-foreground">
                  Adjuster: {claim.adjuster}
                </span>
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
                </div>
              </section>

              {claim.notes ? (
                <section className="rounded-xl bg-muted p-4">
                  <h3 className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                    <CalendarDays className="size-3" />
                    Catatan
                  </h3>
                  <p className="text-sm leading-relaxed">{claim.notes}</p>
                </section>
              ) : null}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
