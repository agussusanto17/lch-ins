import { Fragment } from "react"

import {
  coverLabel,
  deductibleRows,
  slipOccupationText,
  usesPropertyBlocks,
  usesSectionSumInsured,
} from "@/components/underwriting/slip-model"
import {
  BI_RATE_LABELS,
  biRateBasis,
  brokerageAmount,
  calculateParEqvet,
  discountAmount,
  ratePermilText,
  roundCents,
  sumItems,
  sumPremium,
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
  type RateLine,
  type ResolvedClause,
  type SecurityPanelRow,
} from "@/lib/data"
import { CURRENCY_SYMBOL, dateEn, money, moneyCents, num } from "@/lib/format"
import {
  isMultiLocation,
  locationGroups,
  locationsShareRates,
  oneLineAddress,
  type LocationGroup,
} from "@/lib/slip-locations"
import { isMultiItem, itemGroups, type ItemGroup } from "@/lib/slip-items"
import { isMultiVehicle, vehicleTitle } from "@/lib/slip-vehicles"
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
  // Keterangan periode dicetak di baris berikutnya, seperti CI LCH: "Both
  // days at 12 o'clock noon local time at the location of the insured object."
  const period = slip.periodTba
    ? "To Be Advised"
    : [
        `${dateEn(slip.inceptionDate)} to ${dateEn(slip.expiryDate)}`,
        slip.periodNote?.trim(),
      ]
        .filter(Boolean)
        .join("\n")

  // Slip PAR + EQVET dengan dua type of cover dicetak seperti CI LCH: satu
  // baris per type of cover, masing-masing diawali tanda hubung. Nama di
  // dokumen yang diisi di slip menggantikan nama master.
  const covers = [
    slip.typeOfCover && (slip.typeOfCoverLabel?.trim() || slip.typeOfCover),
    slip.typeOfCover2 && (slip.typeOfCover2Label?.trim() || slip.typeOfCover2),
  ].filter(Boolean)
  const rows: [string, string | string[]][] = [
    [
      "Type of Cover",
      covers.length > 1
        ? covers.map((c) => `- ${c}`).join("\n")
        : covers[0] || "—",
    ],
  ]
  // Wording form hanya dicetak di sini, tidak di CLAUSES (Harry, 5 November
  // 2026). Lebih dari satu dicetak satu baris per wording seperti CI LCH.
  const wordingForms = slip.wordingForms.filter(Boolean)
  if (wordingForms.length)
    rows.push([
      "Wording Form",
      wordingForms.length > 1
        ? wordingForms.map((w) => `- ${w}`).join("\n")
        : wordingForms[0],
    ])
  rows.push(
    ["Insured Name", slip.insuredName.toUpperCase() || "—"],
    ["Correspondence Address", slip.correspondenceAddress || "—"],
    ["Period of Insurance", period]
  )
  if (isMultiLocation(slip)) {
    rows.push(...locationRows(slip))
  } else {
    if (slip.occupation) rows.push(["Occupation", slipOccupationText(slip)])
    if (slip.riskLocation) rows.push(["Risk Location", slip.riskLocation])
    if (slip.cob === "Property" && slip.constructionClass)
      rows.push([
        "Construction Class",
        constructionClassLabel(slip.constructionClass),
      ])
  }
  if (slip.cob === "Property" && slip.indemnityPeriod)
    rows.push(["Indemnity Period", slip.indemnityPeriod])

  return <InfoTable rows={rows} />
}

/**
 * Okupasi, lokasi, dan kelas slip Property multi lokasi, bernomor seperti CI
 * LCH Ruko & Gudang. Tiap lokasi mencetak sum insured-nya. Okupasi dan kelas
 * konstruksi cukup sekali bila semua lokasi sama, seperti CI SISKA RAHARJA.
 */
function locationRows(slip: PlacingSlip): [string, string[]][] {
  const groups = locationGroups(slip)
  const occupations = groups.map((g) => slipOccupationText(g.location) || "—")
  const rows: [string, string[]][] = [
    [
      "Occupation",
      new Set(occupations).size === 1 ? [occupations[0]] : occupations,
    ],
    [
      "Risk(s) Location",
      groups.map((g) => {
        const address = oneLineAddress(g.location.riskLocation).replace(/\.$/, "")
        const amount = sumItems(g.section1) + sumItems(g.section2)
        return `${address || "—"}. Sum Insured: ${money(amount, slip.currency)}`
      }),
    ],
  ]
  const classes = groups.map((g) => g.location.constructionClass ?? "")
  if (classes.some(Boolean)) {
    rows.push([
      "Construction Class",
      new Set(classes).size === 1
        ? [constructionClassLabel(classes[0])]
        : classes.map((c) => constructionClassLabel(c) || "—"),
    ])
  }
  return rows
}

export function InfoTable({
  rows,
  dense = false,
}: {
  /** Nilai berupa daftar dicetak bernomor, satu butir per baris. */
  rows: [string, string | string[]][]
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
            <td className={cn("whitespace-pre-line", cell)}>
              {Array.isArray(v) && v.length > 1 ? (
                <ol className="list-decimal pl-5">
                  {v.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ol>
              ) : (
                (Array.isArray(v) ? v[0] : v) || "—"
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function InterestBlock({ slip }: { slip: PlacingSlip }) {
  const isProperty = slip.cob === "Property"
  // Slip multi lokasi menyebut lokasi tiap item sum insured.
  const multi = isMultiLocation(slip)
  const sectionItems = (section: "section1" | "section2") =>
    locationGroups(slip).flatMap((g) =>
      g[section].map((item) => ({ item, no: g.no }))
    )

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
                {sectionItems("section1").map(({ item: i, no }) => (
                  <li
                    key={i.id}
                    className="flex justify-between gap-6 border-b border-dashed py-1"
                  >
                    <span>
                      {multi ? `Lokasi ${no} — ` : ""}
                      {i.description}
                    </span>
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
                {sectionItems("section2").map(({ item: i, no }) => (
                  <li
                    key={i.id}
                    className="flex justify-between gap-6 border-b border-dashed py-1"
                  >
                    <span>
                      {multi ? `Lokasi ${no} — ` : ""}
                      {i.description}
                    </span>
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
          {slip.interestItems.map((i, index) => {
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
                      {/* Nomor kendaraan dirujuk jadwal premi slip multi kendaraan. */}
                      {isMultiVehicle(slip) ? `${index + 1}. ` : ""}
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
                <span className="leading-relaxed whitespace-pre-line">
                  {/* Nomor objek dirujuk jadwal premi slip multi objek. */}
                  {isMultiItem(slip) ? `${index + 1}. ` : ""}
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

/**
 * Coverage dari Detail Coverage & Ketentuan, dicetak setelah INTEREST INSURED
 * seperti CI Machinery Breakdown LCH (Agus, 5 November 2026). Paragraf dan
 * baris barunya dipertahankan. Motor Vehicle tidak punya isian ini.
 */
export function CoverageBlock({ slip }: { slip: PlacingSlip }) {
  const text = slip.coverage?.trim()
  if (!text || !usesPropertyBlocks(slip.cob)) return null
  return (
    <>
      <SectionHeading>COVERAGE</SectionHeading>
      <p className="text-[13px] leading-relaxed whitespace-pre-line">{text}</p>
    </>
  )
}

export function DeductibleBlock({ slip }: { slip: PlacingSlip }) {
  // Deductible texts already name their peril, so the cover column is not
  // printed. Covers sharing the same text print it once, each as a "-" bullet
  // like the rate list, with wrapped lines aligned to the text.
  const rows = deductibleRows(slip)
  const texts = (pick: (row: (typeof rows)[number]) => boolean) => [
    ...new Set(
      rows
        .filter(pick)
        .flatMap((r) => r.deductibles)
        .map((text) => text.trim())
        .filter(Boolean)
    ),
  ]
  // Slip Property mengikuti CI LCH (contoh SISKA RAHARJA): kalimat pengantar,
  // lalu deductible per section; cover BI masuk Section 2.
  const property = slip.cob === "Property"
  const groups = (
    property
      ? [
          {
            heading: "Section 1 — Material Damage",
            texts: texts((r) => !BI_RATE_LABELS.includes(r.cover)),
          },
          {
            heading: "Section 2 — Business Interruption",
            texts: texts((r) => BI_RATE_LABELS.includes(r.cover)),
          },
        ]
      : [{ heading: null, texts: texts(() => true) }]
  ).filter((g) => g.texts.length > 0)
  if (!groups.length && !slip.specialConditions) return null

  return (
    <>
      <SectionHeading>DEDUCTIBLE &amp; CONDITIONS</SectionHeading>
      <div className="flex flex-col gap-3 text-[13px]">
        {groups.length && property ? (
          <p>Any one loss or series of losses arising out of any one event:</p>
        ) : null}
        {groups.map((g) => (
          <div key={g.heading ?? "deductible"}>
            {g.heading ? (
              <p className="mb-1.5 font-semibold">{g.heading}</p>
            ) : null}
            <ul className="flex flex-col gap-1.5 text-[12.5px]">
              {g.texts.map((text) => (
                <li key={text} className="flex gap-2">
                  <span aria-hidden>-</span>
                  <span className="whitespace-pre-line">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
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
}

/**
 * Slip Property mencetak klausula tanpa section dulu tanpa judul, lalu per
 * section dengan judul yang sama seperti INTEREST INSURED, sesuai CI LCH. COB
 * lain satu daftar tanpa judul. Kelompok kosong dilewati. Nomor klausula
 * mulai dari 1 lagi di tiap kelompok (Agus, 5 November 2026).
 */
function clauseGroups(slip: PlacingSlip): ClauseGroup[] {
  const section1 = resolveClauses(
    slip.clauseIds,
    slip.clauseOverrides,
    slip.clauseCopies
  )
  const groups = usesSectionSumInsured(slip.cob)
    ? [
        {
          heading: null,
          clauses: resolveClauses(
            slip.clauseIdsGeneral ?? [],
            slip.clauseOverridesGeneral,
            slip.clauseCopiesGeneral
          ),
        },
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

  return groups.filter((g) => g.clauses.length > 0)
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
  const groups = clauseGroups(slip)
  if (!groups.length) return null

  return (
    <>
      <SectionHeading>CLAUSES</SectionHeading>
      <ol className="flex flex-col gap-2 text-[12px]">
        {groups.map((g, gi) =>
          g.clauses.map((c, i) => (
            <li key={`${gi}-${c.id}`} className="avoid-break">
              {g.heading && i === 0 ? (
                <ClauseGroupHeading first={gi === 0}>
                  {g.heading}
                </ClauseGroupHeading>
              ) : null}
              <p className={inline ? "font-semibold" : undefined}>
                {i + 1}. {inline ? c.title : clauseTitleCase(c.title)}
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
  const groups = clauseGroups(slip)
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
                {i + 1}. {c.title}
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
 * Rate with a multiplier prints like the LCH CI: "0,450000‰ × 85% = 0,382500‰"
 * for loss limit, and BI basis × indemnity period scale other than 12 months.
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
    return `${ratePermilText(biBase)} × ${num(bi.scalePct, 0, 1)}% = ${line.rateText}`
  }
  if (line.ratePermil != null && line.lossLimitPct != null) {
    const effective = (line.ratePermil * line.lossLimitPct) / 100
    return `${line.rateText} × ${num(line.lossLimitPct, 0, 4)}% = ${ratePermilText(effective)}`
  }
  return line.rateText
}

/** Formats Property rate list with full peril titles and per mil rates. */
export function ParEqvetRateBlock({ slip }: { slip: PlacingSlip }) {
  const calc = calculateParEqvet(slip)
  const bi = biRateBasis(slip)
  const allLines = [...calc.par.lines, ...calc.eqvet.lines].filter(
    (l) => l.ratePercent != null
  )

  return (
    // Columns keep every colon and rate aligned, as on the LCH CI.
    <table className="w-full text-[12.5px]">
      <tbody>
        {allLines.map((line) => (
          <tr key={line.id} className="align-top">
            <td className="py-0.5 pr-2">- {line.fullName}</td>
            <td className="w-3 py-0.5">:</td>
            <td className="tabular py-0.5 font-medium whitespace-nowrap">
              {rateFormula(line, bi)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const CELL = "tabular py-1 whitespace-nowrap"

/**
 * Currency, amount, and +/- marker in separate cells so every IDR, digit, and
 * marker lines up down the column.
 */
function AmountCells({
  value,
  currency,
  sign,
  negative,
  className = "",
}: {
  value: number
  currency: string
  sign?: "+" | "-"
  negative?: boolean
  className?: string
}) {
  return (
    <>
      <td className={`${CELL} pr-1.5 ${className}`}>
        {CURRENCY_SYMBOL[currency] ?? currency}
      </td>
      <td className={`${CELL} text-right ${className}`}>
        {negative ? "(" : ""}
        {num(value, 2)}
        {/* Hanging parenthesis keeps the digits aligned with other rows. */}
        {negative ? <span className="absolute">)</span> : null}
      </td>
      <td className={`${CELL} w-5 pl-2.5 ${className}`}>{sign ?? ""}</td>
    </>
  )
}

function SummaryRow({
  label,
  className = "",
  ...amount
}: {
  label: string
  className?: string
} & Parameters<typeof AmountCells>[0]) {
  return (
    <tr className={className}>
      <td colSpan={6} className="py-1">
        {label}
      </td>
      <AmountCells {...amount} />
    </tr>
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
    <tbody>
      {group.lines.map((l, i) => (
        <tr key={l.id} className="border-b border-border/40 align-top">
          <td className="py-1 pr-2">{l.formulaLabel}</td>
          <td className="w-3 py-1">:</td>
          <td className={`${CELL} pr-1.5`}>
            {CURRENCY_SYMBOL[currency] ?? currency}
          </td>
          <td className={`${CELL} pr-2 text-right`}>{num(l.basis, 2)}</td>
          <td className={`${CELL} pr-2`}>
            x {l.rateText}
            {l.lossLimitPct != null ? ` x ${num(l.lossLimitPct, 0, 4)}%` : ""}
          </td>
          <td className="w-4 py-1">=</td>
          <AmountCells
            value={l.premium}
            currency={currency}
            sign={i === lastIndex && group.lines.length > 1 ? "+" : undefined}
          />
        </tr>
      ))}

      <SummaryRow
        label={`Premium ${group.name}`}
        className="border-t font-semibold"
        value={group.subtotal}
        currency={currency}
      />

      {group.discountPct > 0 ? (
        <>
          <SummaryRow
            label={`Discount (${num(group.discountPct, 2)}%)`}
            className="text-muted-foreground"
            value={group.discountAmount}
            currency={currency}
            negative
            sign="-"
          />
          <SummaryRow
            label="Premium after discount"
            value={group.afterDiscount}
            currency={currency}
          />
        </>
      ) : null}

      <SummaryRow
        label="Policy Cost + Stamp Duty"
        value={group.policyCost}
        currency={currency}
        sign="+"
      />

      <SummaryRow
        label={`Total Premium ${group.name}`}
        className="border-t border-b font-bold"
        value={group.total}
        currency={currency}
      />
    </tbody>
  )
}

/** Grouped PAR and EQVET calculation with open formulas, group deductions, and grand total per Image 4. */
export function ParEqvetCalculationBlock({ slip }: { slip: PlacingSlip }) {
  const calc = calculateParEqvet(slip)

  return (
    // One table so PAR, EQVET, and the grand total share column widths.
    <table className="w-full text-[12.5px]">
      <ParEqvetGroupSection group={calc.par} currency={calc.currency} />
      {calc.par.lines.length > 0 && calc.eqvet.lines.length > 0 ? (
        <tbody aria-hidden>
          <tr>
            <td colSpan={9} className="h-4" />
          </tr>
        </tbody>
      ) : null}
      <ParEqvetGroupSection group={calc.eqvet} currency={calc.currency} />
      <tbody>
        <tr aria-hidden>
          <td colSpan={9} className="h-4" />
        </tr>
        <SummaryRow
          label="GRAND TOTAL PREMIUM (PAR+EQVET)"
          className="border-t-2 border-primary/40 text-[13px] font-bold"
          value={calc.grandTotal}
          currency={calc.currency}
        />
      </tbody>
    </table>
  )
}

/** Objek dan sum insured satu section lokasi, untuk kolom Objek dan Sum Insured. */
function sectionObject(group: LocationGroup, bi: boolean) {
  const items = bi ? group.section2 : group.section1
  return {
    text:
      items
        .map((i) => i.description.trim())
        .filter(Boolean)
        .join(", ") || "—",
    amount: sumItems(items),
  }
}

/**
 * Baris jadwal premi satu polis (PAR atau EQVET). Nomor lokasi tercetak di
 * baris pertama lokasi itu, objek dan sum insured di baris pertama tiap
 * section, karena baris BI memakai Section 2.
 */
function scheduleRows(lines: ParEqvetLine[], groups: LocationGroup[]) {
  let previous = ""
  return lines
    .filter((l) => l.ratePercent != null)
    .map((line) => {
      const bi = BI_RATE_LABELS.includes(line.label)
      const key = `${line.locationNo}:${bi ? 2 : 1}`
      const newLocation = !previous.startsWith(`${line.locationNo}:`)
      const newSection = key !== previous
      previous = key
      const group = groups.find((g) => g.no === line.locationNo)
      return {
        line,
        locationNo: newLocation ? line.locationNo : null,
        object: newSection && group ? sectionObject(group, bi) : null,
      }
    })
}

/**
 * Rate & premium slip Property multi lokasi (Opsi B, disetujui Harry 5
 * November 2026): satu baris per lokasi dan cover, PAR dan EQVET terpisah,
 * lalu Discount, Policy Cost, dan Stamp Duty sebelum Grand Total. Bagian RATE
 * hanya dicetak bila semua lokasi memakai rate yang sama; selain itu rate
 * cukup dibaca di tabel.
 */
export function LocationPremiumSchedule({ slip }: { slip: PlacingSlip }) {
  const calc = calculateParEqvet(slip)
  const groups = locationGroups(slip)
  // Rate yang sama di semua lokasi dicetak sekali di bagian RATE, seperti CI
  // SISKA RAHARJA; tabel di bawahnya tetap per lokasi.
  const sharedRates = locationsShareRates(slip)
  const first = groups[0]
  const currency = calc.currency
  const amount = (value: number) => num(value, 2)
  const policies = [calc.par, calc.eqvet].filter((g) => g.subtotal > 0).length
  const discount = roundCents(calc.par.discountAmount + calc.eqvet.discountAmount)
  const sections = [calc.par, calc.eqvet]
    .map((group) => ({ group, rows: scheduleRows(group.lines, groups) }))
    .filter((s) => s.rows.length > 0 || s.group.subtotal > 0)
  const cell = "py-1.5 pr-2 align-top"

  return (
    <>
      {sharedRates ? (
        <>
          <SectionHeading>RATE</SectionHeading>
          <ParEqvetRateBlock
            slip={{
              ...slip,
              locations: [first.location],
              sumInsuredSection1: first.section1,
              sumInsuredSection2: first.section2,
              rateLines: first.rateLines,
            }}
          />
        </>
      ) : null}
      <div className="mt-6">
        <InfoTable
          rows={[
            [sharedRates ? "Premium" : "Rate & Premium", "As per schedule below"],
          ]}
        />
      </div>
      <SectionHeading>PREMIUM CALCULATION</SectionHeading>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="w-14 py-2 pr-2 font-semibold">Lokasi</th>
            <th className="py-2 pr-2 font-semibold">Objek</th>
            <th className="py-2 pr-2 text-right font-semibold">
              Sum Insured ({currency})
            </th>
            <th className="py-2 pr-2 font-semibold">Cover</th>
            <th className="py-2 pr-2 text-right font-semibold">Rate</th>
            <th className="py-2 text-right font-semibold">
              Premium ({currency})
            </th>
          </tr>
        </thead>
        <tbody>
          {sections.map(({ group, rows }) => (
            <Fragment key={group.name}>
              {rows.map(({ line, locationNo, object }) => (
                <tr key={line.id} className="avoid-break border-b border-dashed">
                  <td className={cell}>{locationNo ?? ""}</td>
                  <td className={cell}>{object?.text ?? ""}</td>
                  <td className={cn(cell, "tabular text-right whitespace-nowrap")}>
                    {object ? amount(object.amount) : ""}
                  </td>
                  <td className={cn(cell, "whitespace-nowrap")}>
                    {line.formulaLabel}
                  </td>
                  <td className={cn(cell, "tabular text-right whitespace-nowrap")}>
                    {line.rateText}
                    {line.lossLimitPct != null
                      ? ` × ${num(line.lossLimitPct, 0, 4)}%`
                      : ""}
                  </td>
                  <td className="tabular py-1.5 text-right align-top whitespace-nowrap">
                    {amount(line.premium)}
                  </td>
                </tr>
              ))}
              <tr className="avoid-break border-b font-semibold">
                <td colSpan={5} className="py-1.5 pr-2">
                  Premium {group.name}
                </td>
                <td className="tabular py-1.5 text-right whitespace-nowrap">
                  {amount(group.subtotal)}
                </td>
              </tr>
            </Fragment>
          ))}
          {calc.par.discountPct > 0 ? (
            <tr className="avoid-break border-b">
              <td colSpan={4} className="py-1.5 pr-2">
                Discount
              </td>
              <td className="tabular py-1.5 pr-2 text-right">
                {num(calc.par.discountPct, 0, 2)}%
              </td>
              <td className="tabular py-1.5 text-right whitespace-nowrap">
                ({amount(discount)})
              </td>
            </tr>
          ) : null}
          <tr className="avoid-break border-b">
            <td colSpan={5} className="py-1.5 pr-2">
              Policy Cost
            </td>
            <td className="tabular py-1.5 text-right whitespace-nowrap">
              {amount(roundCents((slip.adminCost || 0) * policies))}
            </td>
          </tr>
          <tr className="avoid-break border-b">
            <td colSpan={5} className="py-1.5 pr-2">
              Stamp Duty
            </td>
            <td className="tabular py-1.5 text-right whitespace-nowrap">
              {amount(roundCents((slip.stampDuty || 0) * policies))}
            </td>
          </tr>
          <tr className="avoid-break bg-primary/8 font-bold text-primary">
            <td colSpan={5} className="px-2 py-2">
              Grand Total Premium (PAR+EQVET)
            </td>
            <td className="tabular px-2 py-2 text-right whitespace-nowrap">
              {amount(calc.grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  )
}

/**
 * Rate & premium slip Motor Vehicle multi kendaraan, seperti jadwal premi per
 * lokasi slip Property: per kendaraan casco dan perluasan dari TSI-nya, lalu
 * TPL dan PA dari limitnya, dengan subtotal per kendaraan. Diskon, admin
 * cost, stamp duty, dan Total Payable dicetak di bawahnya oleh PayableTable.
 */
export function VehiclePremiumSchedule({ slip }: { slip: PlacingSlip }) {
  const groups = itemGroups(slip)
  const currency = slip.currency || "IDR"
  const amount = (value: number) => num(value, 2)
  const shown = (l: RateLine) => l.rate !== null || l.premium > 0
  const cell = "py-1.5 pr-2 align-top"

  return (
    <>
      <div className="mt-6">
        <InfoTable rows={[["Rate & Premium", "As per schedule below"]]} />
      </div>
      <SectionHeading>PREMIUM CALCULATION</SectionHeading>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="w-20 py-2 pr-2 font-semibold">Kendaraan</th>
            <th className="py-2 pr-2 font-semibold">Objek</th>
            <th className="py-2 pr-2 text-right font-semibold">
              TSI / Limit ({currency})
            </th>
            <th className="py-2 pr-2 font-semibold">Cover</th>
            <th className="py-2 pr-2 text-right font-semibold">Rate</th>
            <th className="py-2 text-right font-semibold">
              Premium ({currency})
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            const casco = g.rateLines.filter(shown)
            const limits = [
              ...g.tplLines.filter(shown).map((l) => ({ line: l, cover: "Third Party Liability" })),
              ...g.paLines.filter(shown).map((l) => ({ line: l, cover: `Personal Accident — ${l.label}` })),
            ]
            const subtotal =
              sumPremium(g.rateLines) + sumPremium(g.tplLines) + sumPremium(g.paLines)
            return (
              <Fragment key={g.item.id}>
                {casco.map((l, i) => (
                  <tr key={l.id} className="avoid-break border-b border-dashed">
                    <td className={cell}>{i === 0 ? g.no : ""}</td>
                    <td className={cell}>{i === 0 ? vehicleTitle(g.item) : ""}</td>
                    <td className={cn(cell, "tabular text-right whitespace-nowrap")}>
                      {i === 0 ? amount(g.item.amount || 0) : ""}
                    </td>
                    <td className={cell}>{l.label}</td>
                    <td className={cn(cell, "tabular text-right whitespace-nowrap")}>
                      {l.rate !== null ? `${rateText(l.rate)}%` : "—"}
                    </td>
                    <td className="tabular py-1.5 text-right align-top whitespace-nowrap">
                      {amount(l.premium)}
                    </td>
                  </tr>
                ))}
                {limits.map(({ line, cover }, i) => (
                  <tr key={line.id} className="avoid-break border-b border-dashed">
                    <td className={cell}>{!casco.length && i === 0 ? g.no : ""}</td>
                    <td className={cell}>
                      {!casco.length && i === 0 ? vehicleTitle(g.item) : ""}
                    </td>
                    <td className={cn(cell, "tabular text-right whitespace-nowrap")}>
                      {amount(Number(line.basis ?? 0))}
                    </td>
                    <td className={cell}>{cover}</td>
                    <td className={cn(cell, "tabular text-right whitespace-nowrap")}>
                      {line.rate !== null ? `${rateText(line.rate)}%` : "—"}
                    </td>
                    <td className="tabular py-1.5 text-right align-top whitespace-nowrap">
                      {amount(line.premium)}
                    </td>
                  </tr>
                ))}
                <tr className="avoid-break border-b font-semibold">
                  <td colSpan={5} className="py-1.5 pr-2">
                    Premium kendaraan {g.no}
                  </td>
                  <td className="tabular py-1.5 text-right whitespace-nowrap">
                    {amount(subtotal)}
                  </td>
                </tr>
              </Fragment>
            )
          })}
          <tr className="avoid-break bg-muted/60 font-bold">
            <td colSpan={5} className="px-2 py-2">
              Total Premium
            </td>
            <td className="tabular px-2 py-2 text-right whitespace-nowrap">
              {amount(totalPremium(slip))}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  )
}

/** Uraian objek di jadwal premi: baris pertamanya saja, karena uraian lengkap sudah dicetak di INTEREST INSURED. */
function objectName(group: ItemGroup) {
  return group.item.description.split("\n")[0].trim() || `Objek ${group.no}`
}

/**
 * Rate & premium slip multi objek COB selain Property dan Motor Vehicle
 * (Agus, 5 November 2026), misalnya peserta PA atau unit MB dan CPM: satu
 * baris per objek dengan nilai, rate, dan preminya, lalu Total Premium.
 * Diskon, admin cost, stamp duty, dan Total Payable dicetak di bawahnya oleh
 * PayableTable.
 */
export function ObjectPremiumSchedule({ slip }: { slip: PlacingSlip }) {
  const groups = itemGroups(slip)
  const currency = slip.currency || "IDR"
  const amount = (value: number) => num(value, 2)
  const cell = "py-1.5 pr-2 align-top"

  return (
    <>
      <div className="mt-6">
        <InfoTable rows={[["Rate & Premium", "As per schedule below"]]} />
      </div>
      <SectionHeading>PREMIUM CALCULATION</SectionHeading>
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="w-12 py-2 pr-2 font-semibold">No</th>
            <th className="py-2 pr-2 font-semibold">Objek</th>
            <th className="py-2 pr-2 text-right font-semibold">
              Sum Insured ({currency})
            </th>
            <th className="py-2 pr-2 text-right font-semibold">Rate</th>
            <th className="py-2 text-right font-semibold">
              Premium ({currency})
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => {
            // Satu baris rate per objek; slip lama bisa punya lebih.
            const lines = g.rateLines.length ? g.rateLines : [null]
            return lines.map((l, i) => (
              <tr key={l?.id ?? g.item.id} className="avoid-break border-b border-dashed">
                <td className={cell}>{i === 0 ? g.no : ""}</td>
                <td className={cell}>
                  {i === 0 ? (
                    <span className="line-clamp-2">{objectName(g)}</span>
                  ) : null}
                </td>
                <td className={cn(cell, "tabular text-right whitespace-nowrap")}>
                  {i === 0 ? amount(g.item.amount || 0) : ""}
                </td>
                <td className={cn(cell, "tabular text-right whitespace-nowrap")}>
                  {l?.rate != null ? `${rateText(l.rate)}%` : "—"}
                </td>
                <td className="tabular py-1.5 text-right align-top whitespace-nowrap">
                  {amount(l?.premium ?? 0)}
                </td>
              </tr>
            ))
          })}
          <tr className="avoid-break bg-muted/60 font-bold">
            <td colSpan={4} className="px-2 py-2">
              Total Premium
            </td>
            <td className="tabular px-2 py-2 text-right whitespace-nowrap">
              {amount(totalPremium(slip))}
            </td>
          </tr>
        </tbody>
      </table>
    </>
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
