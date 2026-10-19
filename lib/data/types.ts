export type ClassOfBusiness =
  | "Property"
  | "Motor Vehicle"
  | "Marine Cargo"
  | "Engineering"
  | "Liability"
  | "Personal Accident"
  | "Surety Bond"
  | "Terrorism"

export type SlipStatus = "Draft" | "Released" | "Quoted" | "Closed"
export type PolicyStatus = "Active" | "Expiring" | "Expired"
export type PolicyType = "Baru" | "Renewal"
/** Status siklus hidup klaim. Tahapan dokumennya dicatat terpisah di ClaimStage. */
export type ClaimStatus = "Outstanding" | "Settled" | "Closed" | "Rejected"

/** Tahapan dokumen dan proses klaim, berjalan sendiri di samping status. */
export type ClaimStage =
  | "Tunggu Dokumen"
  | "Dokumen Belum Lengkap"
  | "Dokumen Lengkap"
  | "Proses Adjuster"
  | "SPK / SPGR terbit"
export type ClientStatus = "Active" | "Prospect" | "Inactive"

/** Satu klien bisa punya beberapa alamat, misalnya alamat perusahaan dan korespondensi. */
export interface ClientAddress {
  id: string
  label: string
  value: string
}

export interface Client {
  id: string
  name: string
  contactPerson: string
  email: string
  phone: string
  npwp: string
  ktp: string
  cob: ClassOfBusiness
  status: ClientStatus
  addresses: ClientAddress[]
  notes?: string
  createdAt: string
}

export interface LineItem {
  id: string
  description: string
  amount: number
}

export interface RateLine {
  id: string
  label: string
  rate: number | null
  premium: number
  basis?: string
}

export interface SecurityPanelRow {
  id: string
  insurer: string
  share: number
  role: "As Leader" | "As Member"
}

export interface PlacingSlip {
  id: string
  slipNo: string | null
  seq: number
  cob: ClassOfBusiness
  typeOfCover: string
  coverCode: string | null
  /** Klien asal tertanggung. Null bila nama diketik manual (data lama). */
  clientId: string | null
  /** Disalin dari klien saat dipilih, jadi perubahan data klien tidak mengubah slip. */
  insuredName: string
  correspondenceAddress: string
  currency: string
  status: SlipStatus
  periodTba: boolean
  inceptionDate: string | null
  expiryDate: string | null
  occupation?: string
  riskLocation?: string
  wordingForms: string[]
  coverage?: string
  constructionClass?: string
  indemnityPeriod?: string
  interestSection1?: string
  interestSection2?: string
  interestItems: LineItem[]
  sumInsuredSection1: LineItem[]
  sumInsuredSection2: LineItem[]
  deductiblesSection1: string[]
  deductiblesSection2: string[]
  specialConditions?: string
  clauseIds: string[]
  /**
   * Judul dan wording klausula yang diedit khusus slip ini, dikunci per id
   * klausula. Master clause tidak ikut berubah.
   */
  clauseOverrides?: Record<string, ClauseOverride>
  rateLines: RateLine[]
  tplLines: RateLine[]
  paLines: RateLine[]
  discountPct: number
  adminCost: number
  stampDuty: number
  brokeragePct: number
  includeVat: boolean
  createdAt: string
  updatedAt: string
  /* pasca-release */
  subjectivity?: string
  securityPanel?: SecurityPanelRow[]
  closingInstruction?: string
  coverNoteRemarks?: string
}

export interface Policy {
  id: string
  policyNo: string
  insuredName: string
  insurer: string
  cob: ClassOfBusiness
  inceptionDate: string
  expiryDate: string
  currency: string
  sumInsured: number
  premium: number
  brokeragePct: number
  type: PolicyType
  status: PolicyStatus
  riskLocation: string
  softcopy: string | null
}

export interface Claim {
  id: string
  claimNo: string
  policyNo: string
  insuredName: string
  insurer: string
  cob: ClassOfBusiness
  currency: string
  lossDate: string
  reportedDate: string | null
  documentCompleteDate: string | null
  spkDate: string | null
  location: string
  lossDescription: string
  assetDescription: string
  estimatedLoss: number
  claimedAmount: number
  paidAmount: number
  adjuster: string
  status: ClaimStatus
  stage: ClaimStage
  notes?: string
}

export interface Clause {
  id: string
  title: string
  cob: ClassOfBusiness | "All"
  typeOfCover: string | null
  wording: string
}

/** Isi klausula yang dipakai satu slip saja, menimpa master untuk slip itu. */
export interface ClauseOverride {
  title: string
  /** HTML hasil rich text editor, disanitasi sebelum dirender. */
  wording: string
}
