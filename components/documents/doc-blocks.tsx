import {
  coverLabel,
  deductibleRows,
  slipOccupationText,
  usesSectionSumInsured,
} from "@/components/underwriting/slip-model"
import {
  BI_RATE_LABELS,
  biRateBasis,
  brokerageAmount,
  calculateParEqvet,
  discountAmount,
  ratePercentText,
  sumItems,
  totalPayable,
  totalPremium,
  totalSumInsured,
  type ParEqvetGroup,
  type ParEqvetLine,
} from "@/lib/calc"

export { isParEqvetSlip } from "@/lib/calc"
import { sanitizeHtml } from "@/lib/sanitize"
import {
  clauseTitleCase,
  constructionClassLabel,
  parseVehicleDescription,
  resolveSlipClauses,
  type ClauseOverride,
  type PlacingSlip,
  type ResolvedClause,
  type SecurityPanelRow,
} from "@/lib/data"
import { dateEn, money, moneyCents, num } from "@/lib/format"
import { cn } from "@/lib/utils"

export function DocTitle({
  title,
  number,
  muted,
}: {
  title: string
  number: string
  muted?: boolean
}) {
  return (
    <div className="mb-8 text-center">
      <h1 className="text-[17px] font-bold tracking-[0.18em]">{title}</h1>
      <p
        className={cn(
          "mt-1 text-sm font-semibold",
          muted ? "font-normal text-muted-foreground" : "text-primary"
        )}
      >
        {number}
      </p>
    </div>
  )
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="avoid-break mt-8 mb-3 border-b border-primary pb-1.5 text-[13px] font-bold tracking-wide text-primary first:mt-0">
      {children}
    </h2>
  )
}

export function DetailTable({ slip }: { slip: PlacingSlip }) {
  const period = slip.periodTba
    ? "To Be Advised"
    : `${dateEn(slip.inceptionDate)} to ${dateEn(slip.expiryDate)}`

  const rows: [string, string][] = [
    ["Type of Cover", slip.typeOfCover || "—"],
  ]
  if (slip.wordingForms.filter(Boolean).length)
    rows.push(["Wording Form", slip.wordingForms.filter(Boolean).join("; ")])
  rows.push(
    ["Insured Name", slip.insuredName.toUpperCase() || "—"],
    ["Correspondence Address", slip.correspondenceAddress || "—"],
    ["Period of Insurance", period]
  )
  if (slip.occupation) rows.push(["Occupation", slipOccupationText(slip)])
  if (slip.riskLocation) rows.push(["Risk Location", slip.riskLocation])
  if (slip.cob === "Property" && slip.constructionClass)
    rows.push([
      "Construction Class",
      constructionClassLabel(slip.constructionClass),
    ])
  if (slip.cob === "Property" && slip.indemnityPeriod)
    rows.push(["Indemnity Period", slip.indemnityPeriod])

  return <InfoTable rows={rows} />
}

export function InfoTable({
  rows,
  dense = false,
}: {
  rows: [string, string][]
  /** Baris rapat untuk surat yang harus muat satu halaman. */
  dense?: boolean
}) {
  const cell = dense ? "py-0.5" : "py-1.5"
  return (
    <table className="mb-6 w-full text-[13px]">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="align-top">
            <td className={cn("w-[190px] text-muted-foreground", cell)}>{k}</td>
            <td className={cn("w-3", cell)}>:</td>
            <td className={cn("whitespace-pre-line", cell)}>{v || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function InterestBlock({ slip }: { slip: PlacingSlip }) {
  const isProperty = slip.cob === "Property"

  return (
    <>
      <SectionHeading>INTEREST INSURED</SectionHeading>
      {isProperty ? (
        <div className="flex flex-col gap-4 text-[13px]">
          {slip.interestSection1 ? (
            <div>
              <p className="font-semibold">Section 1 — Material Damage</p>
              <p className="mt-1 leading-relaxed whitespace-pre-line text-muted-foreground">
                {slip.interestSection1}
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {slip.sumInsuredSection1.map((i) => (
                  <li
                    key={i.id}
                    className="flex justify-between gap-6 border-b border-dashed py-1"
                  >
                    <span>{i.description}</span>
                    <span className="tabular whitespace-nowrap">
                      {money(i.amount, slip.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 flex justify-between text-xs font-medium">
                <span>Subtotal Section 1</span>
                <span className="tabular">
                  {money(sumItems(slip.sumInsuredSection1), slip.currency)}
                </span>
              </p>
            </div>
          ) : null}

          {slip.interestSection2 ? (
            <div>
              <p className="font-semibold">Section 2 — Business Interruption</p>
              <p className="mt-1 leading-relaxed whitespace-pre-line text-muted-foreground">
                {slip.interestSection2}
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {slip.sumInsuredSection2.map((i) => (
                  <li
                    key={i.id}
                    className="flex justify-between gap-6 border-b border-dashed py-1"
                  >
                    <span>{i.description}</span>
                    <span className="tabular whitespace-nowrap">
                      {money(i.amount, slip.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 flex justify-between text-xs font-medium">
                <span>Subtotal Section 2</span>
                <span className="tabular">
                  {money(sumItems(slip.sumInsuredSection2), slip.currency)}
                </span>
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <ul className="flex flex-col gap-2 text-[13px]">
          {slip.interestItems.map((i) => {
            const isVehicle = slip.cob === "Motor Vehicle" || Boolean(i.vehicleBrandId || i.vehicleBrandName)
            if (isVehicle) {
              const parsed = !i.licensePlate && !i.chassisNumber && i.description
                ? parseVehicleDescription(i.description)
                : {}
              const brand = i.vehicleBrandName || ""
              const type = i.vehicleTypeName || ""
              const model = i.vehicleModel ?? parsed.vehicleModel ?? ""
              const year = i.year ?? parsed.year ?? ""
              const plate = i.licensePlate ?? parsed.licensePlate ?? ""
              const chassis = i.chassisNumber ?? parsed.chassisNumber ?? ""
              const engine = i.engineNumber ?? parsed.engineNumber ?? ""
              const color = i.color ?? parsed.color ?? ""

              const titleParts = [brand, type, model].filter(Boolean).join(" ")
              const fullTitle = titleParts || i.description || "Kendaraan Bermotor"

              return (
                <li
                  key={i.id}
                  className="flex justify-between items-start gap-6 border-b border-dashed py-1.5"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="font-semibold text-foreground">
                      {fullTitle}
                      {year ? ` (${year})` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                      {plate ? (
                        <span>
                          Plat: <strong className="font-medium text-foreground">{plate}</strong>
                        </span>
                      ) : null}
                      {chassis ? (
                        <span>
                          No. Rangka: <span className="font-mono text-foreground">{chassis}</span>
                        </span>
                      ) : null}
                      {engine ? (
                        <span>
                          No. Mesin: <span className="font-mono text-foreground">{engine}</span>
                        </span>
                      ) : null}
                      {color ? (
                        <span>
                          Warna: <span className="text-foreground">{color}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <span className="tabular whitespace-nowrap font-medium text-foreground">
                    {money(i.amount, slip.currency)}
                  </span>
                </li>
              )
            }

            const vehicleLabel = [i.vehicleBrandName, i.vehicleTypeName]
              .filter(Boolean)
              .join(" ")
            return (
              <li
                key={i.id}
                className="flex justify-between gap-6 border-b border-dashed py-1"
              >
                <span className="leading-relaxed">
                  {vehicleLabel ? (
                    <span className="mr-1.5 font-semibold text-foreground">
                      {vehicleLabel}
                      {i.description ? " —" : ""}
                    </span>
                  ) : null}
                  {i.description}
                </span>
                <span className="tabular whitespace-nowrap">
                  {money(i.amount, slip.currency)}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-3 flex justify-between rounded bg-primary/8 px-3 py-2 text-[13px] font-semibold text-primary">
        <span>Total Sum Insured</span>
        <span className="tabular">
          {money(totalSumInsured(slip), slip.currency)}
        </span>
      </p>
    </>
  )
}

export function DeductibleBlock({ slip }: { slip: PlacingSlip }) {
  // Deductible texts already name their peril, so the cover column is not
  // printed. Covers sharing the same text print it once, each as a "-" bullet
  // like the rate list, with wrapped lines aligned to the text.
  const deductibles = [
    ...new Set(
      deductibleRows(slip)
        .flatMap((r) => r.deductibles)
        .map((text) => text.trim())
        .filter(Boolean)
    ),
  ]
  if (!deductibles.length && !slip.specialConditions) return null

  return (
    <>
      <SectionHeading>DEDUCTIBLE &amp; CONDITIONS</SectionHeading>
      <div className="flex flex-col gap-3 text-[13px]">
        {deductibles.length ? (
          <ul className="flex flex-col gap-1.5 text-[12.5px]">
            {deductibles.map((text) => (
              <li key={text} className="flex gap-2">
                <span aria-hidden>-</span>
                <span className="whitespace-pre-line">{text}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {slip.specialConditions ? (
          <div>
            <p className="font-semibold">Special Conditions</p>
            <p className="mt-1 leading-relaxed whitespace-pre-line text-muted-foreground">
              {slip.specialConditions}
            </p>
          </div>
        ) : null}
      </div>
    </>
  )
}

/**
 * Clause slip dicetak dari salinannya di slip_clauses. Master clause sudah di
 * database dan id-nya tidak ada di data contoh, jadi tanpa salinan ini clause
 * yang tidak diedit di slip hilang dari dokumen.
 */
function resolveClauses(
  clauseIds: string[],
  clauseOverrides: Record<string, ClauseOverride> | undefined,
  clauseCopies: Record<string, ClauseOverride> | undefined
) {
  const copies = Object.entries(clauseCopies ?? {}).map(([id, c]) => ({
    id,
    ...c,
  }))
  return resolveSlipClauses({ clauseIds, clauseOverrides }, copies)
}

interface ClauseGroup {
  heading: string | null
  clauses: ResolvedClause[]
  /** Nomor klausula pertama; penomoran menyambung lintas section. */
  start: number
}

/**
 * Slip Property mencetak klausula per section dengan judul yang sama seperti
 * INTEREST INSURED; COB lain satu daftar tanpa judul. Kelompok kosong dilewati.
 */
function clauseGroups(slip: PlacingSlip, firstNumber: number): ClauseGroup[] {
  const section1 = resolveClauses(
    slip.clauseIds,
    slip.clauseOverrides,
    slip.clauseCopies
  )
  const groups = usesSectionSumInsured(slip.cob)
    ? [
        { heading: "Section 1 — Material Damage", clauses: section1 },
        {
          heading: "Section 2 — Business Interruption",
          clauses: resolveClauses(
            slip.clauseIdsSection2 ?? [],
            slip.clauseOverridesSection2,
            slip.clauseCopiesSection2
          ),
        },
      ]
    : [{ heading: null, clauses: section1 }]

  let start = firstNumber
  return groups
    .filter((g) => g.clauses.length > 0)
    .map((g) => {
      const group = { ...g, start }
      start += g.clauses.length
      return group
    })
}

/**
 * Judul section ikut di dalam butir klausula pertamanya, jadi tidak
 * tertinggal sendirian di bawah halaman.
 */
function ClauseGroupHeading({
  children,
  first,
}: {
  children: string
  first: boolean
}) {
  return (
    <p className={cn("mb-1.5 text-[13px] font-semibold", !first && "mt-2")}>
      {children}
    </p>
  )
}

/** inline = wording penuh langsung di daftar (Quotation/Cover Note/CI). */
export function ClausesBlock({
  slip,
  inline,
}: {
  slip: PlacingSlip
  inline?: boolean
}) {
  const wordingForms = slip.wordingForms.filter(Boolean)
  const groups = clauseGroups(slip, wordingForms.length + 1)
  if (!groups.length) return null

  return (
    <>
      <SectionHeading>CLAUSES</SectionHeading>
      <ol className="flex flex-col gap-2 text-[12px]">
        {wordingForms.map((w, i) => (
          <li key={w} className="avoid-break">
            <p className={inline ? "font-semibold" : undefined}>
              {i + 1}. {w}
            </p>
            <p className="ml-4 text-muted-foreground">As Attached</p>
          </li>
        ))}
        {groups.map((g, gi) =>
          g.clauses.map((c, i) => (
            <li key={`${gi}-${c.id}`} className="avoid-break">
              {g.heading && i === 0 ? (
                <ClauseGroupHeading first={gi === 0 && !wordingForms.length}>
                  {g.heading}
                </ClauseGroupHeading>
              ) : null}
              <p className={inline ? "font-semibold" : undefined}>
                {g.start + i}. {inline ? c.title : clauseTitleCase(c.title)}
              </p>
              {inline ? (
                <div
                  className="rte-prose mt-0.5 ml-4 text-[12px] text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.wording) }}
                />
              ) : null}
            </li>
          ))
        )}
      </ol>
    </>
  )
}

/** Wording lengkap di akhir dokumen — dipakai Placing Slip. */
export function ClauseWordingAppendix({ slip }: { slip: PlacingSlip }) {
  const groups = clauseGroups(slip, 1)
  if (!groups.length) return null

  return (
    <section className="print-break">
      <SectionHeading>CLAUSE WORDING</SectionHeading>
      <div className="flex flex-col gap-3 text-[12px]">
        {groups.map((g, gi) =>
          g.clauses.map((c, i) => (
            <div key={`${gi}-${c.id}`} className="avoid-break">
              {g.heading && i === 0 ? (
                <ClauseGroupHeading first={gi === 0}>
                  {g.heading}
                </ClauseGroupHeading>
              ) : null}
              <p className="font-semibold">
                {g.start + i}. {c.title}
              </p>
              <div
                className="rte-prose mt-0.5 text-[12px] text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.wording) }}
              />
            </div>
          ))
        )}
      </div>
    </section>
  )
}

export interface PremiumRow {
  label: string
  rate: string
  premium: number
  emphasis?: "total"
}

// Rates keep their full precision so the printed premium can be rechecked.
const rateText = (rate: number) => num(rate, 2, 6)

export function premiumRows(slip: PlacingSlip): PremiumRow[] {
  // Premi baris dengan loss limit sudah dikali persentasenya.
  const rows: PremiumRow[] = slip.rateLines
    .filter((l) => l.rate !== null || l.premium > 0)
    .map((l) => ({
      label:
        l.lossLimitPct != null && !BI_RATE_LABELS.includes(l.label)
          ? `${l.label} (Loss Limit ${num(l.lossLimitPct, 0, 4)}%)`
          : coverLabel(slip, l),
      rate: l.rate !== null ? rateText(l.rate) : "—",
      premium: l.premium,
    }))

  slip.tplLines.forEach((l) => {
    rows.push({
      label: `Third Party Liability (Limit ${money(Number(l.basis ?? 0), slip.currency)})`,
      rate: l.rate !== null ? rateText(l.rate) : "—",
      premium: l.premium,
    })
  })
  slip.paLines.forEach((l) => {
    rows.push({
      label: `Personal Accident — ${l.label} (Limit ${money(Number(l.basis ?? 0), slip.currency)})`,
      rate: l.rate !== null ? rateText(l.rate) : "—",
      premium: l.premium,
    })
  })

  return rows.concat([
    {
      label: "Total Premium",
      rate: "",
      premium: totalPremium(slip),
      emphasis: "total",
    },
  ])
}

export function PremiumTable({
  slip,
  rows,
  unitLabel,
}: {
  slip: PlacingSlip
  rows: PremiumRow[]
  unitLabel: string
}) {
  return (
    <table className="w-full text-[12.5px]">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="py-2 font-semibold">Peril / Cover</th>
          <th className="w-28 py-2 text-right font-semibold">
            Rate ({unitLabel})
          </th>
          <th className="w-40 py-2 text-right font-semibold">Premium</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr
            key={`${r.label}-${i}`}
            className={cn(
              "border-b",
              r.emphasis === "total" && "bg-muted/60 font-bold"
            )}
          >
            <td className="py-2 pr-2">{r.label}</td>
            <td className="tabular py-2 text-right">{r.rate}</td>
            <td className="tabular py-2 text-right whitespace-nowrap">
              {moneyCents(r.premium, slip.currency)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function PayableTable({ slip }: { slip: PlacingSlip }) {
  return (
    <table className="mt-4 w-full text-[12.5px]">
      <tbody>
        {slip.discountPct ? (
          <tr className="border-b">
            <td className="py-2">Discount ({num(slip.discountPct, 2)}%)</td>
            <td className="tabular py-2 text-right">
              ({moneyCents(discountAmount(slip), slip.currency)})
            </td>
          </tr>
        ) : null}
        {slip.adminCost ? (
          <tr className="border-b">
            <td className="py-2">Admin Cost</td>
            <td className="tabular py-2 text-right">
              {moneyCents(slip.adminCost, slip.currency)}
            </td>
          </tr>
        ) : null}
        {slip.stampDuty ? (
          <tr className="border-b">
            <td className="py-2">Stamp Duty</td>
            <td className="tabular py-2 text-right">
              {moneyCents(slip.stampDuty, slip.currency)}
            </td>
          </tr>
        ) : null}
        <tr className="bg-primary/8 text-primary">
          <td className="px-2 py-2.5 font-bold">Total Payable</td>
          <td className="tabular px-2 py-2.5 text-right font-bold">
            {moneyCents(totalPayable(slip), slip.currency)}
          </td>
        </tr>
      </tbody>
    </table>
  )
}

/**
 * Rate dengan pengali dicetak seperti CI LCH: "0,04500% × 85% = 0,03825%"
 * untuk loss limit, dan dasar BI × skala indemnity period selain 12 bulan.
 */
function rateFormula(
  line: ParEqvetLine,
  bi: ReturnType<typeof biRateBasis>
) {
  const biBase =
    line.label === BI_RATE_LABELS[0]
      ? bi.par
      : line.label === BI_RATE_LABELS[1]
        ? bi.eqvet
        : null
  if (biBase != null && bi.scalePct !== 100) {
    return `${ratePercentText(biBase / 10)} × ${num(bi.scalePct, 0, 1)}% = ${line.rateText}`
  }
  if (line.ratePercent != null && line.lossLimitPct != null) {
    const effective = (line.ratePercent * line.lossLimitPct) / 100
    return `${line.rateText} × ${num(line.lossLimitPct, 0, 4)}% = ${ratePercentText(effective)}`
  }
  return line.rateText
}

/** Formats Property rate list with full peril titles and 5-decimal percentages per Image 5. */
export function ParEqvetRateBlock({ slip }: { slip: PlacingSlip }) {
  const calc = calculateParEqvet(slip)
  const bi = biRateBasis(slip)
  const allLines = [...calc.par.lines, ...calc.eqvet.lines].filter(
    (l) => l.ratePercent != null
  )

  return (
    <ul className="space-y-1.5 text-[12.5px]">
      {allLines.map((line) => (
        <li
          key={line.id}
          className="flex items-baseline justify-between gap-4"
        >
          <span>- {line.fullName}</span>
          <span className="tabular font-medium whitespace-nowrap text-right">
            : {rateFormula(line, bi)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function ParEqvetGroupSection({
  group,
  currency,
}: {
  group: ParEqvetGroup
  currency: string
}) {
  if (!group.lines.length) return null
  const lastIndex = group.lines.length - 1

  return (
    <div className="space-y-1">
      <table className="w-full text-[12.5px]">
        <tbody>
          {group.lines.map((l, i) => (
            <tr key={l.id} className="border-b/40 border-b">
              <td className="py-1 pr-2">
                {l.formulaLabel} : {moneyCents(l.basis, currency)} x {l.rateText}
                {l.lossLimitPct != null ? ` x ${num(l.lossLimitPct, 0, 4)}%` : ""} =
              </td>
              <td className="tabular py-1 text-right whitespace-nowrap">
                {moneyCents(l.premium, currency)}
                {i === lastIndex && group.lines.length > 1 ? " +" : ""}
              </td>
            </tr>
          ))}

          <tr className="border-t font-semibold">
            <td className="py-1">Premium {group.name}</td>
            <td className="tabular py-1 text-right whitespace-nowrap">
              {moneyCents(group.subtotal, currency)}
            </td>
          </tr>

          {group.discountPct > 0 ? (
            <>
              <tr className="text-muted-foreground">
                <td className="py-1">Discount ({num(group.discountPct, 2)}%)</td>
                <td className="tabular py-1 text-right whitespace-nowrap">
                  ({moneyCents(group.discountAmount, currency)}) -
                </td>
              </tr>
              <tr>
                <td className="py-1">Premium after discount</td>
                <td className="tabular py-1 text-right whitespace-nowrap">
                  {moneyCents(group.afterDiscount, currency)}
                </td>
              </tr>
            </>
          ) : null}

          <tr>
            <td className="py-1">Policy Cost + Stamp Duty</td>
            <td className="tabular py-1 text-right whitespace-nowrap">
              {moneyCents(group.policyCost, currency)} +
            </td>
          </tr>

          <tr className="border-t border-b font-bold">
            <td className="py-1.5">Total Premium {group.name}</td>
            <td className="tabular py-1.5 text-right whitespace-nowrap">
              {moneyCents(group.total, currency)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/** Grouped PAR and EQVET calculation with open formulas, group deductions, and grand total per Image 4. */
export function ParEqvetCalculationBlock({
  slip,
  showBrokerage = true,
}: {
  slip: PlacingSlip
  showBrokerage?: boolean
}) {
  const calc = calculateParEqvet(slip)

  return (
    <div className="space-y-4 text-[12.5px]">
      <ParEqvetGroupSection group={calc.par} currency={calc.currency} />
      <ParEqvetGroupSection group={calc.eqvet} currency={calc.currency} />

      <div className="border-t-2 border-primary/40 pt-2">
        <div className="flex items-center justify-between text-[13px] font-bold">
          <span>GRAND TOTAL PREMIUM (PAR+EQVET)</span>
          <span className="tabular whitespace-nowrap">
            {moneyCents(calc.grandTotal, calc.currency)}
          </span>
        </div>
        {showBrokerage ? (
          <div className="mt-2 text-[12px] text-muted-foreground">
            Brokerage : {num(calc.brokeragePct, 2)}% (
            {calc.includeVat ? "INCL. VAT" : "EXCL. VAT"})
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function SignatureGrid({
  place,
  confirmationTitle,
  confirmationParty,
}: {
  place: string
  confirmationTitle?: string
  confirmationParty?: string
}) {
  return (
    <div className="avoid-break mt-10 grid grid-cols-1 gap-8 text-[13px] sm:grid-cols-2">
      <div>
        <p className="mb-1">{place}</p>
        <p className="mb-14 text-muted-foreground">
          Disiapkan oleh / Prepared by,
        </p>
        <p className="border-t pt-1 font-bold">PT. LCH Insurance Brokers</p>
        <p className="text-xs text-muted-foreground">Authorized Signatory</p>
      </div>
      {confirmationTitle ? (
        <div className="rounded border border-dashed p-4">
          <p className="mb-3 text-[11px] font-bold tracking-wide">
            {confirmationTitle}
          </p>
          <p className="mb-3 border-b pb-8 text-xs text-muted-foreground">
            Nama:
          </p>
          <p className="mb-3 border-b pb-8 text-xs text-muted-foreground">
            Tanda Tangan / Signature:
          </p>
          <p className="text-xs text-muted-foreground">
            Tanggal / Date: ___________________
          </p>
          {confirmationParty ? (
            <p className="mt-3 text-[11px] text-muted-foreground">
              {confirmationParty}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/**
 * Satu blok tanda tangan per asuransi di security panel, berselang kiri-kanan
 * mengikuti urutan panel — leader di kiri atas. Instruksi LCH 29 Oktober 2026:
 * "di ttd nya ada kiri kanan kiri kanan ttd sesuai yang diinput."
 *
 * Panel yang masih kosong tetap mendapat satu blok tanpa nama, supaya dokumen
 * draft tetap punya tempat tanda tangan.
 */
export function InsurerSignatureGrid({
  slip,
  caption,
}: {
  slip: PlacingSlip
  caption?: string
}) {
  const panel = slip.securityPanel ?? []
  return (
    <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-10 text-[13px] sm:grid-cols-2">
      {panel.length === 0 ? (
        <InsurerSignature caption={caption} />
      ) : (
        panel.map((p) => (
          <InsurerSignature
            key={p.id}
            caption={caption}
            party={p}
            shared={panel.length > 1}
          />
        ))
      )}
    </div>
  )
}

function InsurerSignature({
  caption,
  party,
  shared,
}: {
  caption?: string
  party?: SecurityPanelRow
  /** Lebih dari satu asuransi; hanya saat itu peran dan share dicetak. */
  shared?: boolean
}) {
  return (
    <div className="avoid-break">
      {caption ? (
        <p className="mb-14 text-muted-foreground">{caption}</p>
      ) : (
        <div className="h-16" />
      )}
      <p className="border-t pt-1 font-bold">
        {party?.insurer ?? "Nama Perusahaan Asuransi"}
      </p>
      <p className="text-xs text-muted-foreground">Authorized Signatory</p>
      {party && shared ? (
        <p className="text-xs text-muted-foreground">
          {party.role} · {num(party.share, 2)}%
        </p>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">
        Tanggal: ...................
      </p>
    </div>
  )
}

/**
 * Security tanpa judul kolom (LCH, 3 November 2026). Satu asuransi berarti
 * share 100% tanpa leader atau member, jadi cukup namanya; share dan As Leader
 * / As Member baru dicetak kalau asuransinya lebih dari satu.
 */
export function SecurityPanelBlock({ slip }: { slip: PlacingSlip }) {
  const rows = (slip.securityPanel ?? []).filter((p) => p.insurer)
  if (!rows.length) return null
  const shared = rows.length > 1
  return (
    <>
      <SectionHeading>SECURITY</SectionHeading>
      <table className="w-full text-[12.5px]">
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-2">{p.insurer}</td>
              {shared ? (
                <>
                  <td className="tabular w-24 py-2 pr-6 text-right">
                    {num(p.share, 2)}%
                  </td>
                  <td className="w-28 py-2">{p.role}</td>
                </>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/**
 * Brokerage is printed apart from the premium calculation, at the rate entered
 * on the slip, so the document matches the form. Net premium is not printed,
 * per LCH. Only the Placing Slip and Closing Instruction carry this block; the
 * Quotation Slip leaves brokerage out, per LCH's instruction of 29 October 2026.
 */
export function BrokerageBlock({ slip }: { slip: PlacingSlip }) {
  return (
    <>
      <SectionHeading>BROKERAGE</SectionHeading>
      <table className="w-full text-[12.5px]">
        <tbody>
          <tr className="border-b">
            <td className="py-2">
              Brokerage {num(slip.brokeragePct, 2)}% (
              {slip.includeVat ? "INCL. VAT" : "EXCL. VAT"})
            </td>
            <td className="tabular py-2 text-right whitespace-nowrap">
              {moneyCents(brokerageAmount(slip), slip.currency)}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  )
}
