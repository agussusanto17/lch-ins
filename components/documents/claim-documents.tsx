import { DocumentShell } from "@/components/documents/document-shell"
import { DocTitle, HangingIndentText, InfoTable } from "@/components/documents/doc-blocks"
import { Letterhead } from "@/components/documents/letterhead"
import { toIdr } from "@/lib/calc"
import type { ClaimFilterParams } from "@/lib/claim-filter"
import { claimBackHref } from "@/lib/claim-filter"
import { dateLong, dateShort, money } from "@/lib/format"
import type {
  ClaimDocumentRecord,
  ClaimFollowupRecord,
  ClaimRecord,
} from "@/lib/server/claims"

function summarizeFilters(filters: ClaimFilterParams, today: string): string {
  const parts: string[] = []
  if (filters.status !== "all") parts.push(`Status: ${filters.status}`)
  if (filters.stage !== "all") parts.push(`Tahapan: ${filters.stage}`)
  if (filters.cob !== "all") parts.push(`COB: ${filters.cob}`)
  if (filters.search.trim()) parts.push(`Pencarian: "${filters.search.trim()}"`)
  if (parts.length === 0) parts.push("Semua status dan COB")
  parts.push(`per ${dateLong(today)}`)
  return parts.join(" · ")
}

/**
 * Full claim list report for print/PDF (wide container).
 * Shows all matching rows without screen pagination.
 */
export function ClaimListDocument({
  rows,
  filters,
  today,
}: {
  rows: ClaimRecord[]
  filters: ClaimFilterParams
  today: string
}) {
  const totalEstimatedIdr = rows.reduce(
    (sum, c) => sum + toIdr(c.estimatedLoss, c.currency),
    0
  )
  const totalClaimedIdr = rows.reduce(
    (sum, c) => sum + toIdr(c.claimedAmount, c.currency),
    0
  )
  const totalPaidIdr = rows.reduce(
    (sum, c) => sum + toIdr(c.paidAmount, c.currency),
    0
  )

  return (
    <DocumentShell wide backHref={claimBackHref(filters)}>
      <Letterhead />
      <DocTitle
        title="DAFTAR KLAIM ASURANSI"
        number={summarizeFilters(filters, today)}
        muted
      />

      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full text-[10.5px]">
          <thead>
            <tr className="border-y border-primary text-left">
              <th className="py-2 pr-1.5 font-semibold text-center w-8">No.</th>
              <th className="py-2 pr-2 font-semibold whitespace-nowrap">No. Klaim</th>
              <th className="py-2 pr-2 font-semibold">No. Polis</th>
              <th className="py-2 pr-2 font-semibold">Tertanggung</th>
              <th className="py-2 pr-2 font-semibold">COB</th>
              <th className="py-2 pr-2 font-semibold whitespace-nowrap">Tgl Kejadian</th>
              <th className="py-2 pr-2 font-semibold">Status</th>
              <th className="py-2 pr-2 font-semibold">Tahapan</th>
              <th className="py-2 pr-2 text-right font-semibold whitespace-nowrap">
                Estimasi
              </th>
              <th className="py-2 pr-2 text-right font-semibold whitespace-nowrap">
                Nilai Klaim
              </th>
              <th className="py-2 text-right font-semibold whitespace-nowrap">
                Dibayar
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="py-8 text-center text-muted-foreground"
                >
                  Tidak ada data klaim yang sesuai dengan filter.
                </td>
              </tr>
            ) : (
              rows.map((c, i) => (
                <tr
                  key={c.id}
                  className="border-b border-border/50 align-top hover:bg-muted/30"
                >
                  <td className="py-1.5 pr-1.5 text-center text-muted-foreground">
                    {i + 1}
                  </td>
                  <td className="py-1.5 pr-2 font-mono font-medium whitespace-nowrap">
                    {c.claimNo}
                  </td>
                  <td className="py-1.5 pr-2 font-mono text-[10px]">
                    {c.policyNo || "-"}
                  </td>
                  <td className="py-1.5 pr-2 font-medium">{c.insuredName}</td>
                  <td className="py-1.5 pr-2">{c.cob}</td>
                  <td className="py-1.5 pr-2 whitespace-nowrap">
                    {dateShort(c.lossDate)}
                  </td>
                  <td className="py-1.5 pr-2 font-medium">{c.status}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground text-[10px]">
                    {c.stage}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono whitespace-nowrap">
                    {money(c.estimatedLoss, c.currency)}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono whitespace-nowrap">
                    {money(c.claimedAmount, c.currency)}
                  </td>
                  <td className="py-1.5 text-right font-mono whitespace-nowrap">
                    {money(c.paidAmount, c.currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-primary font-semibold">
                <td colSpan={8} className="py-2 text-right pr-2">
                  Total Estimasi / Klaim / Dibayar (IDR):
                </td>
                <td className="py-2 pr-2 text-right font-mono whitespace-nowrap">
                  {money(totalEstimatedIdr, "IDR")}
                </td>
                <td className="py-2 pr-2 text-right font-mono whitespace-nowrap">
                  {money(totalClaimedIdr, "IDR")}
                </td>
                <td className="py-2 text-right font-mono whitespace-nowrap">
                  {money(totalPaidIdr, "IDR")}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-[10.5px] text-muted-foreground border-t pt-2">
        <span>Total {rows.length} berkas klaim tercatat</span>
        <span>PT. LCH Insurance Brokers</span>
      </div>
    </DocumentShell>
  )
}

/**
 * Detailed claim sheet for print/PDF (A4 portrait).
 * Displays policy data, incident chronology, claim values, document checklist, and follow-ups.
 */
export function ClaimDetailDocument({
  claim,
  documents,
  followups,
  backHref = "/claims",
}: {
  claim: ClaimRecord
  documents: ClaimDocumentRecord[]
  followups: ClaimFollowupRecord[]
  backHref?: string
}) {
  return (
    <DocumentShell backHref={backHref}>
      <Letterhead />
      <DocTitle
        title="LEMBAR DETAIL KLAIM"
        number={`${claim.claimNo}${claim.lossDate ? ` · Kejadian: ${dateLong(claim.lossDate)}` : ""}`}
      />

      <div className="flex flex-col gap-5 text-[11px]">
        <section>
          <h3 className="mb-1.5 font-semibold text-primary uppercase tracking-wide text-[10.5px]">
            1. Data Polis & Tertanggung
          </h3>
          <InfoTable
            rows={[
              ["Nomor Polis", claim.policyNo || "-"],
              ["Tertanggung", claim.insuredName],
              ["Penanggung (Asuransi)", claim.insurer || "-"],
              ["Class of Business (COB)", claim.cob],
            ]}
          />
        </section>

        <section>
          <h3 className="mb-1.5 font-semibold text-primary uppercase tracking-wide text-[10.5px]">
            2. Informasi Kejadian & Kerugian
          </h3>
          <InfoTable
            rows={[
              ["Tanggal Kejadian", claim.lossDate ? dateLong(claim.lossDate) : "-"],
              ["Lokasi Kejadian", claim.location || "-"],
              ["Deskripsi Kerugian", claim.lossDescription || "-"],
              ["Objek Pertanggungan", claim.assetDescription || "-"],
            ]}
          />
        </section>

        <section>
          <h3 className="mb-1.5 font-semibold text-primary uppercase tracking-wide text-[10.5px]">
            3. Rincian Nilai Klaim
          </h3>
          <InfoTable
            rows={[
              ["Mata Uang", claim.currency],
              ["Estimasi Kerugian", money(claim.estimatedLoss, claim.currency)],
              [
                "Jumlah Klaim Diajukan",
                money(claim.claimedAmount, claim.currency),
              ],
              ["Jumlah Telah Dibayar", money(claim.paidAmount, claim.currency)],
            ]}
          />
        </section>

        <section>
          <h3 className="mb-1.5 font-semibold text-primary uppercase tracking-wide text-[10.5px]">
            4. Status & Kronologi Penanganan
          </h3>
          <InfoTable
            rows={[
              ["Status Klaim", claim.status],
              ["Tahapan Saat Ini", claim.stage],
              ["Adjuster", claim.adjuster || "Tanpa Adjuster"],
              [
                "Tanggal Dilaporkan",
                claim.reportedDate ? dateLong(claim.reportedDate) : "Belum dicatat",
              ],
              [
                "Dokumen Lengkap",
                claim.documentCompleteDate
                  ? dateLong(claim.documentCompleteDate)
                  : "Belum lengkap",
              ],
              [
                "SPK / SPGR Terbit",
                claim.spkDate ? dateLong(claim.spkDate) : "Belum terbit",
              ],
            ]}
          />
        </section>

        {claim.notes && (
          <section>
            <h3 className="mb-1.5 font-semibold text-primary uppercase tracking-wide text-[10.5px]">
              5. Catatan Tambahan
            </h3>
            <div className="rounded-md border p-2.5 text-muted-foreground">
              <HangingIndentText text={claim.notes} className="text-justify" />
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-1.5 font-semibold text-primary uppercase tracking-wide text-[10.5px]">
            {claim.notes ? "6." : "5."} Kelengkapan Berkas Dokumen
          </h3>
          <table className="w-full text-[10.5px]">
            <thead>
              <tr className="border-y border-primary text-left">
                <th className="py-1.5 pr-2 font-semibold w-8 text-center">No.</th>
                <th className="py-1.5 pr-2 font-semibold">Nama Dokumen</th>
                <th className="py-1.5 pr-2 font-semibold text-center w-16">Wajib</th>
                <th className="py-1.5 pr-2 font-semibold text-center w-24">Status</th>
                <th className="py-1.5 pr-2 font-semibold whitespace-nowrap">Tgl Diterima</th>
                <th className="py-1.5 font-semibold">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-3 text-center text-muted-foreground">
                    Belum ada berkas dokumen terdaftar untuk klaim ini.
                  </td>
                </tr>
              ) : (
                documents.map((d, i) => (
                  <tr key={d.id} className="border-b border-border/50 align-top">
                    <td className="py-1.5 pr-2 text-center text-muted-foreground">
                      {i + 1}
                    </td>
                    <td className="py-1.5 pr-2 font-medium">
                      {d.documentTypeName}
                    </td>
                    <td className="py-1.5 pr-2 text-center">
                      {d.isRequired ? (
                        <span className="text-destructive font-medium">Ya</span>
                      ) : (
                        <span className="text-muted-foreground">Tidak</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2 text-center">
                      {d.isReceived ? (
                        <span className="text-emerald-600 font-medium">Diterima</span>
                      ) : (
                        <span className="text-amber-600">Belum</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">
                      {d.receivedDate ? dateShort(d.receivedDate) : "-"}
                    </td>
                    <td className="py-1.5 text-muted-foreground">{d.notes || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section>
          <h3 className="mb-1.5 font-semibold text-primary uppercase tracking-wide text-[10.5px]">
            {claim.notes ? "7." : "6."} Histori Tindak Lanjut (Follow-up)
          </h3>
          <table className="w-full text-[10.5px]">
            <thead>
              <tr className="border-y border-primary text-left">
                <th className="py-1.5 pr-2 font-semibold w-8 text-center">No.</th>
                <th className="py-1.5 pr-2 font-semibold whitespace-nowrap w-28">Tanggal</th>
                <th className="py-1.5 pr-2 font-semibold">Catatan</th>
                <th className="py-1.5 font-semibold whitespace-nowrap w-36">Dicatat Oleh</th>
              </tr>
            </thead>
            <tbody>
              {followups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-3 text-center text-muted-foreground">
                    Belum ada catatan tindak lanjut.
                  </td>
                </tr>
              ) : (
                followups.map((f, i) => (
                  <tr key={f.id} className="border-b border-border/50 align-top">
                    <td className="py-1.5 pr-2 text-center text-muted-foreground">
                      {i + 1}
                    </td>
                    <td className="py-1.5 pr-2 whitespace-nowrap font-medium">
                      {dateShort(f.followupDate)}
                    </td>
                    <td className="py-1.5 pr-2 text-justify">
                      <HangingIndentText text={f.note} />
                    </td>
                    <td className="py-1.5 text-muted-foreground">{f.createdByName || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </DocumentShell>
  )
}
