"use client"

import * as React from "react"

import { getClaimPolicyInfoAction } from "@/app/(app)/claims/actions"
import { ToneBadge } from "@/components/shared/status-badge"
import { dateShort } from "@/lib/format"
import type { ClaimPolicyInfo } from "@/lib/server/claims"

/**
 * Info polis untuk klaim (meeting LCH, 10 November 2026): status premi,
 * deductible dari placing slip asal polis, dan file polis dari Policy
 * Database. Dimuat per polis karena datanya hanya perlu saat polis dipilih.
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

export function PolicyFileLink({ file }: { file: ClaimPolicyInfo["policyFile"] }) {
  if (!file) return <span className="text-muted-foreground">Belum diunggah</span>
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noreferrer"
      title={file.fileName}
      className="font-medium text-primary underline-offset-2 hover:underline"
    >
      Lihat polis{file.version > 1 ? ` (versi ${file.version})` : ""}
    </a>
  )
}

/** Panel di bawah pilihan polis pada form klaim. */
export function ClaimPolicyInfoPanel({
  info,
  loading,
}: {
  info: ClaimPolicyInfo | null
  loading: boolean
}) {
  if (loading) {
    return <p className="text-xs text-muted-foreground">Memuat info polis…</p>
  }
  if (!info) return null

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3 text-xs">
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
        <span className="text-muted-foreground">Deductible polis</span>
        {info.deductibleIntro ? (
          <p className="whitespace-pre-line text-foreground">{info.deductibleIntro}</p>
        ) : null}
        {info.deductibles.length ? (
          info.deductibles.map((group) => (
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
        ) : info.deductibleIntro ? null : (
          <p className="text-muted-foreground">
            {info.fromSlip
              ? "Placing slip polis ini tidak mencantumkan deductible."
              : "Polis ini tidak dibuat dari placing slip, jadi deductible-nya tidak tercatat."}
          </p>
        )}
      </div>
    </div>
  )
}
