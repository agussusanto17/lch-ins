"use client"

import * as React from "react"

import type { Claim, Client, PlacingSlip, Policy, Sppa } from "@/lib/data"

/**
 * Store sesi di browser, mulai kosong dan diisi daftar server lewat `hydrate`.
 * Tidak disimpan ke localStorage karena berisi data KYC.
 */

interface Collections {
  clients: Client[]
  sppa: Sppa[]
  slips: PlacingSlip[]
  policies: Policy[]
  claims: Claim[]
}
type Key = keyof Collections
type Row<K extends Key> = Collections[K][number]

const EMPTY: never[] = []

let state: Collections = {
  clients: EMPTY,
  sppa: EMPTY,
  slips: EMPTY,
  policies: EMPTY,
  claims: EMPTY,
}
const listeners = new Set<() => void>()

/** Koleksi yang sudah pernah menerima daftar dari server. */
const hydrated = new Set<Key>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function commit<K extends Key>(key: K, rows: Collections[K]) {
  state = { ...state, [key]: rows }
  for (const listener of listeners) listener()
}

/**
 * `initial` (daftar server) dipakai sampai koleksi dihidrasi, supaya render
 * server dan render pertama di browser sama dan tabel tidak berkedip.
 */
export function useCollection<K extends Key>(
  key: K,
  initial?: Collections[K]
): Collections[K] {
  return React.useSyncExternalStore(
    subscribe,
    () => (hydrated.has(key) ? state[key] : (initial ?? state[key])),
    () => initial ?? (EMPTY as Collections[K])
  )
}

/** Satu baris berdasarkan id, atau null bila tidak ada. */
export function useRecord<K extends Key>(
  key: K,
  id: string | null | undefined
) {
  const rows = useCollection(key) as Row<K>[]
  return React.useMemo(
    () => (id ? (rows.find((r) => r.id === id) ?? null) : null),
    [rows, id]
  )
}

export const store = {
  all<K extends Key>(key: K): Collections[K] {
    return state[key]
  },
  get<K extends Key>(key: K, id: string): Row<K> | null {
    return (state[key] as Row<K>[]).find((r) => r.id === id) ?? null
  },
  insert<K extends Key>(key: K, row: Row<K>) {
    commit(key, [row, ...(state[key] as Row<K>[])] as Collections[K])
    return row
  },
  update<K extends Key>(key: K, id: string, patch: Partial<Row<K>>) {
    commit(
      key,
      (state[key] as Row<K>[]).map((r) =>
        r.id === id ? { ...r, ...patch } : r
      ) as Collections[K]
    )
  },
  /**
   * Pasang daftar dari server ke sebuah koleksi.
   *
   * Hidrasi pertama mengganti seisi koleksi; berikutnya hanya upsert karena
   * daftarnya bisa parsial (detail klien hanya mengirim SPPA klien itu).
   */
  hydrate<K extends Key>(key: K, rows: Collections[K]) {
    if (hydrated.has(key)) {
      for (const row of rows as Row<K>[]) store.upsert(key, row)
      return
    }
    hydrated.add(key)
    commit(key, rows)
  },
  /** Simpan baris: ganti bila id sudah ada, tambah bila belum. */
  upsert<K extends Key>(key: K, row: Row<K>) {
    if (store.get(key, row.id)) store.update(key, row.id, row)
    else store.insert(key, row)
    return row
  },
  replace<K extends Key>(key: K, rows: Collections[K]) {
    hydrated.add(key)
    commit(key, rows)
  },
  remove<K extends Key>(key: K, id: string) {
    commit(
      key,
      (state[key] as Row<K>[]).filter((r) => r.id !== id) as Collections[K]
    )
  },
}

/** Id unik untuk data baru di prototipe. */
export function newId(prefix: string) {
  const random = Math.random().toString(36).slice(2, 7)
  return `${prefix}-${Date.now().toString(36)}${random}`
}
