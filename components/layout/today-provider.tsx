"use client"

import * as React from "react"

const TodayContext = React.createContext<string | null>(null)

/**
 * Menyebarkan tanggal "hari ini" (WIB) yang dihitung server ke Client
 * Component. Tanggal tidak dihitung ulang di browser supaya hasil render
 * server dan client selalu sama (tidak ada hydration mismatch).
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
