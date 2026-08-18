"use client"

import { FormToolbar } from "@/components/shared/form-chrome"
import { StatusBadge } from "@/components/shared/status-badge"

export { FormActions as SlipFormActions, FormBody as SlipFormBody } from "@/components/shared/form-chrome"

/** FormToolbar dengan baris identitas khas placing slip: status + nomor slip. */
export function SlipFormToolbar({
  title,
  subtitle,
  status,
  slipNo,
  meta,
  backHref,
  allOpen,
  onToggleAll,
}: {
  title: string
  subtitle: string
  status: string
  slipNo: string | null
  meta?: React.ReactNode
  backHref: string
  allOpen?: boolean
  onToggleAll?: () => void
}) {
  return (
    <FormToolbar
      title={title}
      badge={<StatusBadge status={status} />}
      backHref={backHref}
      meta={meta}
      allOpen={allOpen}
      onToggleAll={onToggleAll}
      subtitle={
        <>
          {slipNo ? (
            <span className="text-primary tabular font-medium">{slipNo}</span>
          ) : (
            "Nomor digenerate saat release"
          )}
          <span className="mx-1.5">·</span>
          {subtitle}
        </>
      }
    />
  )
}
