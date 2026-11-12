"use server"

import { unstable_rethrow } from "next/navigation"

import type { RecapPolicy } from "@/lib/production-recap"
import { listProductionRecap } from "@/lib/server/production-recap"
import { requireAccess } from "@/lib/server/session"

export interface ActionResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Data rekap produksi format LCH untuk periode Report Operational. */
export async function productionRecapAction(
  start: string,
  end: string
): Promise<ActionResponse<RecapPolicy[]>> {
  try {
    await requireAccess("/reports")
    if (!ISO_DATE.test(start) || !ISO_DATE.test(end) || start > end) {
      return { ok: false, error: "Periode rekap tidak valid." }
    }
    return { ok: true, data: await listProductionRecap(start, end) }
  } catch (err: unknown) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "Gagal mengambil rekap produksi."
    return { ok: false, error: message }
  }
}
