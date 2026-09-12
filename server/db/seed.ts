import { db } from "./index"
import {
  classesOfBusiness,
  companyProfile,
  currencies,
  documentTypes,
  insurers,
  lookupValues,
  occupations,
  users,
} from "./schema"

async function main() {
  console.log("🌱 Memulai seeding master data awal LCH...")

  // 1. Profil Perusahaan PT. LCH Insurance Brokers
  console.log("-> Seeding company profile...")
  await db
    .insert(companyProfile)
    .values({
      name: "PT. LCH Insurance Brokers",
      address:
        "Springhill Office Tower 11th Floor Unit H, Jl. Benyamin Suaeb Block D6, Kemayoran, Jakarta Utara 14410",
      phone: "+62 21 2605 1900",
      email: "info@lch-brokers.com",
      skojkNo: "KEP-46/NB.1/2016",
      apparindoNo: "237-2016",
      logoPath: "/logo-lch.png",
    })
    .onConflictDoNothing()

  // 2. Mata Uang
  console.log("-> Seeding currencies...")
  const currencyList = [
    { code: "IDR", name: "Indonesian Rupiah" },
    { code: "USD", name: "US Dollar" },
    { code: "SGD", name: "Singapore Dollar" },
    { code: "EUR", name: "Euro" },
  ]
  for (const c of currencyList) {
    await db.insert(currencies).values(c).onConflictDoNothing()
  }

  // 3. Lookup Values (Pilihan Dropdown)
  console.log("-> Seeding lookup values...")
  const lookups = [
    // Role
    { lookupType: "role", code: "admin", name: "Admin", isSystem: true, sortOrder: 1 },
    { lookupType: "role", code: "marketing", name: "Marketing", isSystem: true, sortOrder: 2 },
    { lookupType: "role", code: "underwriting", name: "Placement/Teknik", isSystem: true, sortOrder: 3 },
    { lookupType: "role", code: "claims", name: "Klaim", isSystem: true, sortOrder: 4 },
    { lookupType: "role", code: "finance", name: "Finance", isSystem: true, sortOrder: 5 },

    // Reset Period
    { lookupType: "reset_period", code: "monthly", name: "Bulanan", isSystem: true, sortOrder: 1 },
    { lookupType: "reset_period", code: "yearly", name: "Tahunan", isSystem: true, sortOrder: 2 },
    { lookupType: "reset_period", code: "continuous", name: "Berlanjut", isSystem: true, sortOrder: 3 },

    // Rate Mode
    { lookupType: "rate_mode", code: "permil", name: "Per mil (‰)", isSystem: true, sortOrder: 1 },
    { lookupType: "rate_mode", code: "percent", name: "Persen (%)", isSystem: true, sortOrder: 2 },

    // Form Variant
    { lookupType: "form_variant", code: "property", name: "Property", isSystem: true, sortOrder: 1 },
    { lookupType: "form_variant", code: "motor", name: "Motor Vehicle", isSystem: true, sortOrder: 2 },
    { lookupType: "form_variant", code: "standard", name: "Standard", isSystem: true, sortOrder: 3 },

    // Rate Line Kind
    { lookupType: "rate_line_kind", code: "rate", name: "Rate Premi", isSystem: true, sortOrder: 1 },
    { lookupType: "rate_line_kind", code: "tpl", name: "Perluasan TPL", isSystem: true, sortOrder: 2 },
    { lookupType: "rate_line_kind", code: "pa", name: "Perluasan PA", isSystem: true, sortOrder: 3 },

    // Construction Class
    { lookupType: "construction_class", code: "K1", name: "Kelas 1 (Konstruksi Beton)", isSystem: true, sortOrder: 1 },
    { lookupType: "construction_class", code: "K2", name: "Kelas 2 (Baja)", isSystem: true, sortOrder: 2 },
    { lookupType: "construction_class", code: "K3", name: "Kelas 3 (Kayu/Lainnya)", isSystem: true, sortOrder: 3 },

    // Client Type
    { lookupType: "client_type", code: "corporate", name: "Korporasi", isSystem: true, sortOrder: 1 },
    { lookupType: "client_type", code: "individual", name: "Perorangan", isSystem: true, sortOrder: 2 },

    // Client Status
    { lookupType: "client_status", code: "active", name: "Active", isSystem: false, sortOrder: 1 },
    { lookupType: "client_status", code: "prospect", name: "Prospect", isSystem: false, sortOrder: 2 },
    { lookupType: "client_status", code: "inactive", name: "Inactive", isSystem: false, sortOrder: 3 },

    // Policy Type
    { lookupType: "policy_type", code: "baru", name: "Baru", isSystem: true, sortOrder: 1 },
    { lookupType: "policy_type", code: "renewal", name: "Renewal", isSystem: true, sortOrder: 2 },
    { lookupType: "policy_type", code: "endorsement", name: "Endorsement", isSystem: true, sortOrder: 3 },
    { lookupType: "policy_type", code: "cancellation", name: "Cancellation", isSystem: true, sortOrder: 4 },

    // Claim Status
    { lookupType: "claim_status", code: "open", name: "Open", isSystem: true, sortOrder: 1 },
    { lookupType: "claim_status", code: "doc_pending", name: "Tunggu Dokumen", isSystem: true, sortOrder: 2 },
    { lookupType: "claim_status", code: "doc_complete", name: "Dokumen Lengkap", isSystem: true, sortOrder: 3 },
    { lookupType: "claim_status", code: "adjuster_process", name: "Proses Adjuster", isSystem: true, sortOrder: 4 },
    { lookupType: "claim_status", code: "spk", name: "SPK / SPGR", isSystem: true, sortOrder: 5 },
    { lookupType: "claim_status", code: "approved", name: "Approved / Settled", isSystem: true, sortOrder: 6 },
    { lookupType: "claim_status", code: "paid", name: "Paid", isSystem: true, sortOrder: 7 },
    { lookupType: "claim_status", code: "rejected", name: "Rejected", isSystem: true, sortOrder: 8 },
    { lookupType: "claim_status", code: "close", name: "Close", isSystem: true, sortOrder: 9 },

    // Payment Model
    { lookupType: "payment_model", code: "via_lch", name: "Via Rekening LCH", isSystem: true, sortOrder: 1 },
    { lookupType: "payment_model", code: "direct_insurer", name: "Langsung ke Asuransi", isSystem: true, sortOrder: 2 },

    // Payment Type
    { lookupType: "payment_type", code: "premium_in", name: "Terima Premi dari Klien", isSystem: true, sortOrder: 1 },
    { lookupType: "payment_type", code: "premium_out", name: "Setor Premi ke Asuransi", isSystem: true, sortOrder: 2 },
    { lookupType: "payment_type", code: "brokerage_in", name: "Terima Brokerage Fee", isSystem: true, sortOrder: 3 },
    { lookupType: "payment_type", code: "claim_in", name: "Terima Uang Klaim", isSystem: true, sortOrder: 4 },
    { lookupType: "payment_type", code: "claim_out", name: "Bayar Klaim ke Klien", isSystem: true, sortOrder: 5 },

    // Security Role
    { lookupType: "security_role", code: "leader", name: "As Leader", isSystem: true, sortOrder: 1 },
    { lookupType: "security_role", code: "member", name: "As Member", isSystem: true, sortOrder: 2 },
  ]

  for (const l of lookups) {
    await db
      .insert(lookupValues)
      .values(l)
      .onConflictDoNothing()
  }

  // Ambil ID reset_period bulanan untuk Document Types
  const allLookups = await db.select().from(lookupValues)
  const monthlyReset = allLookups.find(
    (l) => l.lookupType === "reset_period" && l.code === "monthly"
  )
  const adminRole = allLookups.find(
    (l) => l.lookupType === "role" && l.code === "admin"
  )
  const permilMode = allLookups.find(
    (l) => l.lookupType === "rate_mode" && l.code === "permil"
  )
  const percentMode = allLookups.find(
    (l) => l.lookupType === "rate_mode" && l.code === "percent"
  )
  const propVariant = allLookups.find(
    (l) => l.lookupType === "form_variant" && l.code === "property"
  )
  const motorVariant = allLookups.find(
    (l) => l.lookupType === "form_variant" && l.code === "motor"
  )
  const stdVariant = allLookups.find(
    (l) => l.lookupType === "form_variant" && l.code === "standard"
  )

  if (monthlyReset) {
    // 4. Document Types
    console.log("-> Seeding document types...")
    const docs = [
      { code: "PS", name: "Placing Slip", numberPattern: "{seq:3}/LCH-PLCMT/{COVER}/{MMROMAN}/{YYYY}", resetPeriodId: monthlyReset.id },
      { code: "QS", name: "Quotation Slip", numberPattern: "{seq:3}/LCH-QUOT/{COVER}/{MMROMAN}/{YYYY}", resetPeriodId: monthlyReset.id },
      { code: "CVN", name: "Cover Note", numberPattern: "{seq:3}/LCH-CVN/{COVER}/{MMROMAN}/{YYYY}", resetPeriodId: monthlyReset.id },
      { code: "CI", name: "Closing Instruction", numberPattern: "{seq:3}/LCH-PLCMT/CI/{MMROMAN}/{YYYY}", resetPeriodId: monthlyReset.id },
      { code: "DN", name: "Debit Note", numberPattern: "{seq:4}/DNLCH/{MM}/{YYYY}", resetPeriodId: monthlyReset.id },
      { code: "CN", name: "Credit Note", numberPattern: "{seq:4}/CNLCH/{MM}/{YYYY}", resetPeriodId: monthlyReset.id },
      { code: "CLM", name: "Claim Report", numberPattern: "{seq:4}/CLM/{MM}/{YYYY}", resetPeriodId: monthlyReset.id },
      { code: "JV", name: "Journal Voucher", numberPattern: "JV/{YYYY}{MM}/{seq:4}", resetPeriodId: monthlyReset.id },
    ]
    for (const d of docs) {
      await db.insert(documentTypes).values(d).onConflictDoNothing()
    }
  }

  // 5. Classes of Business (COB)
  if (permilMode && percentMode && propVariant && motorVariant && stdVariant) {
    console.log("-> Seeding classes of business...")
    const cobs = [
      { code: "01", name: "Property", rateModeId: permilMode.id, formVariantId: propVariant.id },
      { code: "02", name: "Motor Vehicle", rateModeId: percentMode.id, formVariantId: motorVariant.id },
      { code: "03", name: "Marine Cargo", rateModeId: permilMode.id, formVariantId: stdVariant.id },
      { code: "04", name: "Engineering", rateModeId: permilMode.id, formVariantId: stdVariant.id },
      { code: "05", name: "Liability", rateModeId: permilMode.id, formVariantId: stdVariant.id },
      { code: "06", name: "Personal Accident", rateModeId: permilMode.id, formVariantId: stdVariant.id },
      { code: "07", name: "Surety Bond", rateModeId: permilMode.id, formVariantId: stdVariant.id },
      { code: "08", name: "Terrorism", rateModeId: permilMode.id, formVariantId: stdVariant.id },
    ]
    for (const c of cobs) {
      await db.insert(classesOfBusiness).values(c).onConflictDoNothing()
    }
  }

  // 6. Insurers Rekanan
  console.log("-> Seeding insurers...")
  const insurerList = [
    { name: "PT Asuransi Multi Artha Guna Tbk", contactPerson: "Underwriting Dept" },
    { name: "PT Asuransi Sinar Mas", contactPerson: "Broker Relations" },
    { name: "PT Asuransi Central Asia", contactPerson: "Corporate Underwriting" },
    { name: "PT Asuransi Astra Buana", contactPerson: "Commercial Team" },
    { name: "PT Asuransi Tugu Pratama Indonesia Tbk", contactPerson: "Oil, Gas & Energy Dept" },
    { name: "PT Asuransi Wahana Tata", contactPerson: "Underwriting Head" },
    { name: "PT Asuransi Bina Dana Arta Tbk", contactPerson: "Technical Team" },
    { name: "PT Asuransi Jasa Indonesia", contactPerson: "BUMN & Corporate" },
  ]
  for (const ins of insurerList) {
    await db.insert(insurers).values(ins).onConflictDoNothing()
  }

  // 7. Okupasi OJK Utama
  console.log("-> Seeding occupations...")
  const occList = [
    { code: "2976", name: "Shopping Mall / Pusat Perbelanjaan Grade A" },
    { code: "2911", name: "Apartemen / Kantor / Parkir (≤6 lantai)" },
    { code: "2912", name: "Apartemen / Kantor / Parkir (>6 lantai)" },
    { code: "2921", name: "Hotel Bintang 4 & 5" },
    { code: "2931", name: "Rumah Sakit Umum Grade A & B" },
    { code: "2941", name: "Gudang Umum (Bukan Bahan Berbahaya)" },
    { code: "2111", name: "Pabrik Makanan dan Minuman" },
    { code: "2141", name: "Pabrik Tekstil dan Garmen" },
    { code: "2211", name: "Pabrik Kimia Dasar" },
  ]
  for (const o of occList) {
    await db.insert(occupations).values(o).onConflictDoNothing()
  }

  // 8. Default Admin User
  if (adminRole) {
    console.log("-> Seeding initial admin user...")
    await db
      .insert(users)
      .values({
        name: "Administrator LCH",
        email: "admin@lch-brokers.com",
        passwordHash: "$2a$12$e6m2kUqC5qf.d0z0bE9I5eYkU7k9hQYvW6e1wK7q7bY4uN7q5wY6a", // Default dev hash
        roleId: adminRole.id,
      })
      .onConflictDoNothing()
  }

  console.log("✅ Seeding database lch_db selesai dengan sukses!")
  process.exit(0)
}

main().catch((err) => {
  console.error("❌ Error saat seeding:", err)
  process.exit(1)
})
