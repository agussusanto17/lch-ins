"use server"

import { unstable_rethrow } from "next/navigation"

import { canSeeReportClaims } from "@/lib/access"
import type { ClaimStatisticsData } from "@/lib/claim-statistics"
import { lossRatioAccounts, type LossRatioReportData } from "@/lib/loss-ratio-report"
import type { RecapPolicy } from "@/lib/production-recap"
import { listClaimStatistics } from "@/lib/server/claim-statistics"
import { listLossRatioReport } from "@/lib/server/loss-ratio-report"
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

/**
 * Data Statistik Klaim per Status (MoM review Phase 1, poin 17). Role yang boleh sama dengan
 * bagian Klaim di Report Operational.
 */
export async function claimStatisticsAction(
  start: string,
  end: string
): Promise<ActionResponse<ClaimStatisticsData>> {
  try {
    const user = await requireAccess("/reports")
    if (!canSeeReportClaims(user.roles)) {
      return { ok: false, error: "Role Anda tidak bisa melihat data klaim di report." }
    }
    if (!ISO_DATE.test(start) || !ISO_DATE.test(end) || start > end) {
      return { ok: false, error: "Periode report tidak valid." }
    }
    return { ok: true, data: await listClaimStatistics(start, end) }
  } catch (err: unknown) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "Gagal mengambil data klaim."
    return { ok: false, error: message }
  }
}

/**
 * Data report loss ratio (template Team LCH, 20 November 2026): polis yang tahun polisnya mulai
 * di periode beserta klaimnya. Role yang boleh sama dengan bagian Klaim di Report Operational.
 */
export async function lossRatioReportAction(
  start: string,
  end: string
): Promise<ActionResponse<LossRatioReportData>> {
  try {
    const user = await requireAccess("/reports")
    if (!canSeeReportClaims(user.roles)) {
      return { ok: false, error: "Role Anda tidak bisa melihat data klaim di report." }
    }
    if (!ISO_DATE.test(start) || !ISO_DATE.test(end) || start > end) {
      return { ok: false, error: "Periode report tidak valid." }
    }
    return { ok: true, data: await listLossRatioReport(start, end) }
  } catch (err: unknown) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "Gagal mengambil data loss ratio."
    return { ok: false, error: message }
  }
}

/** Daftar akun (grouping insured) untuk pilihan di dialog Loss Ratio Akun per Asuransi. */
export async function lossRatioAccountsAction(): Promise<ActionResponse<string[]>> {
  try {
    const user = await requireAccess("/reports")
    if (!canSeeReportClaims(user.roles)) {
      return { ok: false, error: "Role Anda tidak bisa melihat data klaim di report." }
    }
    return { ok: true, data: lossRatioAccounts(await listLossRatioReport("0001-01-01", "9999-12-31")) }
  } catch (err: unknown) {
    unstable_rethrow(err)
    const message = err instanceof Error ? err.message : "Gagal mengambil daftar akun."
    return { ok: false, error: message }
  }
}
