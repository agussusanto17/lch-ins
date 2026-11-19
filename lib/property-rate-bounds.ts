/**
 * Batas tarif OJK slip Property. Dipakai form (rateLinesWithBounds) dan pengecekan release di
 * server (attachSlipRateBounds), supaya rate yang lolos di form tidak ditolak saat release.
 * Sebelumnya form hanya menghitung FLEXAS, sehingga rate FWTWD atau EQVET di bawah batas baru
 * ketahuan saat release dan form tidak menampilkan isian alasannya (19 November 2026).
 */
import {
  EQ_PROPERTY_TARIFFS,
  FLOOD_TARIFFS,
  OCCUPATION_TARIFFS,
  type OccupationTariff,
} from "./data/ojk-tariff"
import { matchEqZone, matchFloodRegion } from "./data/ojk-zones"
import type { PlacingSlip, RateLine, SlipLocation } from "./data/types"
import {
  isFloatingSumInsured,
  locationOwner,
  slipLocations,
  strictestBounds,
} from "./slip-locations"

export interface RateBounds {
  min: number
  /** null bila tidak ada batas atas, misalnya banjir zona tinggi yang memakai loading. */
  max: number | null
  source: string
}

export function getOccupationBounds(
  occupationCode: string,
  constructionClass: "K1" | "K2" | "K3" | string | undefined
): RateBounds | null {
  const code = occupationCode.trim().split(/[^0-9A-Za-z]/)[0]
  const cls = (constructionClass ?? "").toUpperCase().replace(/^K/, "K") as
    | "K1"
    | "K2"
    | "K3"

  if (!code || !["K1", "K2", "K3"].includes(cls)) return null

  const tariff = OCCUPATION_TARIFFS.find((t: OccupationTariff) => t.code === code)
  const range = tariff?.[cls.toLowerCase() as "k1" | "k2" | "k3"]

  if (!range) return null

  return {
    min: range[0],
    max: range[1],
    // Sama dengan teks panel Referensi Tarif OJK, yang ikut tersimpan sebagai sumber batas.
    source: `FLEXAS okupasi ${code} ${cls}`,
  }
}

/**
 * Batas OJK satu lokasi slip Property: FLEXAS dari okupasi dan kelas
 * konstruksi, gempa dan banjir dari wilayah alamatnya.
 */
export function getPropertyRateBounds(
  location: Pick<SlipLocation, "occupation" | "constructionClass" | "riskLocation">
): Record<string, RateBounds> {
  const bounds: Record<string, RateBounds> = {}
  const occupationCode = (location.occupation ?? "").trim()
  const constructionClass = location.constructionClass as
    | "K1"
    | "K2"
    | "K3"
    | undefined
  const riskLocation = location.riskLocation ?? ""

  const flexasBounds = getOccupationBounds(occupationCode, constructionClass)
  if (flexasBounds) {
    bounds["FLEXAS"] = flexasBounds
  }

  // Lampiran III Tabel III.A: slip belum mencatat kategori konstruksi gempa, jadi batasnya rentang
  // semua kategori di zona itu. Rumah tinggal (okupasi 2976) memakai baris DW, selainnya Com.
  const eqZone = matchEqZone(riskLocation)
  if (eqZone && eqZone.zone >= 1 && eqZone.zone <= 5) {
    const dwelling = occupationCode.split(/[^0-9A-Za-z]/)[0].startsWith("2976")
    const rates = EQ_PROPERTY_TARIFFS.filter((t) =>
      t.construction.startsWith(dwelling ? "DW:" : "Com:")
    ).map((t) => t.z[eqZone.zone - 1])
    bounds["EQVET"] = {
      min: Math.min(...rates),
      max: Math.max(...rates),
      source: `Gempa ${dwelling ? "Dwelling" : "Commercial"} Zona ${eqZone.zone}, ${eqZone.regency}`,
    }
  }

  // Lampiran II Tabel II.A dalam persen, rate properti dalam per mil. Zona banjir tidak tercatat
  // di slip dan zona tinggi memakai Zona 1 plus loading, jadi hanya batas bawah Zona 1 dijaga.
  const floodRegion = matchFloodRegion(riskLocation)
  const floodZone1 = FLOOD_TARIFFS.find(
    (t) =>
      t.line === "Harta Benda" && t.region === floodRegion && t.zone === "Zona 1"
  )
  if (floodRegion && floodZone1?.min != null) {
    bounds["FWTWD"] = {
      min: Number((floodZone1.min * 10).toFixed(6)),
      max: null,
      source: `Banjir ${floodRegion}, batas bawah Zona 1`,
    }
  }

  return bounds
}

/**
 * Baris rate slip Property beserta batas OJK. Batas tersimpan (dari panel Referensi Tarif OJK)
 * didahulukan; sisanya dihitung dari lokasi pemilik baris. Rate slip floating berlaku di semua
 * lokasi, jadi tiap cover memakai batas lokasi paling berisiko.
 */
export function propertyRateLinesWithBounds(slip: PlacingSlip): RateLine[] {
  const locations = slipLocations(slip)
  if (!locations.length) return slip.rateLines
  const owner = locationOwner(slip)
  const perLocation = locations.map(getPropertyRateBounds)
  const floating = (): Record<string, RateBounds> => {
    const labels = new Set(perLocation.flatMap((b) => Object.keys(b)))
    return Object.fromEntries(
      [...labels].flatMap((label) => {
        const b = strictestBounds(perLocation.map((bounds) => bounds[label]))
        return b ? [[label, b]] : []
      })
    )
  }
  const byLocation = new Map(
    isFloatingSumInsured(slip)
      ? [[locations[0].id, floating()]]
      : locations.map((location, i) => [location.id, perLocation[i]])
  )
  return slip.rateLines.map((l) => {
    if (l.min != null || l.max != null) return l
    const b = byLocation.get(owner(l.locationId))?.[l.label]
    return b ? { ...l, min: b.min, max: b.max, boundSource: b.source } : l
  })
}
