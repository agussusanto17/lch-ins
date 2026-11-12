/** Nama COB yang dipakai data contoh dan logika khusus (Property, Motor Vehicle). */
export type KnownClassOfBusiness =
  | "Property"
  | "Motor Vehicle"
  | "Marine Cargo"
  | "Engineering"
  | "Liability"
  | "Personal Accident"
  | "Surety Bond"
  | "Terrorism"

/**
 * Class of business. Daftar pilihannya dari master data, jadi COB baru yang
 * ditambah LCH juga sah; tipe ini tetap menyarankan nama yang dikenal.
 */
export type ClassOfBusiness = KnownClassOfBusiness | (string & {})

/** Cancelled dipakai untuk slip bernomor yang dibatalkan, supaya nomor tidak bolong. */
/** Jenis slip di menu Placement (Harry, 11 November 2026). */
export type SlipKind = "Placing" | "Endorsement" | "Cancellation"

/** Satu baris perhitungan endorsement: nilai × rate = premi setahun. */
export interface EndorsementCalcLine {
  label: string
  /** Nilai yang dikalikan rate; kosong untuk premi flat. */
  basis: number | null
  rate: number | null
  /** Satuan rate: "%" atau "‰". */
  unit: string
  /** Premi setahun baris ini, sebelum prorata. */
  premium: number
}

/** Kondisi pertanggungan slip pada satu waktu, dasar perhitungan endorsement. */
export interface EndorsementCalc {
  lines: EndorsementCalcLine[]
  sumInsured: number
  premium: number
}

export type SlipStatus =
  "Draft" | "Released" | "Quoted" | "Closed" | "Cancelled"
/**
 * Dihitung, tidak disimpan: dari tanggal berakhir polis (PRD A-17), atau
 * Cancelled bila polis sudah punya record Cancellation.
 */
export type PolicyStatus = "Active" | "Expiring" | "Expired" | "Cancelled"
export type PolicyType = "Baru" | "Renewal" | "Endorsement" | "Cancellation"
/** Kelompok perhitungan slip PAR + EQVET yang masing-masing terbit sebagai polis. */
export type SlipPart = "PAR" | "EQVET"
/**
 * Status siklus hidup klaim sesuai ERD (lookup claim_status). Tahapan
 * dokumennya dicatat terpisah di ClaimStage.
 */
export type ClaimStatus = "Outstanding" | "Settled" | "Closed" | "Rejected"

/**
 * Tahapan dokumen dan proses klaim, berjalan sendiri di samping status. Nama
 * dari Master Data (lookup claim_stage), jadi LCH bisa menambah tahapan.
 */
export type ClaimStage = string
/** Status klien dari Master Data (lookup client_status), misalnya Active. */
export type ClientStatus = string
export type ClientType = "Korporasi" | "Perorangan"

/** Satu klien bisa punya beberapa alamat, misalnya alamat perusahaan dan korespondensi. */
export interface ClientAddress {
  id: string
  /** Jenis alamat dari daftar pilihan address_type. */
  label: string
  value: string
  phone?: string
  isPrimary?: boolean
}

/** Berkas KYC yang diupload, misalnya copy KTP atau NPWP. */
export interface ClientDocument {
  id: string
  type: string
  fileName: string
  uploadedAt: string
  /**
   * Alamat untuk membuka isi berkas dari server. Kosong untuk data contoh dan
   * berkas dari masa prototipe yang isinya tidak pernah terunggah.
   */
  url?: string
  /** Id isi berkas yang baru diunggah dari form, belum tertaut ke klien. */
  fileId?: string
}

/** Data klien mengikuti form KYC LCH (ERD tabel clients). */
export interface Client {
  id: string
  clientType: ClientType
  /** Nama lengkap (perorangan) atau nama perusahaan (korporasi). */
  name: string
  npwp: string
  /** Perorangan: jenis dan nomor identitas tertanggung. */
  idType?: string
  idNumber?: string
  birthPlace?: string
  birthDate?: string
  /** Korporasi: PIC perusahaan beserta nomor KTP-nya. */
  contactPerson: string
  contactPersonIdNumber?: string
  email: string
  phone: string
  incomeSource?: string
  insurancePurpose?: string
  insurancePurposeNote?: string
  kycDate?: string
  cob: ClassOfBusiness
  status: ClientStatus
  addresses: ClientAddress[]
  documents: ClientDocument[]
  notes?: string
  createdAt: string
}

export type SppaStatus = "Draft" | "Submitted"

/** Surat Permintaan Penutupan Asuransi yang diisi Marketing per klien (PRD A-07). */
export interface Sppa {
  id: string
  clientId: string
  cob: ClassOfBusiness
  typeOfCover: string
  insuredName: string
  riskLocation: string
  occupation?: string
  currency: string
  sumInsured: number
  periodStart: string | null
  periodEnd: string | null
  /** Isian khusus per COB, disimpan sebagai jsonb sampai form SPPA LCH final. */
  answers: Record<string, string>
  /** Motor Vehicle: merek dan tipe dari master data. Nama hanya untuk tampilan. */
  vehicleBrandId?: string | null
  vehicleTypeId?: string | null
  vehicleBrandName?: string | null
  vehicleTypeName?: string | null
  status: SppaStatus
  createdAt: string
  updatedAt: string
}

export interface VehicleTypeOption {
  id: string
  name: string
  isActive: boolean
}

export interface VehicleBrandOption {
  id: string
  name: string
  isActive: boolean
  types: VehicleTypeOption[]
}

export interface LineItem {
  id: string
  description: string
  amount: number
  /**
   * Nilai yang hanya batas (limit), misalnya limit any one carrying CIT atau
   * limit TPL: tidak ikut total sum insured dan premi. Hanya COB selain
   * Property dan Motor Vehicle.
   */
  limitOnly?: boolean
  /**
   * Section objek Interest di slip ber-section (CAR, EAR): 2 = Third Party
   * Liability. Kosong berarti Section 1 Material Damage.
   */
  section?: 1 | 2
  /** Baris Interest slip Motor Vehicle: merek dan tipe dari master data. */
  vehicleBrandId?: string | null
  vehicleTypeId?: string | null
  vehicleBrandName?: string | null
  vehicleTypeName?: string | null
  /** Rincian terstruktur kendaraan bermotor (SE OJK KBM) */
  licensePlate?: string | null
  chassisNumber?: string | null
  engineNumber?: string | null
  year?: number | string | null
  color?: string | null
  vehicleModel?: string | null
  /** Lokasi slip Property untuk baris sum insured Section 1 dan 2. */
  locationId?: string | null
}

export interface RateLine {
  id: string
  label: string
  rate: number | null
  premium: number
  /**
   * Premi flat: premi diisi langsung dan rate kosong, misalnya Liability atau
   * MB (contoh slip LCH). Hanya COB selain Property dan Motor Vehicle.
   */
  flatPremium?: boolean
  basis?: string
  /** Batas bawah dan atas tarif OJK yang berlaku saat rate diisi. */
  min?: number | null
  max?: number | null
  boundSource?: string
  /**
   * Persentase loss limit baris rate Property: premi = sum insured × rate ×
   * persentase. Kosong berarti full value (100%).
   */
  lossLimitPct?: number | null
  /** Deductible untuk cover ini, teks bebas, paling banyak MAX_DEDUCTIBLES. */
  deductibles?: string[]
  /** Lokasi slip Property untuk baris rate. TPL, PA, dan COB lain kosong. */
  locationId?: string | null
  /**
   * Baris Interest pemilik baris rate, TPL, atau PA: kendaraan di Motor
   * Vehicle, objek di COB lain selain Property. Namanya tetap `vehicleId`
   * karena mula-mula dipakai untuk kendaraan.
   */
  vehicleId?: string | null
}

/**
 * Lokasi risiko slip Property (Harry, 5 November 2026). Tiap lokasi punya
 * okupasi, kelas konstruksi, sum insured, dan rate sendiri; baris sum insured
 * dan rate menunjuk lokasinya lewat `locationId`.
 */
export interface SlipLocation {
  id: string
  riskLocation: string
  /** Okupasi OJK "kode - nama", seperti `PlacingSlip.occupation`. */
  occupation?: string
  /** Nama okupasi di dokumen, tanpa kode. Kosong berarti nama OJK. */
  occupationLabel?: string
  /** Kode kelas konstruksi: K1, K2, atau K3. */
  constructionClass?: string
}

/** Batas isian deductible per cover (permintaan 4 November 2026). */
export const MAX_DEDUCTIBLES = 5

export const RATE_EXCEPTION_REASONS = [
  "Potongan sesuai nilai pertanggungan",
  "Perluasan jaminan",
] as const
export type RateExceptionReason = (typeof RATE_EXCEPTION_REASONS)[number]

/** Alasan rate di luar batas OJK, wajib dicatat sebelum release (PRD A-11). */
export interface RateException {
  reason: RateExceptionReason
  note: string
}

export interface SecurityPanelRow {
  id: string
  insurer: string
  share: number
  role: "As Leader" | "As Member"
  /**
   * Additional fee (%) dari premi bagian asuransi ini, diisi saat closing
   * (Harry, 12 November 2026). Kosong sama dengan 0.
   */
  additionalFeePct?: number
  /**
   * Additional fee asuransi ini sudah termasuk PPN 2,2%. Status PPN tiap
   * asuransi bisa berbeda (Harry, 12 November 2026).
   */
  additionalFeeIncludeVat?: boolean
}

/**
 * Satu peserta PA grup: data per orang yang dicetak di lampiran slip dan
 * nantinya dipakai klaim dan endorsement tambah/kurang peserta.
 */
/**
 * Rate open cover per kategori: persen dari nilai deklarasi (MOP dry 0,075%)
 * atau tarif per unit (container 20 ft IDR 150.000 per container).
 */
export interface OpenCoverRate {
  id: string
  /** Kategori yang dicetak, misalnya "DRY SHIPMENT" atau "40 FT - Iron/Scrap". */
  label: string
  basis: "percent" | "per_unit"
  /** Persen untuk basis percent, nominal mata uang slip untuk per_unit. */
  rate: number | null
  /** Satuan untuk per_unit, misalnya "container". */
  unit?: string
}

/** Lampiran placing slip, misalnya vessel schedule atau daftar unit. */
export interface SlipAttachment {
  id: string
  fileName: string
  /** Keterangan yang dicetak; kosong memakai nama file. */
  description?: string
  /** Alamat untuk membuka atau mengunduh isinya. */
  url?: string
  sizeBytes: number
  /** Isi lampiran ikut tercetak di halaman akhir dokumen slip. */
  printContent?: boolean
  uploadedAt: string
}

export interface SlipParticipant {
  id: string
  name: string
  /** NIK atau nomor paspor. */
  idNumber?: string
  /** Tanggal lahir, YYYY-MM-DD. */
  birthDate?: string | null
  gender?: string
  position?: string
  /** Level jabatan atau plan, misalnya Middle Manager. */
  level?: string
  workLocation?: string
  sumInsured: number
  beneficiary?: string
}

/** Satu baris Detail tambahan slip, dicetak "label : value" di tabel detail. */
export interface SlipDetailRow {
  label: string
  value: string
}

export interface PlacingSlip {
  id: string
  slipNo: string | null
  seq: number
  cob: ClassOfBusiness
  typeOfCover: string
  /**
   * Type of cover kedua slip Property (Earthquake), di bawah yang pertama.
   * Dicetak sebagai baris kedua Type of Cover dan dipakai polis EQVET.
   */
  typeOfCover2?: string
  /**
   * Nama type of cover yang dicetak di dokumen bila berbeda dari master,
   * misalnya "PROPERTY ALL RISKS + RIOTS, STRIKES, ... INSURANCE." seperti CI
   * LCH. Kosong berarti nama master.
   */
  typeOfCoverLabel?: string
  typeOfCover2Label?: string
  coverCode: string | null
  /** Klien asal tertanggung. Null bila nama diketik manual (data lama). */
  clientId: string | null
  /** SPPA sumber data slip, bila slip dibuat dari SPPA. */
  sppaId?: string | null
  /** Disalin dari klien saat dipilih, jadi perubahan data klien tidak mengubah slip. */
  insuredName: string
  correspondenceAddress: string
  currency: string
  status: SlipStatus
  periodTba: boolean
  inceptionDate: string | null
  expiryDate: string | null
  /**
   * Uraian tertanggung yang dicetak di bawah Insured Name dengan huruf asli,
   * misalnya daftar pihak a), b), c) di CI CGL LCH.
   */
  insuredDescription?: string
  /** Keterangan di bawah periode asuransi di dokumen, seperti CI LCH. */
  periodNote?: string
  /**
   * Label periode di dokumen, misalnya "Estimated Time of Departure (ETD)"
   * atau "Date of Tournament". Kosong berarti "Period of Insurance". Nilai
   * awalnya dari type of cover di Master Data.
   */
  periodLabel?: string
  /**
   * Teks periode di dokumen yang menggantikan tanggal dan keterangannya,
   * misalnya ETD single shipment atau periode proyek T.B.A. Tanggal tetap
   * disimpan untuk polis.
   */
  periodText?: string
  /**
   * Teks pengganti tanggal akhir di dokumen, misalnya "until final
   * destination" untuk single shipment. Tanggal akhir tetap disimpan untuk
   * polis. Nilai awalnya dari type of cover di Master Data.
   */
  periodEndText?: string
  /**
   * Detail tambahan yang dicetak di tabel detail dokumen setelah baris
   * bawaan, misalnya Retroactive Date atau Voyage. Label bawaannya datang dari
   * type of cover di Master Data.
   */
  detailRows?: SlipDetailRow[]
  /**
   * Slip COB selain Property dan Motor Vehicle yang dibagi Section 1 (Material
   * Damage) dan Section 2 (Third Party Liability), seperti CAR dan EAR. Nilai
   * awalnya dari type of cover di Master Data.
   */
  usesSections?: boolean
  occupation?: string
  /** Nama okupasi di dokumen slip ini, tanpa kode. Kosong berarti nama OJK. */
  occupationLabel?: string
  riskLocation?: string
  /**
   * Lokasi risiko slip Property, paling sedikit satu. Okupasi, risk location,
   * dan kelas konstruksi slip diisi dari lokasi: lokasi pertama, dan semua
   * alamat bernomor di risk location bila lokasinya lebih dari satu.
   */
  locations?: SlipLocation[]
  wordingForms: string[]
  coverage?: string
  constructionClass?: string
  indemnityPeriod?: string
  interestSection1?: string
  interestSection2?: string
  interestItems: LineItem[]
  sumInsuredSection1: LineItem[]
  sumInsuredSection2: LineItem[]
  specialConditions?: string
  /** Kalimat di atas daftar deductible, dicetak apa adanya kalau diisi. */
  deductibleIntro?: string
  /**
   * Exclusion slip, satu per baris dengan nomor a) atau 1) yang diketik
   * sendiri. Dicetak sebagai blok EXCLUSIONS setelah CLAUSES.
   */
  exclusions?: string
  clauseIds: string[]
  /**
   * Judul dan wording klausula yang diedit khusus slip ini, dikunci per id
   * klausula. Master clause tidak ikut berubah.
   */
  clauseOverrides?: Record<string, ClauseOverride>
  /**
   * Salinan judul dan wording setiap clause saat dipilih (tabel slip_clauses).
   * Dokumen cetak memakai salinan ini, jadi perubahan master clause sesudahnya
   * tidak mengubah slip yang sudah ada.
   */
  clauseCopies?: Record<string, ClauseOverride>
  /**
   * Daftar peserta PA grup. Hanya dimuat oleh detail slip, bukan daftar
   * slip; undefined berarti belum dimuat dan tidak diubah saat disimpan.
   */
  participants?: SlipParticipant[]
  /** Limit manfaat PA dalam persen UP per kode lookup pa_benefit; null memakai bawaan. */
  paBenefitLimits?: Record<string, number> | null
  /** Lampiran slip. Daftar slip tidak memuatnya; detail slip memuat. */
  attachments?: SlipAttachment[]
  /** Open cover: rate tanpa TSI dan premi; premi dicatat per deklarasi di polis. */
  openCover?: boolean
  openCoverRates?: OpenCoverRate[]
  /**
   * false bila type of cover slip tidak memakai tarif OJK, misalnya Heavy
   * Equipment (Harry, 9 November 2026): rate tanpa batas OJK dan brokerage
   * tanpa batas biaya akuisisi. Dibaca dari Master Data, tidak disimpan di
   * slip; kosong berarti memakai tarif OJK.
   */
  ojkTariff?: boolean
  /**
   * Judul kelompok per klausul di `clauseIds`, untuk slip tanpa section,
   * misalnya "Extensions" dan "General Conditions". Klausul tanpa judul
   * masuk kelompok tanpa judul.
   */
  clauseGroups?: Record<string, string>
  /**
   * Klausula Section 2 (Business Interruption) slip Property. Field `clause*`
   * di atas menjadi Section 1. Satu klausula hanya dipilih di satu kelompok.
   */
  clauseIdsSection2?: string[]
  clauseOverridesSection2?: Record<string, ClauseOverride>
  clauseCopiesSection2?: Record<string, ClauseOverride>
  /**
   * Klausula slip Property tanpa section, berlaku untuk seluruh polis. Dicetak
   * paling atas tanpa judul, sebelum Section 1, seperti CI LCH. Disimpan di
   * slip_clauses sebagai section 0.
   */
  clauseIdsGeneral?: string[]
  clauseOverridesGeneral?: Record<string, ClauseOverride>
  clauseCopiesGeneral?: Record<string, ClauseOverride>
  rateLines: RateLine[]
  tplLines: RateLine[]
  paLines: RateLine[]
  /** Alasan per id baris rate yang berada di luar batas OJK. */
  rateExceptions?: Record<string, RateException>
  discountPct: number
  adminCost: number
  stampDuty: number
  brokeragePct: number
  includeVat: boolean
  createdAt: string
  updatedAt: string
  /**
   * Tanggal dokumen "YYYY-MM-DD": Placing Slip (release), Quotation Slip dan
   * Draft Cover Note (quoted), Closing Instruction (closing). Terisi otomatis
   * saat status berpindah, bisa diubah manual. Lihat `lib/document-dates.ts`.
   */
  releaseDate?: string | null
  quotedDate?: string | null
  closingDate?: string | null
  /** Jenis slip; kosong berarti placing slip biasa. */
  kind?: SlipKind
  /** Polis yang di-endorse atau dibatalkan, dan nomornya untuk tampilan. */
  parentPolicyId?: string | null
  parentPolicyNo?: string | null
  /** Slip asal endorsement: kondisi sebelum perubahan. */
  baseSlipId?: string | null
  baseSlipNo?: string | null
  /** Tanggal efektif endorsement atau pembatalan "YYYY-MM-DD". */
  effectiveDate?: string | null
  /** Uraian perubahan yang dicetak di endorsement slip. */
  changeDescription?: string | null
  /** Baris premi slip asal saat endorsement dibuat. */
  beforeCalc?: EndorsementCalc | null
  /**
   * Endorsement atau cancellation slip yang dibuat dari slip ini dan belum
   * dibatalkan, dari server. Selama ada, slip ini tidak bisa direvisi lagi.
   */
  changeSlipLock?: ChangeSlipLock | null
  /** Nama pengguna yang membuat slip, dari server; untuk kolom dan filter di daftar Placement. */
  createdByName?: string
  /* pasca-release */
  subjectivity?: string
  securityPanel?: SecurityPanelRow[]
  closingInstruction?: string
  coverNoteRemarks?: string
}

/**
 * Slip perubahan yang mengunci slip asalnya (Agus, 12 November 2026). Revisi
 * slip asal tidak ikut ke endorsement slip yang sudah dibuat, karena kondisi
 * sebelum perubahan disimpan saat endorsement slip dibuat. Jadi perubahan polis
 * berikutnya harus lewat endorsement slip.
 */
export interface ChangeSlipLock {
  id: string
  slipNo: string | null
  kind: "Endorsement" | "Cancellation"
  status: SlipStatus
}

/** Jenis berkas polis: softcopy polis, Premium Note, atau Commission Note. */
export type PolicyFileKind = "Policy" | "PremiumNote" | "CommissionNote" | "Slip"

/** Berkas polis. Versi naik setiap upload per jenis, file lama tetap tersimpan. */
export interface PolicyFile {
  id: string
  kind: PolicyFileKind
  version: number
  fileName: string
  uploadedAt: string
  /** Kosong untuk file data contoh yang isinya tidak tersimpan. */
  url?: string
}

export interface Policy {
  id: string
  policyNo: string
  clientId: string | null
  placingSlipId: string | null
  placingSlipNo?: string | null
  /** Polis induk untuk renewal, endorsement, dan pembatalan. */
  parentPolicyId: string | null
  /**
   * No. polis sebelumnya untuk renewal yang polis lamanya belum ada di sistem.
   * Kosong bila polis sebelumnya dipilih lewat parentPolicyId.
   */
  previousPolicyNo?: string | null
  insuredName: string
  /** Asuransi leader. Pembagian share lengkap ada di `insurers`. */
  insurer: string
  insurers: SecurityPanelRow[]
  cob: ClassOfBusiness
  typeOfCover?: string
  inceptionDate: string
  expiryDate: string
  currency: string
  sumInsured: number
  /** Tambahan premi positif, pengembalian premi negatif (endorsement dan pembatalan). */
  premium: number
  brokeragePct: number
  /** Brokerage sudah termasuk PPN 2,2%, mengikuti slip. */
  includeVat?: boolean
  /**
   * Nominal fee di luar brokerage dalam mata uang polis, ikut report
   * produksi: premi × fee (%) per asuransi, dihitung server. Kosong sama
   * dengan 0; negatif pada pembatalan atau pengurangan premi.
   */
  additionalFee?: number
  /**
   * Additional fee (%) untuk polis satu asuransi, diisi di form polis. Polis
   * co-insurance memakai persen per asuransi di `insurers`.
   */
  additionalFeePct?: number
  /**
   * Additional fee polis satu asuransi sudah termasuk PPN 2,2%, diisi di form
   * polis. Polis co-insurance memakai status PPN per asuransi di `insurers`.
   */
  additionalFeeIncludeVat?: boolean
  /** Rate (%) endorsement; premi = sum insured × rate × hari prorata / 365. */
  rate?: number | null
  /** Sum insured dasar premi prorata; kosong berarti memakai sum insured endorsement. */
  premiumBasis?: number | null
  /** Biaya administrasi dan bea meterai endorsement; masuk total premi. */
  adminCost?: number
  stampDuty?: number
  /**
   * Bagian slip PAR + EQVET yang menjadi polis ini. Kosong untuk slip yang
   * terbit sebagai satu polis dan polis tanpa slip.
   */
  slipPart?: SlipPart | null
  type: PolicyType
  riskLocation: string
  /** Nomor urut endorsement pada polis induk, ditentukan server. */
  endorsementSeq?: number | null
  cobOjkClassId?: string | null
  placementLocationId?: string | null
  groupingInsured?: string
  /**
   * Tanggal premi dibayar "YYYY-MM-DD"; kosong berarti belum dibayar. Tampil
   * saat klaim dicatat (meeting LCH, 10 November 2026).
   */
  premiumPaidDate?: string | null
  /** Uraian perubahan endorsement atau alasan pembatalan, teks bebas. */
  remarks?: string | null
  files: PolicyFile[]
  /** Peserta PA grup yang masih aktif di daftar polis ini. */
  participantCount?: number
  /**
   * Polis ini, atau polis asal endorsement dan pembatalan ini, sudah punya
   * record Cancellation. Dihitung server dari seluruh tabel polis, tidak
   * disimpan (lihat `cancelledPolicies`).
   */
  cancelled?: boolean
}

export interface Claim {
  id: string
  claimNo: string
  policyId: string | null
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
  /** Peserta PA grup yang mengalami kejadian. */
  participantId?: string | null
  participantName?: string
  /** Jenis manfaat klaim PA (lookup pa_benefit). */
  paBenefitId?: string | null
  paBenefitName?: string
  /** UP peserta dan limit manfaatnya (persen UP), untuk peringatan nilai klaim. */
  participantSumInsured?: number | null
  benefitLimitPct?: number | null
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
