"use client"

import { useEffect } from "react"

import { markAppShellVisited } from "@/lib/app-shell-history"

export function AppShellMarker() {
  useEffect(markAppShellVisited, [])
  return null
}
