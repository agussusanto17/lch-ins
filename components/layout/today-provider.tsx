"use client"

import * as React from "react"

const TodayContext = React.createContext<string | null>(null)

/**
 * Menyebarkan tanggal "hari ini" (WIB) dari server ke Client Component.
 * Tidak dihitung ulang di browser supaya render server dan client sama (tanpa hydration mismatch).
 */
export function TodayProvider({
  today,
  children,
}: {
  today: string
  children: React.ReactNode
}) {
  return <TodayContext value={today}>{children}</TodayContext>
}

export function useToday() {
  const today = React.useContext(TodayContext)
  if (!today) throw new Error("useToday harus dipakai di dalam TodayProvider")
  return today
}
