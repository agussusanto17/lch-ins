import type { Client } from "./types"

/**
 * Kelengkapan KYC mengikuti form LCH. Daftar field wajib final masih menunggu
 * konfirmasi LCH (Checklist minggu 2), jadi kekurangan ditampilkan sebagai
 * peringatan, bukan menolak penyimpanan.
 */
export function kycMissing(client: Client) {
  const missing: string[] = []
  if (client.clientType === "Korporasi") {
    if (!client.npwp) missing.push("NPWP")
    if (!client.contactPerson) missing.push("Nama PIC")
    if (!client.contactPersonIdNumber) missing.push("KTP PIC")
  } else {
    if (!client.idNumber) missing.push("Nomor identitas")
    if (!client.birthPlace || !client.birthDate)
      missing.push("Tempat & tanggal lahir")
    if (!client.incomeSource) missing.push("Sumber penghasilan")
  }
  if (!client.insurancePurpose) missing.push("Tujuan asuransi")
  if (!client.addresses.length) missing.push("Alamat")
  const docTypes = new Set(client.documents.map((d) => d.type))
  if (client.clientType === "Korporasi" && !docTypes.has("Copy NPWP")) {
    missing.push("Berkas NPWP")
  }
  if (
    client.clientType === "Perorangan" &&
    !docTypes.has("Copy KTP, SIM, atau paspor")
  ) {
    missing.push("Berkas identitas")
  }
  return missing
}

/** Alamat korespondensi klien, jatuh ke alamat utama lalu alamat pertama. */
export function correspondenceAddress(client: Pick<Client, "addresses">) {
  return (
    client.addresses.find((a) =>
      a.label.toLowerCase().includes("korespondensi")
    ) ??
    client.addresses.find((a) => a.isPrimary) ??
    client.addresses[0] ??
    null
  )
}
