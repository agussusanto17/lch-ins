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
export type ClaimStatus =
  | "Open"
  | "Dokumen Lengkap"
  | "Proses Adjuster"
  | "Approved"
  | "Paid"
  | "Rejected"
export type ClientStatus = "Active" | "Prospect" | "Inactive"

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
  address: string
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
  notes?: string
}

export interface Clause {
  id: string
  title: string
  cob: ClassOfBusiness | "All"
  typeOfCover: string | null
  wording: string
}
