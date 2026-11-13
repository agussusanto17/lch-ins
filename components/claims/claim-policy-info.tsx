"use client"

import * as React from "react"
import { ExternalLink, TriangleAlert } from "lucide-react"

import { getClaimPolicyInfoAction } from "@/app/(app)/claims/actions"
import { ToneBadge } from "@/components/shared/status-badge"
import {
  deductiblesOn,
  policyFileLinkText,
  type ClaimPolicyFile,
} from "@/lib/claim-policy-files"
import { todayIso } from "@/lib/date"
import { deductiblesByUnit } from "@/lib/deductible-text"
import { dateShort } from "@/lib/format"
import type { ClaimPolicyInfo } from "@/lib/server/claims"

/**
 * Info polis untuk klaim (meeting LCH, 10 November 2026): status premi,
 * deductible dari placing slip asal polis, dan berkas polis dari Policy
 * Database. Dimuat per polis karena datanya hanya perlu saat polis dipilih.
 * Endorsement dan pembatalan ikut polis induknya (13 November 2026).
 */
export function useClaimPolicyInfo(policyId: string | null | undefined) {
  const [loaded, setLoaded] = React.useState<{
    policyId: string
    info: ClaimPolicyInfo | null
  } | null>(null)

  React.useEffect(() => {
    if (!policyId) return
    let cancelled = false
    getClaimPolicyInfoAction(policyId).then((res) => {
      if (!cancelled) setLoaded({ policyId, info: res.ok ? (res.data ?? null) : null })
    })
    return () => {
      cancelled = true
    }
  }, [policyId])

  const current = loaded && loaded.policyId === policyId ? loaded : null
  return { info: current?.info ?? null, loading: Boolean(policyId) && !current }
}

export function PremiumStatusBadge({ date }: { date: string | null }) {
  return date ? (
    <ToneBadge tone="success">Sudah dibayar · {dateShort(date)}</ToneBadge>
  ) : (
    <ToneBadge tone="warning">Belum dibayar</ToneBadge>
  )
}

/**
 * Berkas Polis polis induk beserta endorsement dan pembatalannya (Agus, 13
 * November 2026). Tampil di form klaim sebelum disimpan dan di detail klaim.
 */
export function PolicyFilesList({ files }: { files: ClaimPolicyFile[] }) {
  if (!files.length) return <span className="text-muted-foreground">Belum diunggah</span>
  return (
    <ul className="flex flex-col gap-1.5">
      {files.map((f) => (
        <li
          key={f.policyId}
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5"
        >
          <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
            <span className="font-medium text-foreground">{f.label}</span>
            <span className="tabular text-muted-foreground">{f.policyNo}</span>
            {f.selected ? <ToneBadge tone="info">Dipilih</ToneBadge> : null}
          </span>
          {f.file ? (
            <a
              href={f.file.url}
              target="_blank"
              rel="noreferrer"
              title={f.file.fileName}
              className="inline-flex shrink-0 items-center gap-1 font-medium text-primary underline-offset-2 hover:underline"
            >
              {policyFileLinkText(f.file)}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : (
            <span className="shrink-0 text-muted-foreground">Belum diunggah</span>
          )}
        </li>
      ))}
    </ul>
  )
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Dari dokumen mana deductible diambil, bila polisnya punya endorsement. */
function deductibleSourceText(
  terms: ReturnType<typeof deductiblesOn>,
  onLossDate: boolean
) {
  const when = onLossDate ? "tanggal kejadian" : "hari ini"
  const source = terms.applied
    ? `${terms.applied.label} (efektif ${dateShort(terms.applied.effectiveDate)})`
    : "polis"
  const next = terms.next
    ? ` ${terms.next.label} baru efektif ${dateShort(terms.next.effectiveDate)}.`
    : ""
  return `Sesuai ${source}, yang berlaku pada ${when}.${next}`
}

/** Panel di bawah pilihan polis pada form klaim. */
export function ClaimPolicyInfoPanel({
  info,
  loading,
  lossDate,
}: {
  info: ClaimPolicyInfo | null
  loading: boolean
  /** Tanggal kejadian di form; kosong berarti hari ini. */
  lossDate?: string
}) {
  if (loading) {
    return <p className="text-xs text-muted-foreground">Memuat info polis…</p>
  }
  if (!info) return null

  const lossDay = lossDate && ISO_DATE.test(lossDate) ? lossDate : null
  // Deductible endorsement yang berlaku pada tanggal kejadian (13 November 2026).
  const terms = deductiblesOn(info, info.deductibleChanges, lossDay ?? todayIso())
  const cancelledOnLoss =
    info.cancellation && lossDay ? lossDay >= info.cancellation.effectiveDate : false

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3 text-xs">
      {cancelledOnLoss && info.cancellation ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md bg-warning/10 px-2.5 py-2 text-warning"
        >
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            Tanggal kejadian jatuh pada atau sesudah pembatalan polis, efektif{" "}
            {dateShort(info.cancellation.effectiveDate)} ({info.cancellation.policyNo}).
          </span>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground">Status premi</span>
        <PremiumStatusBadge date={info.premiumPaidDate} />
        {info.premiumPaidDate ? null : (
          <span className="text-muted-foreground">
            Tanggal bayar diisi di Policy Database.
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground">Berkas polis</span>
        <PolicyFilesList files={info.policyFiles} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground">Deductible polis</span>
        {info.deductibleChanges.length ? (
          <p className="text-muted-foreground">
            {deductibleSourceText(terms, lossDay !== null)}
          </p>
        ) : null}
        {terms.intro ? (
          <p className="whitespace-pre-line text-foreground">{terms.intro}</p>
        ) : null}
        {terms.deductibles.length ? (
          deductiblesByUnit(terms.deductibles).map((block) => {
            const list = block.groups.map((group) => (
              <div key={group.heading ?? "deductible"} className="flex flex-col gap-1">
                {group.heading ? (
                  <p className="font-medium text-foreground">{group.heading}</p>
                ) : null}
                <ul className="flex flex-col gap-1 text-foreground">
                  {group.texts.map((text) => (
                    <li key={text} className="flex gap-2">
                      <span className="shrink-0 select-none" aria-hidden>
                        -
                      </span>
                      <span className="min-w-0 flex-1 whitespace-pre-line">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
            // Deductible per lokasi, kendaraan, atau objek (13 November 2026).
            return block.unit ? (
              <div key={block.unit} className="flex flex-col gap-1">
                <p className="font-semibold text-foreground">{block.unit}</p>
                <div className="flex flex-col gap-1.5 border-l pl-3">{list}</div>
              </div>
            ) : (
              list
            )
          })
        ) : terms.intro ? null : (
          <p className="text-muted-foreground">
            {terms.applied
              ? `${terms.applied.label} tidak mencantumkan deductible.`
              : info.fromSlip
                ? "Placing slip polis ini tidak mencantumkan deductible."
                : "Polis ini tidak dibuat dari placing slip, jadi deductible-nya tidak tercatat."}
          </p>
        )}
      </div>
    </div>
  )
}
