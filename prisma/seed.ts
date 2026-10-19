/**
 * Seed master data LCH.
 *
 * Idempotent: aman dijalankan berulang kali, semuanya pakai upsert dengan
 * kunci alami (kode), bukan id acak.
 *
 * Sumbernya ada di prisma/seed-data:
 * - cob-toc.csv            daftar COB dan type of cover milik LCH (sheet FIX)
 * - tarif-ojk-*.csv        lima tabel tarif SE OJK No. 6/SEOJK.05/2017
 * - zona-gempa-ojk.csv     511 kabupaten dan kota beserta zona gempanya
 * - skala-bi-ojk.csv       persentase tarif menurut indemnity period
 * - clause-wording-lch.csv 607 klausul dari pustaka wording LCH
 *
 * Jalankan: npm run db:seed
 */

import { randomBytes } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { hashPassword } from "better-auth/crypto"

import { Prisma } from "../lib/generated/prisma/client"
import { prisma } from "../lib/prisma"

const SEED_DIR = join(import.meta.dirname, "seed-data")

// ---------------------------------------------------------------------------
// Pembaca CSV
// ---------------------------------------------------------------------------

/**
 * Parser CSV kecil yang paham kutip ganda dan baris baru di dalam sel.
 * Wording klausula berisi baris baru, jadi split("\n") saja tidak cukup.
 */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false

  const src = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        cell += ch
      }
      continue
    }
    if (ch === '"') quoted = true
    else if (ch === ",") {
      row.push(cell)
      cell = ""
    } else if (ch === "\n") {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else cell += ch
  }
  if (cell !== "" || row.length) {
    row.push(cell)
    rows.push(row)
  }

  const header = rows.shift()
  if (!header) return []
  return rows
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) =>
      Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()]))
    )
}

const readCsv = (file: string) =>
  parseCsv(readFileSync(join(SEED_DIR, file), "utf8"))

/** Kolom angka yang boleh kosong. Kosong berarti belum ditentukan OJK. */
const dec = (v: string): Prisma.Decimal | null => {
  const s = (v ?? "").trim()
  return s === "" ? null : new Prisma.Decimal(s)
}

// ---------------------------------------------------------------------------
// Daftar pilihan pendek
// ---------------------------------------------------------------------------

/**
 * Isi awal lookup_values. Baris is_system dipakai logika sistem: labelnya boleh
 * diubah LCH, kodenya tidak, dan barisnya tidak boleh dihapus.
 */
const LOOKUPS: {
  type: string
  system: boolean
  values: [code: string, name: string][]
}[] = [
  {
    type: "role",
    system: true,
    values: [
      ["admin", "Admin"],
      ["marketing", "Marketing"],
      ["placement", "Placement/Teknik"],
      ["claim", "Klaim"],
      ["finance", "Finance"],
    ],
  },
  {
    type: "reset_period",
    system: true,
    values: [
      ["monthly", "Bulanan"],
      ["yearly", "Tahunan"],
      ["continuous", "Berlanjut"],
    ],
  },
  {
    type: "rate_mode",
    system: true,
    values: [
      ["permil", "Per mil"],
      ["percent", "Persen"],
    ],
  },
  {
    type: "form_variant",
    system: true,
    values: [
      ["property", "Property"],
      ["motor", "Motor"],
      ["standard", "Standard"],
    ],
  },
  {
    type: "rate_line_kind",
    system: true,
    values: [
      ["rate", "Rate"],
      ["tpl", "TPL"],
      ["pa", "PA"],
    ],
  },
  {
    type: "construction_class",
    system: true,
    values: [
      ["K1", "Kelas 1"],
      ["K2", "Kelas 2"],
      ["K3", "Kelas 3"],
    ],
  },
  {
    type: "client_status",
    system: false,
    values: [
      ["prospect", "Prospect"],
      ["active", "Active"],
      ["inactive", "Inactive"],
    ],
  },
  {
    type: "client_type",
    system: true,
    values: [
      ["individual", "Perorangan"],
      ["corporate", "Korporasi"],
    ],
  },
  {
    type: "id_type",
    system: false,
    values: [
      ["ktp", "KTP"],
      ["sim", "SIM"],
      ["passport", "Paspor"],
    ],
  },
  {
    type: "income_source",
    system: false,
    values: [
      ["business", "Hasil usaha"],
      ["salary", "Gaji bulanan"],
      ["entrepreneur", "Wirausaha"],
      ["other", "Lain-lain"],
    ],
  },
  {
    type: "insurance_purpose",
    system: false,
    values: [
      ["asset", "Perlindungan aset"],
      ["credit", "Persyaratan pemberi kredit"],
      ["other", "Lain-lain"],
    ],
  },
  {
    type: "address_type",
    system: false,
    values: [
      ["company", "Alamat perusahaan"],
      ["correspondence", "Alamat korespondensi"],
      ["billing", "Alamat penagihan"],
    ],
  },
  {
    type: "client_document_type",
    system: false,
    values: [
      ["id_copy", "Copy KTP, SIM, atau paspor"],
      ["npwp_copy", "Copy NPWP"],
      ["kyc_form", "Form KYC"],
      ["other", "Lain-lain"],
    ],
  },
  {
    type: "security_role",
    system: true,
    values: [
      ["leader", "As Leader"],
      ["member", "As Member"],
    ],
  },
  {
    type: "policy_type",
    system: true,
    values: [
      ["new", "Baru"],
      ["renewal", "Renewal"],
      ["endorsement", "Endorsement"],
      ["cancellation", "Cancellation"],
    ],
  },
  {
    // Status siklus hidup klaim, sesuai koreksi Harry 5 Okt 2026. Tahapan
    // dokumennya dipisah ke lookup claim_stage di bawah.
    type: "claim_status",
    system: true,
    values: [
      ["outstanding", "Outstanding"],
      ["settled", "Settled"],
      ["closed", "Closed"],
      ["rejected", "Rejected"],
    ],
  },
  {
    // Tahapan dokumen klaim, dipilih terpisah dari status.
    type: "claim_stage",
    system: true,
    values: [
      ["waiting_document", "Tunggu Dokumen"],
      ["document_incomplete", "Dokumen Belum Lengkap"],
      ["document_complete", "Dokumen Lengkap"],
      ["adjuster", "Proses Adjuster"],
      ["spk", "SPK / SPGR terbit"],
    ],
  },
  {
    type: "payment_model",
    system: true,
    values: [
      ["via_lch", "Via rekening LCH"],
      ["direct", "Langsung ke asuransi"],
    ],
  },
  {
    type: "payment_type",
    system: true,
    values: [
      ["premium_in", "Terima premi"],
      ["premium_out", "Setor premi"],
      ["brokerage_in", "Terima brokerage"],
      ["claim_in", "Terima klaim"],
      ["claim_out", "Bayar klaim"],
    ],
  },
  {
    type: "bank",
    system: false,
    values: [
      ["bca", "BCA"],
      ["ocbc", "OCBC NISP"],
      ["mandiri", "Mandiri"],
      ["bni", "BNI"],
      ["bri", "BRI"],
    ],
  },
  {
    type: "account_type",
    system: true,
    values: [
      ["asset", "Asset"],
      ["liability", "Liability"],
      ["equity", "Equity"],
      ["revenue", "Revenue"],
      ["expense", "Expense"],
    ],
  },
]

async function seedLookups() {
  let n = 0
  let retired = 0
  for (const group of LOOKUPS) {
    for (const [i, [code, name]] of group.values.entries()) {
      await prisma.lookupValue.upsert({
        where: { lookupType_code: { lookupType: group.type, code } },
        create: {
          lookupType: group.type,
          code,
          name,
          sortOrder: i,
          isSystem: group.system,
        },
        // Label sengaja tidak ditimpa, supaya perubahan dari LCH tidak hilang
        // saat seed dijalankan lagi.
        update: { sortOrder: i, isSystem: group.system },
      })
      n++
    }

    // Kode pada lookup is_system dimiliki program, bukan LCH. Kalau sebuah kode
    // dihapus dari daftar di atas, barisnya tidak ikut dihapus supaya data lama
    // yang menunjuk ke sana tetap bisa ditelusuri, tapi dinonaktifkan supaya
    // berhenti muncul di dropdown. Tanpa ini, memecah claim_status menjadi
    // claim_status dan claim_stage menyisakan sepuluh pilihan lama di database.
    if (group.system) {
      const { count } = await prisma.lookupValue.updateMany({
        where: {
          lookupType: group.type,
          isActive: true,
          code: { notIn: group.values.map(([code]) => code) },
        },
        data: { isActive: false },
      })
      retired += count
    }
  }
  return { n, retired }
}

const lookupId = async (lookupType: string, code: string) => {
  const row = await prisma.lookupValue.findUniqueOrThrow({
    where: { lookupType_code: { lookupType, code } },
  })
  return row.id
}

// ---------------------------------------------------------------------------
// Referensi lain
// ---------------------------------------------------------------------------

async function seedCurrencies() {
  const list = [
    ["IDR", "Rupiah"],
    ["USD", "US Dollar"],
    ["SGD", "Singapore Dollar"],
    ["EUR", "Euro"],
  ]
  for (const [code, name] of list) {
    await prisma.currency.upsert({
      where: { code },
      create: { code, name },
      update: {},
    })
  }
  return list.length
}

async function seedDocumentTypes() {
  // Periode reset masih menunggu jawaban LCH, sementara dipasang bulanan
  // mengikuti contoh nomor Debit Note dan Credit Note yang sudah ada.
  const monthly = await lookupId("reset_period", "monthly")
  const list: [code: string, name: string, pattern: string][] = [
    ["PS", "Placing Slip", "{seq:3}/LCH-PLCMT/PS-{COVER}/{MMROMAN}/{YYYY}"],
    ["QS", "Quotation Slip", "{seq:3}/LCH-PLCMT/QS-{COVER}/{MMROMAN}/{YYYY}"],
    ["CVN", "Cover Note", "{seq:3}/LCH-PLCMT/CVN-{COVER}/{MMROMAN}/{YYYY}"],
    [
      "CI",
      "Closing Instruction",
      "{seq:3}/LCH-PLCMT/CI-{COVER}/{MMROMAN}/{YYYY}",
    ],
    ["DN", "Debit Note", "{seq:4}/DNLCH/{MM}/{YYYY}"],
    ["CN", "Credit Note", "{seq:4}/CNLCH/{MM}/{YYYY}"],
    ["CLM", "Klaim", "{seq:4}/CLM/{MM}/{YYYY}"],
    ["JV", "Jurnal", "{seq:4}/JV/{MM}/{YYYY}"],
  ]
  for (const [code, name, numberPattern] of list) {
    await prisma.documentType.upsert({
      where: { code },
      create: { code, name, numberPattern, resetPeriodId: monthly },
      update: { name, numberPattern },
    })
  }
  return list.length
}

async function seedCompanyProfile() {
  const name = "PT. LCH Insurance Brokers"
  const existing = await prisma.companyProfile.findFirst({ where: { name } })
  const data = {
    name,
    address:
      "Springhill Office Tower 11th Floor Unit H, Jl. Benyamin Suaeb Block D6, Kemayoran, Jakarta Utara 14410",
    skojkNo: "KEP-46/NB.1/2016",
    apparindoNo: "237-2016",
  }
  if (existing) {
    await prisma.companyProfile.update({ where: { id: existing.id }, data })
  } else {
    await prisma.companyProfile.create({ data })
  }
  return 1
}

/**
 * COB dan type of cover dari sheet FIX milik LCH. Kode COB adalah dua digit
 * pertama kode type of cover.
 *
 * Satuan rate dan tampilan form mengikuti SE OJK: harta benda per mil,
 * kendaraan bermotor persen, sisanya per mil dengan form standar.
 */
const COB_FORM: Record<string, { rateMode: string; formVariant: string }> = {
  "01": { rateMode: "permil", formVariant: "property" },
  "02": { rateMode: "percent", formVariant: "motor" },
}

async function seedCobAndCoverTypes() {
  const rows = readCsv("cob-toc.csv")
  const permil = await lookupId("rate_mode", "permil")
  const percent = await lookupId("rate_mode", "percent")
  const variants = {
    property: await lookupId("form_variant", "property"),
    motor: await lookupId("form_variant", "motor"),
    standard: await lookupId("form_variant", "standard"),
  }

  const cobs = new Map<string, string>()
  for (const r of rows) {
    if (cobs.has(r.kode_cob)) continue
    const form = COB_FORM[r.kode_cob] ?? {
      rateMode: "permil",
      formVariant: "standard",
    }
    const cob = await prisma.classOfBusiness.upsert({
      where: { code: r.kode_cob },
      create: {
        code: r.kode_cob,
        name: r.cob,
        rateModeId: form.rateMode === "percent" ? percent : permil,
        formVariantId: variants[form.formVariant as keyof typeof variants],
      },
      update: { name: r.cob },
    })
    cobs.set(r.kode_cob, cob.id)
  }

  for (const r of rows) {
    await prisma.coverType.upsert({
      where: { code: r.kode_toc },
      create: { code: r.kode_toc, name: r.toc, cobId: cobs.get(r.kode_cob)! },
      update: { name: r.toc, cobId: cobs.get(r.kode_cob)! },
    })
  }
  return { cobs: cobs.size, coverTypes: rows.length }
}

/**
 * Baris rate bawaan per COB, dipakai membuat tabel rate saat slip baru.
 * Mengikuti tampilan prototipe yang sudah disetujui LCH.
 */
async function seedCobRateLines() {
  const rateKind = await lookupId("rate_line_kind", "rate")
  const tplKind = await lookupId("rate_line_kind", "tpl")
  const paKind = await lookupId("rate_line_kind", "pa")

  const perCob: Record<string, [kind: string, label: string][]> = {
    "01": [
      [rateKind, "FLEXAS"],
      [rateKind, "FWTWD"],
      [rateKind, "RSMDCC"],
      [rateKind, "Other Losses"],
      [rateKind, "BI PAR (FLEXAS + FWTWD + RSMDCC + Others)"],
      [rateKind, "EQVET"],
      [rateKind, "BI EQVET"],
    ],
    "02": [
      [rateKind, "Comprehensive Casco"],
      [rateKind, "Loading Rate Comprehensive"],
      [rateKind, "Flood, Windstorm, Tempest & Water Damage"],
      [rateKind, "Earthquake, Volcanic Eruption & Tsunami"],
      [rateKind, "Strike, Riot, Civil Commotion"],
      [rateKind, "Terrorism & Sabotage"],
      [rateKind, "Authorized Workshop"],
      [rateKind, "Theft by Driver"],
      [tplKind, "Third Party Liability"],
      [paKind, "Driver"],
      [paKind, "Passenger"],
    ],
  }

  let n = 0
  for (const [cobCode, lines] of Object.entries(perCob)) {
    const cob = await prisma.classOfBusiness.findUnique({
      where: { code: cobCode },
    })
    if (!cob) continue
    // Baris default ditulis ulang seluruhnya supaya urutannya tidak kacau.
    await prisma.cobRateLine.deleteMany({ where: { cobId: cob.id } })
    await prisma.cobRateLine.createMany({
      data: lines.map(([kindId, label], i) => ({
        cobId: cob.id,
        kindId,
        label,
        sortOrder: i,
      })),
    })
    n += lines.length
  }
  return n
}

// ---------------------------------------------------------------------------
// Tarif OJK
// ---------------------------------------------------------------------------

async function seedOccupations() {
  const rows = readCsv("tarif-ojk-okupasi.csv")
  let occ = 0
  let tariffs = 0
  const seen = new Map<string, string>()
  const conflicts: string[] = []

  for (const r of rows) {
    const code = r.kode_okupasi
    if (!code) continue

    // Hasil ekstraksi PDF pernah memberi kode sama ke dua okupasi berbeda.
    // Yang belakangan dilewat supaya tarifnya tidak menimpa yang pertama,
    // lalu dilaporkan untuk dicek ulang ke LCH.
    const previous = seen.get(code)
    if (previous !== undefined) {
      if (previous !== r.keterangan) {
        conflicts.push(`${code}: "${previous}" vs "${r.keterangan}"`)
      }
      continue
    }
    seen.set(code, r.keterangan)
    const occupation = await prisma.occupation.upsert({
      where: { code },
      create: { code, name: r.keterangan || code },
      update: { name: r.keterangan || code },
    })
    occ++

    for (const [cls, lo, hi] of [
      ["K1", r.k1_bawah, r.k1_atas],
      ["K2", r.k2_bawah, r.k2_atas],
      ["K3", r.k3_bawah, r.k3_atas],
    ] as const) {
      const rateMin = dec(lo)
      const rateMax = dec(hi)
      // Sebagian okupasi di lampiran tidak punya angka untuk kelas tertentu.
      if (rateMin === null || rateMax === null) continue
      await prisma.tariffOccupation.upsert({
        where: {
          occupationId_constructionClass: {
            occupationId: occupation.id,
            constructionClass: cls,
          },
        },
        create: {
          occupationId: occupation.id,
          constructionClass: cls,
          rateMin,
          rateMax,
        },
        update: { rateMin, rateMax },
      })
      tariffs++
    }
  }
  return { occ, tariffs, conflicts }
}

async function seedEqZones() {
  const rows = readCsv("zona-gempa-ojk.csv")
  for (const r of rows) {
    await prisma.eqZone.upsert({
      where: {
        province_regency: { province: r.provinsi, regency: r.kabupaten_kota },
      },
      create: {
        province: r.provinsi,
        regency: r.kabupaten_kota,
        zone: `Zona ${r.zona}`,
      },
      update: { zone: `Zona ${r.zona}` },
    })
  }
  return rows.length
}

async function seedEqPropertyTariffs() {
  const rows = readCsv("tarif-ojk-gempa-properti.csv")
  let n = 0
  for (const r of rows) {
    for (const z of [1, 2, 3, 4, 5]) {
      const rate = dec(r[`zona_${z}`])
      if (rate === null) continue
      const key = {
        constructionCategory: r.kategori_konstruksi,
        zone: `Zona ${z}`,
      }
      await prisma.tariffEqProperty.upsert({
        where: { constructionCategory_zone: key },
        create: { ...key, rate },
        update: { rate },
      })
      n++
    }
  }
  return n
}

/** Nama jenis pertanggungan di CSV dipetakan ke enum CoverageType. */
const coverageType = (v: string) => {
  const s = (v ?? "").trim().toLowerCase()
  if (s === "comprehensive") return "Comprehensive" as const
  if (s === "total loss only") return "TotalLossOnly" as const
  return null
}

async function seedFloodTariffs() {
  const rows = readCsv("tarif-ojk-banjir.csv")
  // Ditulis ulang tiap seed, karena tabel ini tidak punya kunci alami: harta
  // benda dibedakan zona, kendaraan bermotor dibedakan jenis pertanggungan.
  await prisma.tariffFlood.deleteMany()
  await prisma.tariffFlood.createMany({
    data: rows.map((r) => ({
      line: r.lini,
      region: r.wilayah,
      zone: r.zona,
      coverageType: coverageType(r.jenis_pertanggungan),
      rateMin: dec(r.batas_bawah),
      rateMax: dec(r.batas_atas),
      note: r.catatan || null,
    })),
  })
  return rows.length
}

/** "0 sampai Rp125.000.000" dan "Di atas Rp800.000.000" jadi batas angka. */
function parseSumInsuredBand(label: string) {
  const numbers = [...label.matchAll(/Rp([\d.]+)/g)].map((m) =>
    Number(m[1].replace(/\./g, ""))
  )
  if (/^di atas/i.test(label)) {
    return { siMin: numbers[0] ?? null, siMax: numbers[1] ?? null }
  }
  if (numbers.length) return { siMin: 0, siMax: numbers[0] }
  return { siMin: null, siMax: null }
}

async function seedMotorTariffs() {
  const rows = readCsv("tarif-ojk-kbm.csv")
  for (const r of rows) {
    const cover = coverageType(r.jenis_pertanggungan)
    if (!cover) continue
    const band = parseSumInsuredBand(r.uang_pertanggungan)
    const key = {
      category: r.kategori,
      region: r.wilayah,
      coverageType: cover,
    }
    const data = {
      vehicleType: r.jenis_kendaraan,
      siMin: band.siMin === null ? null : new Prisma.Decimal(band.siMin),
      siMax: band.siMax === null ? null : new Prisma.Decimal(band.siMax),
      rateMin: dec(r.batas_bawah)!,
      rateMax: dec(r.batas_atas)!,
    }
    await prisma.tariffMotor.upsert({
      where: { category_region_coverageType: key },
      create: { ...key, ...data },
      update: data,
    })
  }
  return rows.length
}

async function seedMotorExtensions() {
  const rows = readCsv("tarif-ojk-kbm-perluasan.csv")
  // Tabel ini tidak punya kunci alami yang rapi, jadi ditulis ulang tiap seed.
  await prisma.tariffMotorExtension.deleteMany()
  await prisma.tariffMotorExtension.createMany({
    data: rows.map((r) => ({
      cover: r.jaminan,
      coverageType: coverageType(r.jenis_pertanggungan),
      basis: r.dasar,
      rateMin: dec(r.batas_bawah),
      rateMax: dec(r.batas_atas),
      note: r.catatan || null,
    })),
  })
  return rows.length
}

async function seedBiScales() {
  const rows = readCsv("skala-bi-ojk.csv")
  for (const r of rows) {
    const months = Number(r.indemnity_period_bulan)
    const percentage = dec(r.persentase_tarif)!
    await prisma.biScale.upsert({
      where: { indemnityMonths: months },
      create: { indemnityMonths: months, percentage },
      update: { percentage },
    })
  }
  return rows.length
}

// ---------------------------------------------------------------------------
// Klausula
// ---------------------------------------------------------------------------

/** Plain text jadi HTML, supaya rich text editor menampilkan paragrafnya. */
function toHtml(text: string) {
  if (/<\/?[a-z][\s\S]*>/i.test(text)) return text
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`)
    .join("")
}

/**
 * 607 klausul dari pustaka LCH. Dikelompokkan per produk (PAR, EQVET, Cargo,
 * dan seterusnya), tapi pemetaan kelompok itu ke COB dan type of cover masih
 * ditunggu dari LCH. Sampai itu datang, semua klausul berlaku untuk semua COB.
 */
async function seedClauses() {
  const rows = readCsv("clause-wording-lch.csv")
  let skipped = 0
  const data: { title: string; sourceGroup: string; wordingHtml: string }[] = []

  for (const r of rows) {
    const title = r.judul_klausul?.trim()
    if (!title) continue
    if (!r.wording?.trim()) {
      // 12 klausul wordingnya kosong di file LCH, ditanyakan ke Harry.
      skipped++
      continue
    }
    data.push({
      title,
      sourceGroup: r.produk?.trim() ?? "",
      wordingHtml: toHtml(r.wording.trim()),
    })
  }

  // Satu INSERT ... ON CONFLICT DO NOTHING, bukan upsert per baris. Hasilnya
  // sama: wording yang sudah ada sengaja tidak ditimpa, karena klausul bisa
  // diedit LCH lewat Master Clauses. Upsert per baris butuh satu perjalanan
  // ke database per klausul, dan ke database cloud itu memakan menit.
  const { count } = await prisma.clause.createMany({
    data,
    skipDuplicates: true,
  })
  return { n: data.length, created: count, skipped }
}

/**
 * Akun awal, satu per role, supaya sistem bisa dicoba sebelum LCH mengirim
 * daftar pengguna sungguhan. Ini data contoh dan harus diganti.
 *
 * Kata sandinya tidak ditulis di repo. Isi SEED_USER_PASSWORD kalau mau
 * menentukan sendiri; kalau kosong, seed membuat kata sandi acak dan
 * menampilkannya sekali di akhir. Hash-nya dibuat memakai fungsi milik Better
 * Auth supaya cocok dengan yang dipakai saat login.
 */
const SEED_USERS: [email: string, name: string, roleCode: string][] = [
  ["admin@lch.example", "Admin LCH", "admin"],
  ["marketing@lch.example", "Marketing LCH", "marketing"],
  ["teknik@lch.example", "Placement LCH", "placement"],
  ["klaim@lch.example", "Klaim LCH", "claim"],
  ["finance@lch.example", "Finance LCH", "finance"],
]

async function seedUsers() {
  const password =
    process.env.SEED_USER_PASSWORD ||
    randomBytes(12).toString("base64url").slice(0, 16)
  const passwordHash = await hashPassword(password)
  let created = 0

  for (const [email, name, roleCode] of SEED_USERS) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) continue

    const roleId = await lookupId("role", roleCode)
    const user = await prisma.user.create({
      data: { email, name, roleId },
    })
    await prisma.account.create({
      data: {
        userId: user.id,
        // Better Auth memakai providerId "credential" untuk login email dan
        // kata sandi, dan accountId diisi id penggunanya sendiri.
        providerId: "credential",
        accountId: user.id,
        password: passwordHash,
      },
    })
    created++
  }

  return { created, password: created ? password : null }
}

// ---------------------------------------------------------------------------

/**
 * Bagian seed yang bisa dipilih: `npm run db:seed -- clauses tariffs`.
 * Tanpa argumen semua bagian dijalankan. Berguna untuk melanjutkan seed ke
 * database cloud tanpa mengulang bagian yang sudah lengkap.
 */
const SECTIONS = ["system", "cob", "occupations", "tariffs", "clauses"] as const

let seededUsers: { created: number; password: string | null } | null = null

async function main() {
  const args = process.argv.slice(2)
  const unknown = args.filter(
    (a) => !SECTIONS.includes(a as (typeof SECTIONS)[number])
  )
  if (unknown.length) {
    throw new Error(
      `Bagian seed tidak dikenal: ${unknown.join(", ")}. Pilihan: ${SECTIONS.join(", ")}`
    )
  }
  const want = (section: (typeof SECTIONS)[number]) =>
    args.length === 0 || args.includes(section)

  console.log(
    `Seed master data LCH${args.length ? ` (${args.join(", ")})` : ""}\n`
  )

  if (want("system")) {
    const lookups = await seedLookups()
    console.log(
      `  lookup_values        ${lookups.n}` +
        (lookups.retired ? ` (${lookups.retired} kode lama dinonaktifkan)` : "")
    )
    console.log(`  currencies           ${await seedCurrencies()}`)
    console.log(`  document_types       ${await seedDocumentTypes()}`)
    seededUsers = await seedUsers()
    console.log(`  users                ${seededUsers.created}`)
    console.log(`  company_profile      ${await seedCompanyProfile()}`)
  }

  if (want("cob")) {
    const cob = await seedCobAndCoverTypes()
    console.log(`  classes_of_business  ${cob.cobs}`)
    console.log(`  cover_types          ${cob.coverTypes}`)
    console.log(`  cob_rate_lines       ${await seedCobRateLines()}`)
  }

  const occ = want("occupations") ? await seedOccupations() : null
  if (occ) {
    console.log(`  occupations          ${occ.occ}`)
    console.log(`  tariff_occupation    ${occ.tariffs}`)
  }

  if (want("tariffs")) {
    console.log(`  eq_zones             ${await seedEqZones()}`)
    console.log(`  tariff_eq_property   ${await seedEqPropertyTariffs()}`)
    console.log(`  tariff_flood         ${await seedFloodTariffs()}`)
    console.log(`  tariff_motor         ${await seedMotorTariffs()}`)
    console.log(`  tariff_motor_ext     ${await seedMotorExtensions()}`)
    console.log(`  bi_scales            ${await seedBiScales()}`)
  }

  const clauses = want("clauses") ? await seedClauses() : null
  if (clauses) {
    console.log(
      `  clauses              ${clauses.n} (${clauses.created} baru, sisanya sudah ada)`
    )
  }

  if (clauses?.skipped || occ?.conflicts.length) {
    console.log("\nPerlu dicek ke LCH:")
    if (clauses?.skipped) {
      console.log(
        `  ${clauses.skipped} klausul dilewat karena wordingnya kosong di file LCH`
      )
    }
    for (const c of occ?.conflicts ?? []) {
      console.log(`  kode okupasi dipakai dua okupasi berbeda, ${c}`)
    }
  }

  console.log("\nBelum di-seed, menunggu data dari LCH:")
  console.log(
    "  insurers, adjusters, wording_forms, coa_accounts, bank_accounts"
  )
  console.log("  daftar pengguna sungguhan, menunggu Sheet Hak Akses dari LCH")

  if (seededUsers?.created) {
    console.log(
      `\nDibuat ${seededUsers.created} akun contoh, satu per role.` +
        `\nKata sandi untuk semuanya: ${seededUsers.password}` +
        "\nCatat sekarang, kata sandi ini tidak ditampilkan lagi. Ganti sebelum dipakai LCH."
    )
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
