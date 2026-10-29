"use client"

import * as React from "react"

import {
  CLAIMS,
  CLIENTS,
  POLICIES,
  SLIPS,
  SPPA,
  type Claim,
  type Client,
  type PlacingSlip,
  type Policy,
  type Sppa,
} from "@/lib/data"

/**
 * Store sesi untuk prototipe.
 *
 * Data contoh dimuat sekali, lalu setiap tambah, ubah, dan hapus dari form
 * langsung terlihat di tabel, halaman detail, dan dokumen cetak selama tab
 * browser terbuka. Tidak disimpan ke localStorage karena berisi data KYC.
 * Di fase backend, fungsi `store.*` diganti Server Action dengan nama yang sama.
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

const INITIAL: Collections = {
  clients: CLIENTS,
  sppa: SPPA,
  slips: SLIPS,
  policies: POLICIES,
  claims: CLAIMS,
}

let state: Collections = INITIAL
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

/** Seluruh baris satu koleksi. Render server memakai data awal. */
export function useCollection<K extends Key>(key: K): Collections[K] {
  return React.useSyncExternalStore(
    subscribe,
    () => state[key],
    () => INITIAL[key]
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
   * Store ini dimuati data contoh saat modul diimpor, dari waktu modulnya
   * belum punya database. Karena itu hidrasi pertama sebuah koleksi membuang
   * data contohnya lebih dulu; kalau tidak, baris dari database tampil
   * berdampingan dengan contohnya dan daftarnya jadi dobel.
   *
   * Hidrasi berikutnya hanya upsert, karena daftar yang datang belum tentu
   * lengkap. Halaman detail klien, misalnya, cuma mengirim SPPA milik klien
   * itu — kalau itu ikut mengganti seisi koleksi, SPPA klien lain hilang.
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
