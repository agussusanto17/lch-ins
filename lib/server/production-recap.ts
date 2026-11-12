import "server-only"

import { POLICY_TYPE_CODES, systemValueFromRow } from "@/lib/form-options"
import { prisma } from "@/lib/prisma"
import type { RecapPolicy } from "@/lib/production-recap"

const isoDate = (d: Date) => d.toISOString().slice(0, 10)
/** Tanggal WIB dari timestamp, untuk tanggal record dicatat. */
const wibDate = (d: Date) => new Date(d.getTime() + 7 * 3600_000).toISOString().slice(0, 10)

/**
 * Polis yang mulai berlaku di periode, sama seperti Report Operational, dengan
 * data yang dibutuhkan rekap produksi format LCH (lihat `lib/production-recap.ts`).
 */
export async function listProductionRecap(start: string, end: string): Promise<RecapPolicy[]> {
  const rows = await prisma.policy.findMany({
    where: { inceptionDate: { gte: new Date(start), lte: new Date(end) } },
    include: {
      client: {
        select: {
          name: true,
          clientType: { select: { name: true } },
          insurerCodes: { select: { code: true, insurer: { select: { name: true } } } },
        },
      },
      cob: { select: { code: true, name: true } },
      coverType: { select: { code: true, name: true } },
      policyType: { select: { code: true, name: true } },
      parentPolicy: { select: { policyNo: true, inceptionDate: true, expiryDate: true } },
      placingSlip: { select: { slipNo: true, source: { select: { code: true, name: true } } } },
      cobOjkClass: { select: { name: true } },
      placementLocation: { select: { name: true } },
      insurers: {
        select: { sharePct: true, additionalFeePct: true, insurer: { select: { name: true } } },
        orderBy: { sharePct: "desc" },
      },
    },
    orderBy: [{ inceptionDate: "asc" }, { policyNo: "asc" }],
  })

  return rows.map((row) => {
    const parent = row.parentPolicy
    return {
      policyNo: row.policyNo,
      parentPolicyNo: parent?.policyNo ?? null,
      slipNo: row.placingSlip?.slipNo ?? null,
      type: systemValueFromRow(POLICY_TYPE_CODES, row.policyType, "Baru"),
      endorsementSeq: row.endorsementSeq,
      insuredName: row.insuredName,
      clientName: row.client?.name ?? null,
      clientType: row.client?.clientType.name ?? null,
      clientCodes: Object.fromEntries(
        (row.client?.insurerCodes ?? []).map((c) => [c.insurer.name, c.code])
      ),
      sourceCode: row.placingSlip?.source?.code ?? null,
      sourceName: row.placingSlip?.source?.name ?? null,
      cobCode: row.cob.code,
      cobName: row.cob.name,
      coverCode: row.coverType?.code ?? null,
      coverName: row.coverType?.name ?? row.typeOfCover ?? null,
      // Endorsement dan pembatalan ditulis dengan periode polis induknya.
      periodStart: isoDate(parent?.inceptionDate ?? row.inceptionDate),
      periodEnd: isoDate(parent?.expiryDate ?? row.expiryDate),
      productionDate: isoDate(row.inceptionDate),
      recordedDate: wibDate(row.createdAt),
      paidDate: row.premiumPaidDate ? isoDate(row.premiumPaidDate) : null,
      currency: row.currencyCode,
      premium: Number(row.premium),
      brokeragePct: Number(row.brokeragePct),
      remarks: row.remarks,
      groupingInsured: row.groupingInsured,
      cobOjkClass: row.cobOjkClass?.name ?? null,
      placementLocation: row.placementLocation?.name ?? null,
      insurers: row.insurers.map((i) => ({
        insurer: i.insurer.name,
        share: Number(i.sharePct),
        additionalFeePct: Number(i.additionalFeePct),
      })),
    }
  })
}
