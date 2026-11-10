/**
 * Data polis yang mengikuti placing slip. Dipakai form polis ("polis dari
 * slip") dan pencatatan polis otomatis saat Closing Instruction terbit
 * (meeting LCH, 10 November 2026), supaya keduanya menyalin data yang sama.
 */

import { slipPolicyPremium, totalSumInsured } from "@/lib/calc"
import type { PlacingSlip, Policy, SlipPart } from "@/lib/data/types"
import { usesOpenCover } from "@/lib/open-cover"
import { isExistingPolicyLabel } from "@/lib/slip-details"

export type PolicySlipFields = Pick<
  Policy,
  | "placingSlipId"
  | "slipPart"
  | "clientId"
  | "insuredName"
  | "cob"
  | "typeOfCover"
  | "currency"
  | "inceptionDate"
  | "expiryDate"
  | "sumInsured"
  | "premium"
  | "brokeragePct"
  | "additionalFee"
  | "riskLocation"
  | "insurer"
  | "insurers"
>

/**
 * Isian polis dari slip. Slip PAR + EQVET menjadi satu polis per bagian:
 * premi per bagian, polis EQVET memakai type of cover kedua, dan additional
 * fee ikut polis PAR. Slip open cover: nilai dan premi diisi per deklarasi.
 * Nama tertanggung mengikuti nama klien kalau klien slip diketahui.
 */
export function policyFieldsFromSlip(
  slip: PlacingSlip,
  part: SlipPart | null,
  client?: { id: string; name: string } | null
): PolicySlipFields {
  const panel = slip.securityPanel?.filter((r) => r.insurer) ?? []
  const leader = panel.find((r) => r.role === "As Leader") ?? panel[0]
  const openCover = usesOpenCover(slip)
  return {
    placingSlipId: slip.id,
    slipPart: part,
    clientId: client?.id ?? slip.clientId,
    insuredName: client?.name ?? slip.insuredName,
    cob: slip.cob,
    typeOfCover:
      part === "EQVET" && slip.typeOfCover2 ? slip.typeOfCover2 : slip.typeOfCover,
    currency: slip.currency,
    inceptionDate: slip.inceptionDate ?? "",
    expiryDate: slip.expiryDate ?? "",
    sumInsured: openCover ? 0 : totalSumInsured(slip),
    premium: openCover ? 0 : slipPolicyPremium(slip, part),
    brokeragePct: slip.brokeragePct,
    additionalFee: part === "EQVET" ? 0 : (slip.additionalFee ?? 0),
    riskLocation: slip.riskLocation ?? "",
    insurer: leader?.insurer ?? "",
    insurers: panel,
  }
}

/** Nomor polis tahun lalu dari baris Existing Policy No. slip, tanda renewal. */
export function slipExistingPolicyNo(slip: PlacingSlip): string | null {
  const row = (slip.detailRows ?? []).find(
    (r) => isExistingPolicyLabel(r.label) && r.value.trim()
  )
  return row ? row.value.trim() : null
}

/**
 * Nomor sementara polis yang dicatat otomatis: nomor Closing Instruction,
 * ditambah bagiannya untuk slip PAR + EQVET. Petugas polis menggantinya dengan
 * nomor polis dari asuransi saat mengunggah polis.
 */
export function provisionalPolicyNo(ciNo: string, part: SlipPart | null) {
  return part ? `${ciNo} (${part})` : ciNo
}

/** Nomor polis masih nomor sementara dari Closing Instruction. */
export function isProvisionalPolicyNo(policyNo: string) {
  return /\/LCH-PLCMT\/CI\b/.test(policyNo)
}
