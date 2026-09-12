import { daysBetween } from "../date"
import type { PolicyStatus } from "./types"

/** Polis dianggap akan berakhir dalam jendela renewal notice. */
export const EXPIRING_WINDOW_DAYS = 60

/** Status polis dihitung dari tanggal berakhir (PRD A-17), tidak disimpan. */
export function policyStatus(expiryDate: string, today: string): PolicyStatus {
  const days = daysBetween(today, expiryDate)
  if (days < 0) return "Expired"
  if (days <= EXPIRING_WINDOW_DAYS) return "Expiring"
  return "Active"
}
