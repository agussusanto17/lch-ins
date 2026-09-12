"use client"

import * as React from "react"

import { PlacingSlipForm } from "@/components/underwriting/placing-slip-form"
import {
  emptySlip,
  slipForClient,
  slipFromSppa,
} from "@/components/underwriting/slip-model"
import { store } from "@/lib/store"

/**
 * Slip baru, bisa terisi dari SPPA (`?sppa=`) atau dari halaman klien
 * (`?client=`). Data dibaca dari store sesi supaya SPPA atau klien yang baru
 * dibuat juga bisa dipakai.
 */
export function NewSlip({
  sppaId,
  clientId,
}: {
  sppaId?: string
  clientId?: string
}) {
  const [initial] = React.useState(() => {
    const sppa = sppaId ? store.get("sppa", sppaId) : null
    if (sppa) {
      const client = store.get("clients", sppa.clientId)
      return slipFromSppa(sppa, client)
    }
    const client = clientId ? store.get("clients", clientId) : null
    return client ? slipForClient(client) : emptySlip()
  })
  return <PlacingSlipForm initial={initial} mode="new" />
}
