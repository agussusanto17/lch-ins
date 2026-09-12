export type PpwStatus = "safe" | "warning" | "overdue" | "critical"

export interface PpwAnalysis {
  daysLeft: number
  status: PpwStatus
  label: string
  color: "success" | "warning" | "destructive"
}

/**
 * Menghitung status Premium Payment Warranty (PPW) berdasarkan tanggal jatuh tempo
 */
export function evaluatePpw(dueDateInput: string | Date, referenceDate = new Date()): PpwAnalysis {
  const due = typeof dueDateInput === "string" ? new Date(`${dueDateInput}T00:00:00`) : dueDateInput
  const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())

  const diffTime = due.getTime() - ref.getTime()
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

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
