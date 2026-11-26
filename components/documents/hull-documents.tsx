import { InfoTable, PayableTable, SectionHeading } from "@/components/documents/doc-blocks"
import { totalPremium, totalSumInsured } from "@/lib/calc"
import type { PlacingSlip } from "@/lib/data/types"
import { moneyCents, num } from "@/lib/format"
import {
  HULL_COLUMNS,
  HULL_PRINT_TEXT,
  activeHullSections,
  hullCellValue,
  hullColumnTitle,
  hullPolicyYear,
  hullSectionTotals,
  isVesselDetailLabel,
  vesselSummaryText,
  type HullColumn,
  type HullSchedule,
  type Vessel,
} from "@/lib/marine-hull"
import { printedDetailRows } from "@/lib/slip-details"
import { slipPeriodRow } from "@/components/underwriting/slip-model"
import { cn } from "@/lib/utils"

const countText = (n: number) => `${n.toLocaleString("en-US")} ${n === 1 ? "vessel" : "vessels"}`

/**
 * INTEREST, VESSEL, dan INSURED VALUE slip Marine Hull dengan jadwal kapal. Kata-katanya mengikuti
 * format: CI Patria (section (A)/(B)/(C), "AS PER SCHEDULE ATTACHED") atau signed slip MHL (section
 * 1/2/3, "100% AS PER SCHEDULE ATTACHED FOR ALL SECTIONS."). Rincian kapal di dokumen Jadwal Kapal.
 */
export function HullInterestBlock({ slip, schedule }: { slip: PlacingSlip; schedule: HullSchedule }) {
  const text = HULL_PRINT_TEXT[schedule.format]
  // Baris Detail Tambahan "Vessels" (misalnya "INCLUDING NEW AND/OR ACQUIRED VESSELS ...") ikut di
  // bawah teks kapal, seperti contoh CI.
  const vesselNote = printedDetailRows(slip.detailRows).find((r) => isVesselDetailLabel(r.label))?.value
  const vesselText = [vesselSummaryText(schedule.vessels, schedule.format) || "—", vesselNote]
    .filter(Boolean)
    .join("\n")
  return (
    <>
      <SectionHeading>INTEREST INSURED</SectionHeading>
      <InfoTable
        rows={[
          [
            text.interest,
            <div key="sections" className="flex flex-col gap-1.5">
              {activeHullSections(schedule).map((s) => (
                <div key={s.key} className="flex gap-2">
                  <span className="shrink-0 whitespace-nowrap font-semibold">SECTION {s.code}</span>
                  <span className="whitespace-pre-line">{s.wording}</span>
                </div>
              ))}
            </div>,
          ],
          [text.vessel, vesselText],
          ["Insured Value", text.insuredValue],
        ]}
      />
      <p className="mt-3 flex justify-between rounded bg-primary/8 px-3 py-2 text-[13px] font-semibold text-primary">
        <span>Total Sum Insured ({countText(schedule.vessels.length)})</span>
        <span className="tabular">{moneyCents(totalSumInsured(slip), slip.currency)}</span>
      </p>
    </>
  )
}

/** RATE "as per schedule attached", premi per section dari total jadwal, lalu diskon dan biaya. */
export function HullPremiumAttached({
  slip,
  schedule,
  internal = false,
}: {
  slip: PlacingSlip
  schedule: HullSchedule
  /** Quotation Slip Internal LCH: total setelah additional discount (MoM poin 7). */
  internal?: boolean
}) {
  const { value, premium } = hullSectionTotals(schedule.vessels)
  const currency = slip.currency || "IDR"
  return (
    <>
      <SectionHeading>RATE &amp; PREMIUM</SectionHeading>
      <InfoTable rows={[["Rate", HULL_PRINT_TEXT[schedule.format].rate]]} />
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 font-semibold">Section</th>
            <th className="w-48 py-2 text-right font-semibold">Insured Value</th>
            <th className="w-40 py-2 text-right font-semibold">Premium</th>
          </tr>
        </thead>
        <tbody>
          {activeHullSections(schedule).map((s) => (
            <tr key={s.key} className="border-b">
              <td className="py-2 pr-2">
                Section {s.code} {s.title}
              </td>
              <td className="tabular py-2 text-right whitespace-nowrap">{moneyCents(value[s.key], currency)}</td>
              <td className="tabular py-2 text-right whitespace-nowrap">{moneyCents(premium[s.key], currency)}</td>
            </tr>
          ))}
          <tr className="border-b bg-muted/60 font-bold">
            <td className="py-2 pr-2">Total Premium</td>
            <td />
            <td className="tabular py-2 text-right whitespace-nowrap">{moneyCents(totalPremium(slip), currency)}</td>
          </tr>
        </tbody>
      </table>
      <PayableTable slip={slip} internal={internal} />
    </>
  )
}

/** Kolom yang dijumlah di baris total: nilai pertanggungan dan premi (bukan deductible atau AMD). */
const TOTAL_KEYS = new Set<HullColumn["key"]>([
  "hmValue",
  "hmPremium",
  "ivValue",
  "aoiValue",
  "ivPremium",
  "warValue",
  "warPremium",
])

function cellText(column: HullColumn, value: string | number | null) {
  if (value == null || value === "") return ""
  if (typeof value === "string") return value
  if (column.kind === "rate") return `${num(value, 0, 6)}%`
  if (column.kind === "no") return String(value)
  return num(value, 2)
}

function columnTotal(vessels: readonly Vessel[], column: HullColumn) {
  if (!TOTAL_KEYS.has(column.key)) return null
  const values = vessels.map((v, i) => hullCellValue(v, column, i))
  if (!values.some((x) => typeof x === "number")) return null
  return Math.round(values.reduce<number>((s, x) => s + (typeof x === "number" ? x : 0), 0) * 100) / 100
}

/**
 * Dokumen Jadwal Kapal (lampiran slip), landscape, kolomnya persis lampiran contoh:
 * - Patria (16 kolom) di A4;
 * - MHL (40 kolom, dengan nilai tahun lalu) di A3 supaya angka tetap terbaca.
 */
export function VesselScheduleDocument({ slip, schedule }: { slip: PlacingSlip; schedule: HullSchedule }) {
  const { format, vessels } = schedule
  const mhl = format === "mhl"
  const columns = HULL_COLUMNS[format]
  const policyYear = hullPolicyYear(slip.inceptionDate)
  const insured = slip.insuredName.trim().toUpperCase() || "—"
  const [periodLabel, periodText] = slipPeriodRow(slip)
  const currency = slip.currency || "IDR"
  const unit = (column: HullColumn) =>
    column.kind === "money" || column.kind === "premium" ? ` (${currency})` : ""
  const th = "border px-1 py-1 text-center align-middle font-semibold"
  const td = "border px-1 py-0.5 align-top"
  const right = "text-right tabular whitespace-nowrap"
  return (
    <div className="flex flex-col gap-3">
      <style>{`@page { size: ${mhl ? "A3" : "A4"} landscape; margin: 0; }`}</style>
      <div>
        <h1 className="text-[15px] font-bold">{mhl ? `${insured} VESSEL SCHEDULE ${policyYear}` : insured}</h1>
        <p className="text-[11px] text-muted-foreground">
          {slip.slipNo ? `${slip.slipNo} · ` : ""}
          {periodLabel}: {periodText.split("\n")[0]}
        </p>
      </div>
      <table className={cn("w-full border-collapse leading-snug", mhl ? "text-[6.5px]" : "text-[9px]")}>
        <thead className="bg-muted/60">
          <tr>
            {columns.map((c, i) => (
              <th key={`${c.key}-${i}`} className={th}>
                {hullColumnTitle(c, policyYear)}
                {unit(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vessels.map((v, i) => (
            <tr key={v.id} className="avoid-break">
              {columns.map((c, j) => {
                const value = hullCellValue(v, c, i)
                const numeric = typeof value === "number" && c.kind !== "no"
                return (
                  <td
                    key={`${c.key}-${j}`}
                    className={cn(td, numeric ? right : c.kind === "no" ? "text-center" : undefined)}
                  >
                    {cellText(c, value)}
                  </td>
                )
              })}
            </tr>
          ))}
          <tr className="bg-muted/60 font-semibold">
            {columns.map((c, j) => {
              const total = columnTotal(vessels, c)
              return (
                <td key={`${c.key}-${j}`} className={cn(td, total != null && right)}>
                  {j === 1 ? `TOTAL ${countText(vessels.length).toUpperCase()}` : total != null ? num(total, 2) : ""}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
      <p className="text-[10px] text-muted-foreground">
        Premium = insured value × rate.{mhl ? " IV/AOI premium = (IV + AOI insured value) × IV/AOI rate." : ""}{" "}
        Total Sum Insured {moneyCents(totalSumInsured(slip), currency)} · Total Premium{" "}
        {moneyCents(totalPremium(slip), currency)}.
      </p>
    </div>
  )
}
