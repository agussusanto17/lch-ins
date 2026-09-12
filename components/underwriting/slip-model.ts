import {
  BI_RATE_LABELS,
  premiumFromRate,
  rateModeFor,
  sumItems,
} from "@/lib/calc"
import {
  MOTOR_RATE_LINES,
  PROPERTY_RATE_LINES,
  TYPE_OF_COVER,
  type ClassOfBusiness,
  type PlacingSlip,
  type RateLine,
} from "@/lib/data"

let seq = 0
export const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${seq++}`

export function makeRateLines(cob: ClassOfBusiness): RateLine[] {
  if (cob === "Property") {
    return PROPERTY_RATE_LINES.map((label, i) => ({
      id: `r${i + 1}`,
      label,
      rate: null,
      premium: 0,
    }))
  }
  if (cob === "Motor Vehicle") {
    return MOTOR_RATE_LINES.map((label, i) => ({
      id: `r${i + 1}`,
      label,
      rate: null,
      premium: 0,
    }))
  }
  return [{ id: "r1", label: "Rate (‰)", rate: null, premium: 0 }]
}

export function makeMotorSubLines(): {
  tplLines: RateLine[]
  paLines: RateLine[]
} {
  return {
    tplLines: [
      {
        id: "t1",
        label: "Third Party Liability",
        rate: null,
        premium: 0,
        basis: "0",
      },
      {
        id: "t2",
        label: "Third Party Liability",
        rate: null,
        premium: 0,
        basis: "0",
      },
    ],
    paLines: [
      { id: "p1", label: "Driver", rate: null, premium: 0, basis: "0" },
      { id: "p2", label: "Passenger", rate: null, premium: 0, basis: "0" },
    ],
  }
}

export function emptySlip(): PlacingSlip {
  return {
    id: "new",
    slipNo: null,
    seq: 0,
    cob: "Property",
    typeOfCover: "",
    coverCode: null,
    clientId: null,
    insuredName: "",
    correspondenceAddress: "",
    currency: "IDR",
    status: "Draft",
    periodTba: false,
    inceptionDate: null,
    expiryDate: null,
    occupation: "",
    riskLocation: "",
    wordingForms: [""],
    coverage: "",
    constructionClass: "",
    indemnityPeriod: "",
    interestSection1: "",
    interestSection2: "",
    interestItems: [{ id: uid("i"), description: "", amount: 0 }],
    sumInsuredSection1: [{ id: uid("m"), description: "", amount: 0 }],
    sumInsuredSection2: [{ id: uid("b"), description: "", amount: 0 }],
    deductiblesSection1: [],
    deductiblesSection2: [],
    specialConditions: "",
    clauseIds: [],
    rateLines: makeRateLines("Property"),
    tplLines: [],
    paLines: [],
    discountPct: 0,
    adminCost: 0,
    stampDuty: 0,
    brokeragePct: 0,
    includeVat: false,
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
  }
}

/** Hitung ulang seluruh premium dari rate + sum insured. */
export function recalc(slip: PlacingSlip): PlacingSlip {
  const mode = rateModeFor(slip.cob)
  const mdBasis =
    slip.cob === "Property"
      ? sumItems(slip.sumInsuredSection1)
      : sumItems(slip.interestItems)
  const biBasis = sumItems(slip.sumInsuredSection2)

  const rateLines = slip.rateLines.map((l) => {
    const basis =
      slip.cob === "Property" && BI_RATE_LABELS.includes(l.label)
        ? biBasis
        : mdBasis
    return { ...l, premium: premiumFromRate(basis, l.rate, mode) }
  })

  const withBasis = (lines: RateLine[]) =>
    lines.map((l) => ({
      ...l,
      premium: premiumFromRate(Number(l.basis ?? 0), l.rate, "percent"),
    }))

  return {
    ...slip,
    rateLines,
    tplLines: withBasis(slip.tplLines),
    paLines: withBasis(slip.paLines),
  }
}

/** Ganti COB → reset struktur rate & type of cover. */
export function switchCob(
  slip: PlacingSlip,
  cob: ClassOfBusiness
): PlacingSlip {
  const motor = cob === "Motor Vehicle"
  const sub = motor ? makeMotorSubLines() : { tplLines: [], paLines: [] }
  return recalc({
    ...slip,
    cob,
    typeOfCover: "",
    coverCode: null,
    rateLines: makeRateLines(cob),
    ...sub,
  })
}

export function coverCodeFor(cob: ClassOfBusiness, typeOfCover: string) {
  return TYPE_OF_COVER[cob]?.find((t) => t.label === typeOfCover)?.code ?? null
}

/** Property punya blok Okupasi, Risk Location, Wording Form, dan Detail Coverage. */
export function usesPropertyBlocks(cob: ClassOfBusiness) {
  return cob !== "Motor Vehicle"
}

export function usesSectionSumInsured(cob: ClassOfBusiness) {
  return cob === "Property"
}
