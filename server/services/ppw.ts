export type PpwStatus = "safe" | "warning" | "overdue" | "critical"

export interface PpwAnalysis {
  daysLeft: number
  status: PpwStatus
  label: string
  color: "success" | "warning" | "destructive"
}

/** Tanggal kalender "YYYY-MM-DD" menurut WIB. */
function wibDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

/** Nomor hari sejak epoch untuk tanggal "YYYY-MM-DD", bebas zona waktu server. */
function dayNumber(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return Date.UTC(y, m - 1, d) / 86_400_000
}

/**
 * Menghitung status Premium Payment Warranty (PPW) berdasarkan tanggal jatuh tempo.
 *
 * Selisih hari dihitung dari tanggal kalender WIB, bukan jam server, supaya
 * server yang berjalan di UTC tidak menggeser jatuh tempo satu hari. Batas
 * 14 dan 30 hari masih usulan sampai LCH menentukan rentang aging.
 */
export function evaluatePpw(
  dueDateInput: string | Date,
  referenceDate = new Date()
): PpwAnalysis {
  const due =
    typeof dueDateInput === "string" ? dueDateInput : wibDate(dueDateInput)
  const daysLeft = dayNumber(due) - dayNumber(wibDate(referenceDate))

  if (daysLeft > 14) {
    return {
      daysLeft,
      status: "safe",
      label: `${daysLeft} hari lagi`,
      color: "success",
    }
  }

  if (daysLeft >= 0) {
    return {
      daysLeft,
      status: "warning",
      label: daysLeft === 0 ? "Jatuh tempo hari ini" : `Sisa ${daysLeft} hari`,
      color: "warning",
    }
  }

  const daysOverdue = Math.abs(daysLeft)
  if (daysOverdue <= 30) {
    return {
      daysLeft,
      status: "overdue",
      label: `Lewat ${daysOverdue} hari`,
      color: "destructive",
    }
  }

  return {
    daysLeft,
    status: "critical",
    label: `Breach (${daysOverdue} hari)`,
    color: "destructive",
  }
}
