import { Fragment } from "react"

import {
  coverLabel,
  exclusionItems,
  slipOccupationText,
  slipPeriodRow,
  slipSectionTitles,
  usesPropertyBlocks,
} from "@/components/underwriting/slip-model"
import {
  BI_RATE_LABELS,
  biRateBasis,
  brokerageAmount,
  calculateParEqvet,
  discountAmount,
  isParEqvetSlip,
  ratePermilText,
  roundCents,
  sumItems,
  totalPayable,
  totalPremium,
  totalSumInsured,
  type ParEqvetGroup,
  type ParEqvetLine,
} from "@/lib/calc"

export { isParEqvetSlip } from "@/lib/calc"
import { sanitizeHtml } from "@/lib/sanitize"
import { deductibleGroups } from "@/lib/slip-deductibles"
import {
  clauseTitleCase,
  constructionClassLabel,
  parseVehicleDescription,
  resolveSlipClauses,
  type ClauseOverride,
  type LineItem,
  type PlacingSlip,
  type RateLine,
  type ResolvedClause,
  type SecurityPanelRow,
  wordingText,
  type SlipParticipant,
} from "@/lib/data"
import { CURRENCY_SYMBOL, money, moneyCents, num } from "@/lib/format"
import {
  addressLines,
  isMultiLocation,
  locationGroups,
  locationsShareRates,
  type LocationGroup,
} from "@/lib/slip-locations"
import { isExistingPolicyLabel, printedDetailRows } from "@/lib/slip-details"
import { clauseGroupBlocks } from "@/lib/clause-groups"
import {
  participantAge,
  participantDateText,
  participantPidText,
  participantsTotal,
  usesParticipants,
} from "@/lib/slip-participants"
import { openCoverRateText, usesOpenCover } from "@/lib/open-cover"
import {
  isFlatLine,
  isLimitOnlyItem,
  isMultiItem,
  itemSection,
  itemGroups,
  type ItemGroup,
} from "@/lib/slip-items"
import {
  AS_ATTACHED,
  extensionShort,
  sameOrAttached,
  vehicleSchedule,
} from "@/lib/slip-schedule"
import { isMultiVehicle } from "@/lib/slip-vehicles"
import { parseBulletLine } from "@/lib/document-format"
import { cn } from "@/lib/utils"

export function DocTitle({
  title,
  number,
  muted,
}: {
  title: string
  number?: string
  muted?: boolean
}) {
  return (
    <div className="mb-8 text-center">
      <h1 className="text-[17px] font-bold tracking-[0.18em]">{title}</h1>
      {number ? (
        <p
          className={cn(
            "mt-1 text-sm font-semibold",
            muted ? "font-normal text-muted-foreground" : "text-primary"
          )}
        >
          {number}
        </p>
      ) : null}
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
  // Label dan isi periode, misalnya "Estimated Time of Departure (ETD)" atau
  // satu tanggal turnamen; keterangan periode di baris berikutnya.
  const period = slipPeriodRow(slip)

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
    [
      "Insured Name",
      // Nama dan uraian tertanggung dicetak persis seperti isian user.
      [slip.insuredName.trim() || "—", slip.insuredDescription?.trim()]
        .filter(Boolean)
        .join("\n"),
    ],
    ["Correspondence Address", slip.correspondenceAddress || "—"],
    period
  )
  // PA dengan satu peserta dicetak di sini, bukan sebagai lampiran tabel,
  // seperti CI PA ekspatriat LCH (Harry, 7 November 2026).
  if (usesParticipants(slip.cob) && slip.participants?.length === 1)
    rows.push(["PID / Insured Name", participantPidText(slip.participants[0])])
  if (isMultiLocation(slip)) {
    rows.push(...attachedLocationRows(slip))
  } else {
    const occupation = slipOccupationText(slip)
    if (occupation) rows.push(["Occupation", occupation])
    const location = addressLines(slip.riskLocation ?? "")
    if (location) rows.push(["Risk Location", location])
    if (slip.cob === "Property" && slip.constructionClass)
      rows.push([
        "Construction Class",
        constructionClassLabel(slip.constructionClass),
      ])
  }
  if (slip.cob === "Property" && slip.indemnityPeriod)
    rows.push(["Indemnity Period", slip.indemnityPeriod])
  // Detail tambahan, misalnya Retroactive Date, Voyage, atau Vessels (analisa
  // 26 contoh slip LCH, 6 November 2026). Baris tanpa isi tidak dicetak.
  // Existing Policy No. dicetak di sisi kanan atas tabel detail, bukan
  // sebagai baris tabel (Harry, 6 November 2026).
  const details = printedDetailRows(slip.detailRows)
  const existing = details.find((r) => isExistingPolicyLabel(r.label))
  for (const r of details)
    if (r !== existing) rows.push([r.label || "—", r.value])

  return (
    <>
      {existing ? (
        <p className="-mt-2 mb-3 text-right text-[13px] whitespace-pre-line">
          <span className="text-muted-foreground">{existing.label}</span>
          {" : "}
          <span className="font-medium">{existing.value}</span>
        </p>
      ) : null}
      <InfoTable rows={rows} />
    </>
  )
}

/**
 * Okupasi, lokasi, dan kelas slip Property multi lokasi di badan dokumen.
 * Okupasi dan kelas konstruksi yang sama di semua lokasi dicetak sekali;
 * selebihnya "As Attached", dengan rincian di lampiran DAFTAR LOKASI (Agus,
 * 9 November 2026).
 */
function attachedLocationRows(slip: PlacingSlip): [string, string][] {
  const groups = locationGroups(slip)
  const rows: [string, string][] = []
  const occupation = sameOrAttached(groups.map((g) => slipOccupationText(g.location)))
  if (occupation) rows.push(["Occupation", occupation])
  rows.push(["Risk(s) Location", `${AS_ATTACHED} (${groups.length} locations)`])
  const classes = sameOrAttached(
    groups.map((g) =>
      g.location.constructionClass ? constructionClassLabel(g.location.constructionClass) : ""
    )
  )
  if (classes) rows.push(["Construction Class", classes])
  return rows
}

/**
 * Komponen teks dengan tata letak hanging indent (indentasi gantung).
 * Baris berawalan bullet (- • * – —) atau nomor urut (1. 1) a. dll)
 * dirender dengan pemisahan marker (shrink-0) dan isi kalimat (flex-1 min-w-0 text-justify),
 * sehingga saat kalimat membungkus ke baris berikutnya teks sejajar rapi di bawah teks baris pertama,
 * bukan jatuh di bawah simbol bullet/nomor.
 */
export function HangingIndentText({
  text,
  className,
}: {
  text: string | string[] | null | undefined
  className?: string
}) {
  if (!text) return null

  const rawLines = Array.isArray(text)
    ? text.flatMap((t) => (typeof t === "string" ? t.split("\n") : []))
    : typeof text === "string"
      ? text.split("\n")
      : [String(text)]

  if (!rawLines.length) return null

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {rawLines.map((rawLine, idx) => {
        const trimmed = rawLine.trim()
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />
        }

        const parsed = parseBulletLine(trimmed)
        if (parsed) {
          return (
            <div key={idx} className="flex gap-2 text-justify">
              <span className="shrink-0 select-none">{parsed.marker}</span>
              <span className="flex-1 min-w-0 text-justify">{parsed.content}</span>
            </div>
          )
        }

        return (
          <div key={idx} className="text-justify">
            {rawLine}
          </div>
        )
      })}
    </div>
  )
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
            <td className={cn("text-justify", cell)}>
              {Array.isArray(v) && v.length > 1 ? (
                v.some((item) => typeof item === "string" && parseBulletLine(item) !== null) ? (
                  <HangingIndentText text={v} />
                ) : (
                  <ol className="list-decimal pl-5">
                    {v.map((item, i) => (
                      <li key={i} className="text-justify">{item}</li>
                    ))}
                  </ol>
                )
              ) : (
                <HangingIndentText text={(Array.isArray(v) ? v[0] : v) || "—"} />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function InterestBlock({ slip }: { slip: PlacingSlip }) {
  // Banyak kendaraan: rinciannya di lampiran DAFTAR UNIT KENDARAAN.
  if (isMultiVehicle(slip)) return <VehiclesAttachedInterest slip={slip} />
  const isProperty = slip.cob === "Property"
  const multi = isMultiLocation(slip)
  const sumInsuredRow = (i: LineItem) => (
    <li
      key={i.id}
      className="flex justify-between items-start gap-6 border-b border-dashed py-1"
    >
      <div className="flex-1 min-w-0 text-justify">
        <HangingIndentText text={i.description} />
      </div>
      <span className="tabular whitespace-nowrap shrink-0 self-start">
        {money(i.amount, slip.currency)}
      </span>
    </li>
  )
  // Slip multi lokasi menulis "As Attached"; objek per lokasi dicetak di
  // lampiran DAFTAR LOKASI (Agus, 9 November 2026).
  const sectionList = (section: "section1" | "section2") => {
    if (multi) return <p className="mt-2 font-medium">{AS_ATTACHED}</p>
    return (
      <ul className="mt-2 flex flex-col gap-1">
        {locationGroups(slip)
          .flatMap((g) => g[section])
          .map((i) => sumInsuredRow(i))}
      </ul>
    )
  }
  // Slip ber-section (CAR, EAR) mengelompokkan objek per section.
  const objectSections = isProperty ? null : slipSectionTitles(slip)

  /** Satu objek Interest COB selain Property dan kendaraan. */
  const objectRow = (i: LineItem, index: number) => {
    const vehicleLabel = [i.vehicleBrandName, i.vehicleTypeName]
      .filter(Boolean)
      .join(" ")
    const numPrefix = isMultiItem(slip) ? `${index + 1}. ` : ""
    const vPrefix = vehicleLabel ? `${vehicleLabel}${i.description ? " — " : ""}` : ""
    return (
      <li
        key={i.id}
        className="flex justify-between items-start gap-6 border-b border-dashed py-1"
      >
        <div className="flex-1 min-w-0 text-justify leading-relaxed">
          {numPrefix || vPrefix ? (
            <div className="flex gap-2 text-justify">
              {numPrefix ? (
                <span className="shrink-0 select-none font-semibold">
                  {numPrefix}
                </span>
              ) : null}
              <div className="flex-1 min-w-0 text-justify">
                {vPrefix ? (
                  <span className="font-semibold text-foreground mr-1.5">
                    {vPrefix}
                  </span>
                ) : null}
                <HangingIndentText text={i.description} />
              </div>
            </div>
          ) : (
            <HangingIndentText text={i.description} />
          )}
        </div>
        <span className="tabular whitespace-nowrap shrink-0 self-start">
          {/* Nilai "limit saja" tidak ikut Total Sum Insured di bawah. */}
          {isLimitOnlyItem(slip.cob, i) ? "Limit " : ""}
          {money(i.amount, slip.currency)}
        </span>
      </li>
    )
  }

  return (
    <>
      <SectionHeading>INTEREST INSURED</SectionHeading>
      {objectSections ? (
        <div className="flex flex-col gap-4 text-[13px]">
          {([1, 2] as const).map((section) => {
            const items = slip.interestItems.filter((i) => itemSection(i) === section)
            if (!items.length) return null
            return (
              <div key={section}>
                <p className="font-semibold">{objectSections[section - 1]}</p>
                <ul className="mt-1 flex flex-col gap-1">
                  {items.map((i) => objectRow(i, slip.interestItems.indexOf(i)))}
                </ul>
              </div>
            )
          })}
        </div>
      ) : isProperty ? (
        <div className="flex flex-col gap-4 text-[13px]">
          {/* Objek tetap dicetak walau teks Interest section kosong; release
              tidak mewajibkan teks itu (temuan SIT 8 November 2026). */}
          {slip.interestSection1 || slip.sumInsuredSection1.length ? (
            <div>
              <p className="font-semibold">Section 1 — Material Damage</p>
              {slip.interestSection1 ? (
                <HangingIndentText
                  text={slip.interestSection1}
                  className="mt-1 leading-relaxed text-muted-foreground text-justify"
                />
              ) : null}
              {sectionList("section1")}
              <p className="mt-1 flex justify-between text-xs font-medium">
                <span>Subtotal Section 1</span>
                <span className="tabular">
                  {money(sumItems(slip.sumInsuredSection1), slip.currency)}
                </span>
              </p>
            </div>
          ) : null}

          {slip.interestSection2 || slip.sumInsuredSection2.length ? (
            <div>
              <p className="font-semibold">Section 2 — Business Interruption</p>
              {slip.interestSection2 ? (
                <HangingIndentText
                  text={slip.interestSection2}
                  className="mt-1 leading-relaxed text-muted-foreground text-justify"
                />
              ) : null}
              {sectionList("section2")}
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

            return objectRow(i, index)
          })}
        </ul>
      )}

      {/* Open cover tidak punya TSI; nilai per deklarasi dicatat di polis. */}
      {usesOpenCover(slip) ? null : (
        <p className="mt-3 flex justify-between rounded bg-primary/8 px-3 py-2 text-[13px] font-semibold text-primary">
          {/* Nilai objek Liability adalah limit, seperti contoh slip LCH. */}
          <span>
            {slip.cob === "Liability" ? "Total Limit of Liability" : "Total Sum Insured"}
          </span>
          <span className="tabular">
            {money(totalSumInsured(slip), slip.currency)}
          </span>
        </p>
      )}
    </>
  )
}

/**
 * Rate slip open cover per kategori, tanpa tabel premi dan Total Payable,
 * seperti CI MOP Rukma Padaya Trans dan container open cover Salam Pacific.
 */
export function OpenCoverRateBlock({ slip }: { slip: PlacingSlip }) {
  const rates = (slip.openCoverRates ?? []).filter((r) => r.label.trim() || r.rate != null)
  return (
    <>
      <SectionHeading>RATE</SectionHeading>
      <table className="w-full text-[12.5px]">
        <tbody>
          {rates.map((r) => (
            <tr key={r.id} className="align-top">
              <td className="py-0.5 pr-2">
                <div className="flex gap-2 text-justify">
                  <span className="shrink-0 select-none">-</span>
                  <span className="flex-1 min-w-0 text-justify">{r.label || "—"}</span>
                </div>
              </td>
              <td className="w-3 py-0.5">:</td>
              <td className="tabular py-0.5 font-medium whitespace-nowrap">
                {openCoverRateText(r, slip.currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-6">
        <InfoTable rows={[["Premium", "As per declaration"]]} />
      </div>
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
      <HangingIndentText
        text={text}
        className="text-[13px] leading-relaxed"
      />
    </>
  )
}

export function DeductibleBlock({ slip }: { slip: PlacingSlip }) {
  // Deductible texts already name their peril, so the cover column is not
  // printed. Covers sharing the same text print it once, each as a "-" bullet
  // like the rate list, with wrapped lines aligned to the text. Grouping per
  // section lives in lib/slip-deductibles, shared with the claim form.
  const groups = deductibleGroups(slip)
  // Kalimat pengantar diketik user, tidak lagi otomatis (permintaan LCH,
  // 6 November 2026).
  const intro = slip.deductibleIntro?.trim()
  if (!groups.length && !intro && !slip.specialConditions) return null

  return (
    <>
      <SectionHeading>DEDUCTIBLE &amp; CONDITIONS</SectionHeading>
      <div className="flex flex-col gap-3 text-[13px]">
        {intro ? <p className="whitespace-pre-line text-justify">{intro}</p> : null}
        {groups.map((g) => (
          <div key={g.heading ?? "deductible"}>
            {g.heading ? (
              <p className="mb-1.5 font-semibold">{g.heading}</p>
            ) : null}
            <ul className="flex flex-col gap-1.5 text-[12.5px]">
              {g.texts.map((text) => (
                <li key={text} className="flex gap-2 text-justify">
                  <span className="shrink-0 select-none" aria-hidden>-</span>
                  <span className="flex-1 min-w-0 whitespace-pre-line text-justify">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {slip.specialConditions ? (
          <div>
            <p className="font-semibold">Special Conditions</p>
            <HangingIndentText
              text={slip.specialConditions}
              className="mt-1 leading-relaxed text-muted-foreground text-[12.5px]"
            />
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
 * lain satu daftar, atau beberapa kelompok berjudul seperti EXTENSIONS dan
 * GENERAL CONDITIONS bila judulnya diisi. Kelompok kosong dilewati. Nomor
 * klausula mulai dari 1 lagi di tiap kelompok (Agus, 5 November 2026).
 */
function clauseGroups(slip: PlacingSlip): ClauseGroup[] {
  const section1 = resolveClauses(
    slip.clauseIds,
    slip.clauseOverrides,
    slip.clauseCopies
  )
  const titles = slipSectionTitles(slip)
  const groups = titles
    ? [
        {
          heading: null,
          clauses: resolveClauses(
            slip.clauseIdsGeneral ?? [],
            slip.clauseOverridesGeneral,
            slip.clauseCopiesGeneral
          ),
        },
        { heading: titles[0], clauses: section1 },
        {
          heading: titles[1],
          clauses: resolveClauses(
            slip.clauseIdsSection2 ?? [],
            slip.clauseOverridesSection2,
            slip.clauseCopiesSection2
          ),
        },
      ]
    : clauseGroupBlocks(slip.clauseIds, slip.clauseGroups).map((b) => ({
        heading: b.title || null,
        clauses: resolveClauses(b.ids, slip.clauseOverrides, slip.clauseCopies),
      }))

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

/**
 * Exclusion slip setelah CLAUSES, seperti CI CGL Orela (a sampai m) dan PL
 * Infiniti (1 sampai 7). Nomor dicetak seperti yang diketik.
 */
export function ExclusionsBlock({ slip }: { slip: PlacingSlip }) {
  const items = exclusionItems(slip.exclusions)
  if (!items.length) return null
  return (
    <>
      <SectionHeading>EXCLUSIONS</SectionHeading>
      <ul className="flex flex-col gap-1 text-[12.5px] leading-relaxed">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-justify">
            {item.marker ? (
              <span className="w-6 shrink-0 select-none">{item.marker}</span>
            ) : null}
            <span className="flex-1 min-w-0 text-justify">{item.text}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

/**
 * Daftar judul klausula sebelum tanda tangan. Wording lengkap dicetak di
 * lampiran CLAUSE WORDINGS setelah tanda tangan, di keempat dokumen slip
 * (Harry, 9 November 2026).
 */
export function ClausesBlock({ slip }: { slip: PlacingSlip }) {
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
              <div className="flex gap-2">
                <span className="shrink-0 select-none">{i + 1}.</span>
                <span className="flex-1 min-w-0 text-left">
                  {clauseTitleCase(c.title)}
                </span>
              </div>
            </li>
          ))
        )}
      </ol>
    </>
  )
}

/**
 * Daftar lampiran slip, misalnya vessel schedule atau daftar unit (analisa
 * contoh slip LCH, Tahap 3 nomor 19). Isinya dikirim terpisah bersama PDF
 * slip; keterangan dicetak, atau nama file bila keterangan kosong.
 */
export function AttachmentList({ slip }: { slip: PlacingSlip }) {
  const list = slip.attachments ?? []
  if (!list.length) return null
  return (
    <section className="avoid-break">
      <SectionHeading>ATTACHMENTS</SectionHeading>
      <ol className="list-decimal pl-5 text-[13px] leading-relaxed">
        {list.map((a) => (
          <li key={a.id} className="text-justify">{a.description || a.fileName}</li>
        ))}
      </ol>
    </section>
  )
}

/**
 * Lampiran daftar peserta PA grup, seperti lampiran Placing Slip PA Salam
 * Pacific (1.627 peserta). Kolom tanpa isi di semua baris tidak dicetak; usia
 * dihitung pada tanggal mulai polis.
 */
export function ParticipantAppendix({ slip }: { slip: PlacingSlip }) {
  const list = slip.participants ?? []
  // Satu peserta sudah tercetak di baris PID / Insured Name.
  if (list.length < 2) return null
  const has = (key: keyof SlipParticipant) => list.some((p) => Boolean(p[key]))
  const ages = list.map((p) => participantAge(p.birthDate, slip.inceptionDate))
  const columns: { header: string; cell: (p: SlipParticipant, i: number) => React.ReactNode; right?: boolean }[] = [
    { header: "Nama", cell: (p) => p.name },
    ...(has("idNumber") ? [{ header: "No. Identitas", cell: (p: SlipParticipant) => p.idNumber }] : []),
    ...(has("workLocation") ? [{ header: "Lokasi Kerja", cell: (p: SlipParticipant) => p.workLocation }] : []),
    ...(has("position") ? [{ header: "Jabatan", cell: (p: SlipParticipant) => p.position }] : []),
    ...(has("level") ? [{ header: "Level Jabatan", cell: (p: SlipParticipant) => p.level }] : []),
    ...(has("birthDate")
      ? [{ header: "Tgl Lahir", cell: (p: SlipParticipant) => participantDateText(p.birthDate) }]
      : []),
    ...(has("gender") ? [{ header: "Jenis Kelamin", cell: (p: SlipParticipant) => p.gender }] : []),
    ...(ages.some((a) => a != null)
      ? [{ header: "Usia", cell: (_: SlipParticipant, i: number) => ages[i] ?? "", right: true }]
      : []),
    ...(has("beneficiary") ? [{ header: "Ahli Waris", cell: (p: SlipParticipant) => p.beneficiary }] : []),
    {
      header: `Sum Insured (${slip.currency || "IDR"})`,
      cell: (p) => num(p.sumInsured, 2),
      right: true,
    },
  ]
  const cell = "py-1 pr-2 align-top"
  return (
    <section className="print-break">
      <SectionHeading>DAFTAR PESERTA</SectionHeading>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="w-10 py-1.5 pr-2 font-semibold">No</th>
            {columns.map((c) => (
              <th key={c.header} className={cn("py-1.5 pr-2 font-semibold", c.right && "text-right")}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map((p, i) => (
            <tr key={p.id} className="avoid-break border-b border-dashed">
              <td className={cn(cell, "tabular")}>{i + 1}</td>
              {columns.map((c) => (
                <td key={c.header} className={cn(cell, c.right && "tabular text-right whitespace-nowrap")}>
                  {c.cell(p, i)}
                </td>
              ))}
            </tr>
          ))}
          <tr className="avoid-break bg-muted/60 font-bold">
            <td colSpan={columns.length} className="px-2 py-1.5">
              Total {list.length.toLocaleString("id-ID")} peserta
            </td>
            <td className="tabular px-2 py-1.5 text-right whitespace-nowrap">
              {num(participantsTotal(list), 2)}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

/** Wording lengkap di akhir dokumen — dipakai Placing Slip dan Quotation Slip. */
export function ClauseWordingAppendix({ slip }: { slip: PlacingSlip }) {
  const groups = clauseGroups(slip)
  if (!groups.length) return null

  return (
    <section className="print-break">
      <SectionHeading>CLAUSE WORDINGS</SectionHeading>
      <div className="flex flex-col gap-3 text-[12px]">
        {groups.map((g, gi) =>
          g.clauses.map((c, i) => (
            <div key={`${gi}-${c.id}`} className="avoid-break">
              {g.heading && i === 0 ? (
                <ClauseGroupHeading first={gi === 0}>
                  {g.heading}
                </ClauseGroupHeading>
              ) : null}
              <div className="flex gap-2">
                <span className="shrink-0 select-none font-semibold text-left">
                  {i + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-left">
                    {c.title}
                  </p>
                  {wordingText(c.wording) ? (
                    <div
                      className="rte-prose mt-0.5 text-[12px] text-muted-foreground text-justify"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.wording) }}
                    />
                  ) : null}
                </div>
              </div>
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
      // Premi flat dicetak "Flat" di kolom rate, seperti contoh slip LCH.
      rate: isFlatLine(slip.cob, l)
        ? "Flat"
        : l.rate !== null
          ? rateText(l.rate)
          : "—",
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
            <td className="py-0.5 pr-2">
              <div className="flex gap-2 text-justify">
                <span className="shrink-0 select-none">-</span>
                <span className="flex-1 min-w-0 text-justify">{line.fullName}</span>
              </div>
            </td>
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

/** Satu baris total di badan dokumen; rinciannya di tabel lampiran. */
function AttachedTotal({ label, value }: { label: string; value: string }) {
  return (
    <p className="mt-3 flex justify-between rounded bg-primary/8 px-3 py-2 text-[13px] font-bold text-primary">
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </p>
  )
}

/**
 * Badan dokumen slip Property multi lokasi: bagian RATE bila semua lokasi
 * memakai rate yang sama (seperti CI SISKA RAHARJA), "As Attached" untuk
 * premi, dan Grand Total. Jadwal premi per lokasi (Opsi B, disetujui Harry 5
 * November 2026) dicetak di lampiran DAFTAR LOKASI (Agus, 9 November 2026).
 */
export function LocationPremiumAttached({ slip }: { slip: PlacingSlip }) {
  const calc = calculateParEqvet(slip)
  const groups = locationGroups(slip)
  const sharedRates = locationsShareRates(slip)
  const first = groups[0]
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
        <InfoTable rows={[[sharedRates ? "Premium" : "Rate & Premium", AS_ATTACHED]]} />
      </div>
      <AttachedTotal
        label={isParEqvetSlip(slip) ? "Grand Total Premium (PAR+EQVET)" : "Total Payable"}
        value={moneyCents(calc.grandTotal, calc.currency)}
      />
    </>
  )
}

/**
 * Jadwal premi per lokasi dan cover, PAR dan EQVET terpisah, lalu Discount,
 * Policy Cost, dan Stamp Duty sebelum Grand Total.
 */
function LocationScheduleTable({ slip }: { slip: PlacingSlip }) {
  const calc = calculateParEqvet(slip)
  const parEqvet = isParEqvetSlip(slip)
  const groups = locationGroups(slip)
  const currency = calc.currency
  const amount = (value: number) => num(value, 2)
  const policies = [calc.par, calc.eqvet].filter((g) => g.subtotal > 0).length
  const discount = roundCents(calc.par.discountAmount + calc.eqvet.discountAmount)
  const sections = [calc.par, calc.eqvet]
    .map((group) => ({ group, rows: scheduleRows(group.lines, groups) }))
    .filter((s) => s.rows.length > 0 || s.group.subtotal > 0)
  const cell = "py-1.5 pr-2 align-top"

  return (
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
                  {/* Slip tanpa baris PAR/EQVET, misalnya Terrorism & Sabotage, satu kelompok saja. */}
                  {parEqvet ? `Premium ${group.name}` : "Premium"}
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
  )
}

/** Judul lampiran tabel: nama tertanggung dan periode, seperti CI Truckindo. */
function AppendixTitle({ slip, title }: { slip: PlacingSlip; title: string }) {
  const [periodLabel, periodText] = slipPeriodRow(slip)
  return (
    <div className="mb-4">
      <SectionHeading>{title}</SectionHeading>
      <p className="text-[12.5px] font-semibold">{slip.insuredName.trim() || "—"}</p>
      <p className="text-[12px] text-muted-foreground">
        {periodLabel}: {periodText.split("\n")[0]}
      </p>
    </div>
  )
}

/**
 * Lampiran DAFTAR LOKASI slip Property multi lokasi: alamat, okupasi, kelas,
 * dan objek per lokasi, lalu jadwal premi per lokasi. Badan dokumen cukup
 * menulis "As Attached" (Agus, 9 November 2026).
 */
export function LocationScheduleAppendix({ slip }: { slip: PlacingSlip }) {
  if (!isMultiLocation(slip)) return null
  const groups = locationGroups(slip)
  const currency = slip.currency || "IDR"
  const amount = (value: number) => num(value, 2)
  const cell = "py-1.5 pr-2 align-top"
  const items = (list: LineItem[]) =>
    list.length ? (
      <ul className="flex flex-col gap-0.5">
        {list.map((i) => (
          <li key={i.id} className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0 text-justify">
              <HangingIndentText text={i.description || "—"} />
            </div>
            <span className="tabular whitespace-nowrap shrink-0 self-start">{amount(i.amount || 0)}</span>
          </li>
        ))}
      </ul>
    ) : (
      "—"
    )
  const hasSection2 = groups.some((g) => g.section2.length > 0)

  return (
    <section className="print-break mt-10">
      <AppendixTitle slip={slip} title="DAFTAR LOKASI" />
      <table className="w-full text-[11.5px]">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="w-10 py-2 pr-2 font-semibold">No</th>
            <th className="py-2 pr-2 font-semibold">Risk Location</th>
            <th className="py-2 pr-2 font-semibold">Occupation / Class</th>
            <th className="py-2 pr-2 font-semibold">Section 1 — Material Damage ({currency})</th>
            {hasSection2 ? (
              <th className="py-2 pr-2 font-semibold">Section 2 — Business Interruption ({currency})</th>
            ) : null}
            <th className="py-2 text-right font-semibold">Sum Insured ({currency})</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.no} className="avoid-break border-b border-dashed">
              <td className={cell}>{g.no}</td>
              <td className={cn(cell, "whitespace-pre-line")}>
                {addressLines(g.location.riskLocation) || "—"}
              </td>
              <td className={cell}>
                {slipOccupationText(g.location) || "—"}
                {g.location.constructionClass ? (
                  <span className="block text-muted-foreground">
                    {constructionClassLabel(g.location.constructionClass)}
                  </span>
                ) : null}
              </td>
              <td className={cell}>{items(g.section1)}</td>
              {hasSection2 ? <td className={cell}>{items(g.section2)}</td> : null}
              <td className="tabular py-1.5 text-right align-top whitespace-nowrap">
                {amount(sumItems(g.section1) + sumItems(g.section2))}
              </td>
            </tr>
          ))}
          <tr className="avoid-break bg-muted/60 font-bold">
            <td colSpan={hasSection2 ? 5 : 4} className="px-2 py-2">
              Total Sum Insured
            </td>
            <td className="tabular px-2 py-2 text-right whitespace-nowrap">
              {amount(totalSumInsured(slip))}
            </td>
          </tr>
        </tbody>
      </table>
      <SectionHeading>PREMIUM CALCULATION</SectionHeading>
      <LocationScheduleTable slip={slip} />
    </section>
  )
}

/**
 * Badan dokumen slip Motor Vehicle multi kendaraan, seperti CI LCH Truckindo
 * dan SBI Fleet: rincian kendaraan "As Attached", lalu Total Sum Insured.
 */
function VehiclesAttachedInterest({ slip }: { slip: PlacingSlip }) {
  return (
    <>
      <SectionHeading>INTEREST INSURED</SectionHeading>
      <InfoTable
        rows={[
          [
            "Object of Insured",
            // Teks berbaris, bukan daftar: InfoTable menomori isi berbentuk array.
            [
              `Merk / Model / Sub Model : ${AS_ATTACHED}`,
              `Type / Year of Built : ${AS_ATTACHED}`,
              `Police No. : ${AS_ATTACHED}`,
              `Chassis No. / Engine No. : ${AS_ATTACHED}`,
              `Colour : ${AS_ATTACHED}`,
            ].join("\n"),
          ],
        ]}
      />
      <p className="mt-3 flex justify-between rounded bg-primary/8 px-3 py-2 text-[13px] font-semibold text-primary">
        <span>Total Sum Insured ({slip.interestItems.length} units)</span>
        <span className="tabular">{money(totalSumInsured(slip), slip.currency)}</span>
      </p>
    </>
  )
}

/** Badan dokumen slip Motor Vehicle multi kendaraan: "As Attached" dan Total Payable. */
export function VehiclePremiumAttached({ slip }: { slip: PlacingSlip }) {
  return (
    <>
      <div className="mt-6">
        <InfoTable rows={[["Rate & Premium", AS_ATTACHED]]} />
      </div>
      <AttachedTotal label="Total Payable" value={moneyCents(totalPayable(slip), slip.currency)} />
    </>
  )
}

/**
 * Lampiran DAFTAR UNIT KENDARAAN: satu baris per kendaraan, isinya sama
 * dengan tabel CI LCH Truckindo (Agus, 9 November 2026). Kolom yang
 * berkaitan ditumpuk supaya muat di A4 portrait: Chrome tetap memakai lebar
 * portrait untuk isi halaman landscape, jadi tabel lebar akan terpotong.
 *
 * Lebar kolom mengikuti isi, dan satu angka tidak pernah dipecah ke dua baris;
 * kolom teks yang menyesuaikan. Dengan lebar persen tetap, Sum Insured
 * 250.000.000 sempat tercetak "250.000.00" dengan "0" di baris berikutnya
 * (temuan SIT-089, 9 November 2026).
 */
export function VehicleScheduleAppendix({ slip }: { slip: PlacingSlip }) {
  if (!isMultiVehicle(slip)) return null
  const { extensionLabels, rows } = vehicleSchedule(slip)
  const currency = slip.currency || "IDR"
  const nowrap = (text: string) => <span className="whitespace-nowrap">{text}</span>
  // Angka bulat tanpa ",00" seperti tabel CI Truckindo, supaya muat di A4 portrait.
  const amount = (value: number) => nowrap(num(value, 0, 2))
  const rate = (value: number | null | undefined) =>
    value == null ? "—" : nowrap(`${rateText(value)}%`)
  const heavy = /heavy/i.test(slip.typeOfCover || "")
  const th = "border px-1 py-1.5 text-left align-bottom font-semibold"
  const td = "border px-1 py-1 align-top"
  const right = "text-right tabular"
  const hasExt = extensionLabels.length > 0
  const hasTpl = rows.some((r) => r.tplLimit || r.tplPremium)
  const hasPa = rows.some((r) => r.paDriverLimit || r.paPassengerLimit)
  const muted = "block text-muted-foreground"

  return (
    <section className="print-break mt-10">
      <AppendixTitle slip={slip} title={heavy ? "DAFTAR UNIT ALAT BERAT" : "DAFTAR UNIT KENDARAAN"} />
      <table className="w-full border-collapse text-[9px] leading-snug">
        <thead className="bg-muted/60">
          <tr>
            <th className={cn(th, "w-6")}>No</th>
            <th className={th}>Merk / Type / Model<span className={muted}>Tahun · Warna · No. Polisi</span></th>
            <th className={th}>No. Rangka<span className={muted}>No. Mesin</span></th>
            <th className={cn(th, "text-right")}>Sum Insured ({currency})</th>
            <th className={th}>Coverage<span className={muted}>Rate · Premi</span></th>
            {hasExt ? <th className={th}>Perluasan<span className={muted}>Rate · Premi</span></th> : null}
            {hasTpl ? <th className={th}>TPL<span className={muted}>Limit · Premi</span></th> : null}
            {hasPa ? <th className={th}>PA<span className={muted}>Limit · Premi</span></th> : null}
            <th className={cn(th, "text-right")}>Total Premi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.no} className="avoid-break">
              <td className={cn(td, "text-center")}>{r.no}</td>
              <td className={td}>
                {r.vehicle.name}
                <span className={muted}>
                  {[r.vehicle.year, r.vehicle.color].filter(Boolean).join(" · ") || "—"}
                </span>
                <span className="block font-medium">{r.vehicle.plate || "—"}</span>
              </td>
              <td className={td}>
                {r.vehicle.chassis || "—"}
                <span className={muted}>{r.vehicle.engine || "—"}</span>
              </td>
              <td className={cn(td, right)}>{amount(r.sumInsured)}</td>
              <td className={td}>
                {r.coverage?.label ?? "—"}
                {r.coverage ? (
                  <span className={muted}>
                    {rate(r.coverage.rate)} · {amount(r.coverage.premium)}
                  </span>
                ) : null}
              </td>
              {hasExt ? (
                <td className={td}>
                  {extensionLabels
                    .filter((l) => r.extensions[l])
                    .map((l) => (
                      <span key={l} className="block">
                        {extensionShort(l)} {rate(r.extensions[l].rate)} · {amount(r.extensions[l].premium)}
                      </span>
                    ))}
                </td>
              ) : null}
              {hasTpl ? (
                <td className={td}>
                  {r.tplLimit || r.tplPremium ? (
                    <>
                      {amount(r.tplLimit)}
                      <span className={muted}>{amount(r.tplPremium)}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              ) : null}
              {hasPa ? (
                <td className={td}>
                  {r.paDriverLimit ? (
                    <span className="block">
                      Driver {amount(r.paDriverLimit)}
                      <span className={muted}>{amount(r.paDriverPremium)}</span>
                    </span>
                  ) : null}
                  {r.paPassengerLimit ? (
                    <span className="block">
                      Penumpang {amount(r.paPassengerLimit)}
                      <span className={muted}>{amount(r.paPassengerPremium)}</span>
                    </span>
                  ) : null}
                  {!r.paDriverLimit && !r.paPassengerLimit ? "—" : null}
                </td>
              ) : null}
              <td className={cn(td, right, "font-semibold")}>{amount(r.total)}</td>
            </tr>
          ))}
          <tr className="avoid-break font-bold">
            <td colSpan={3} className={cn(td, "text-right")}>Total</td>
            <td className={cn(td, right)}>{amount(rows.reduce((a, r) => a + r.sumInsured, 0))}</td>
            <td colSpan={1 + (hasExt ? 1 : 0) + (hasTpl ? 1 : 0) + (hasPa ? 1 : 0)} className={td} />
            <td className={cn(td, right)}>{amount(totalPremium(slip))}</td>
          </tr>
        </tbody>
      </table>
      <table className="mt-3 ml-auto w-72 text-[11px]">
        <tbody>
          <tr className="border-b">
            <td className="py-1">Total Premium</td>
            <td className="tabular py-1 text-right">{moneyCents(totalPremium(slip), currency)}</td>
          </tr>
          {slip.discountPct ? (
            <tr className="border-b">
              <td className="py-1">Discount ({num(slip.discountPct, 2)}%)</td>
              <td className="tabular py-1 text-right">({moneyCents(discountAmount(slip), currency)})</td>
            </tr>
          ) : null}
          {slip.adminCost ? (
            <tr className="border-b">
              <td className="py-1">Admin Cost</td>
              <td className="tabular py-1 text-right">{moneyCents(slip.adminCost, currency)}</td>
            </tr>
          ) : null}
          {slip.stampDuty ? (
            <tr className="border-b">
              <td className="py-1">Stamp Duty</td>
              <td className="tabular py-1 text-right">{moneyCents(slip.stampDuty, currency)}</td>
            </tr>
          ) : null}
          <tr className="font-bold">
            <td className="py-1">Total Payable</td>
            <td className="tabular py-1 text-right">{moneyCents(totalPayable(slip), currency)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

/** Uraian objek di jadwal premi: baris pertamanya saja, karena uraian lengkap sudah dicetak di INTEREST INSURED. */
function objectName(group: ItemGroup) {
  return group.item.description.split("\n")[0].trim() || `Objek ${group.no}`
}

/**
 * Rate & premium slip multi objek COB selain Property dan Motor Vehicle
 * (Agus, 5 November 2026), misalnya peserta PA atau unit MB dan CPM: satu
 * baris per objek dengan nilai, rate, dan preminya, lalu Total Premium. Objek
 * dengan beberapa cover mendapat satu baris per cover dengan nama covernya.
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
            // Satu baris per cover objek, misalnya ICC "A" dan War; objek
            // limit saja tidak berpremi, jadi cukup satu baris.
            const limit = isLimitOnlyItem(slip.cob, g.item)
            const lines: (RateLine | null)[] = g.rateLines.length
              ? limit
                ? g.rateLines.slice(0, 1)
                : g.rateLines
              : [null]
            const multi = lines.length > 1
            return lines.map((l, i) => (
              <tr key={l?.id ?? g.item.id} className="avoid-break border-b border-dashed">
                <td className={cell}>{i === 0 ? g.no : ""}</td>
                <td className={cell}>
                  {i === 0 ? (
                    <span className="line-clamp-2">{objectName(g)}</span>
                  ) : null}
                  {multi && l ? (
                    <span className="block text-muted-foreground">
                      {coverLabel(slip, l)}
                    </span>
                  ) : null}
                </td>
                <td className={cn(cell, "tabular text-right whitespace-nowrap")}>
                  {i === 0 ? amount(g.item.amount || 0) : ""}
                </td>
                <td className={cn(cell, "tabular text-right whitespace-nowrap")}>
                  {isLimitOnlyItem(slip.cob, g.item)
                    ? "Limit"
                    : l && isFlatLine(slip.cob, l)
                      ? "Flat"
                      : l?.rate != null
                        ? `${rateText(l.rate)}%`
                        : "—"}
                </td>
                <td className="tabular py-1.5 text-right align-top whitespace-nowrap">
                  {isLimitOnlyItem(slip.cob, g.item) ? "—" : amount(l?.premium ?? 0)}
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
  company = "PT. LCH Insurance Brokers",
}: {
  place: string
  confirmationTitle?: string
  confirmationParty?: string
  /** Nama broker penanda tangan, mengikuti kop dokumen. */
  company?: string
}) {
  return (
    <div className="avoid-break mt-10 grid grid-cols-1 gap-8 text-[13px] sm:grid-cols-2">
      <div>
        <p className="mb-1">{place}</p>
        <p className="mb-14 text-muted-foreground">
          Disiapkan oleh / Prepared by,
        </p>
        <p className="border-t pt-1 font-bold">{company}</p>
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
 * Tanda tangan Draft Cover Note mengikuti contoh CN LCH (Agus, 9 November
 * 2026; CN 728 co-insurance dan CN 743 satu asuransi): judul SIGNED, tempat
 * dan tanggal tepat di bawahnya, lalu satu blok per asuransi berisi nama,
 * ruang tanda tangan, dan "( …… )". Co-insurance dicetak kiri-kanan sesuai
 * urutan panel dengan "(25% share as Leader)" di bawah nama; satu asuransi
 * cukup namanya, karena share 100% sudah tertulis di SECURITY.
 *
 * Cover Note ditandatangani bersama semua asuransi. Closing Instruction tidak:
 * dokumen itu dikirim ke masing-masing asuransi, jadi cukup satu kolom
 * penerimaan di sebelah blok LCH.
 */
export function CoverNoteSignature({
  slip,
  place,
}: {
  slip: PlacingSlip
  place: string
}) {
  const panel = (slip.securityPanel ?? []).filter((p) => p.insurer)
  const shared = panel.length > 1
  return (
    <div className="mt-8 text-[13px]">
      {/* Judul dan tanggal tidak terpisah halaman dari baris pertama blok. */}
      <div className="break-after-avoid">
        <SectionHeading>SIGNED</SectionHeading>
        <p>{place}</p>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2">
        {panel.length ? (
          panel.map((p) => (
            <CoverNoteSignatory key={p.id} party={p} shared={shared} />
          ))
        ) : (
          <CoverNoteSignatory />
        )}
      </div>
    </div>
  )
}

/** Nama asuransi di blok tanda tangan: huruf besar seperti contoh CN, kecuali "Tbk". */
function signatoryName(insurer: string) {
  return insurer.toUpperCase().replace(/\bTBK\b/g, "Tbk")
}

function CoverNoteSignatory({
  party,
  shared,
}: {
  party?: SecurityPanelRow
  /** Co-insurance: share dan peran dicetak di bawah nama. */
  shared?: boolean
}) {
  return (
    <div className="avoid-break">
      {party ? (
        <p className="font-bold">{signatoryName(party.insurer)}</p>
      ) : (
        <p className="font-bold text-muted-foreground">Nama Perusahaan Asuransi</p>
      )}
      {party && shared ? (
        <p className="text-xs italic">
          ({num(party.share, 0, 2)}% share {party.role.replace(/^As /, "as ")})
        </p>
      ) : null}
      <div className="h-16" />
      <p>( …………………………………… )</p>
    </div>
  )
}

/**
 * Security tanpa judul kolom (LCH, 3 November 2026). Satu asuransi berarti
 * share 100% tanpa leader atau member, jadi cukup namanya; share dan As Leader
 * / As Member baru dicetak kalau asuransinya lebih dari satu.
 */
/**
 * Security dari panel asuransi, di Quotation, Cover Note, dan Closing
 * Instruction. Share selalu dicetak; Leader atau Member hanya bila asuransinya
 * lebih dari satu, jadi satu asuransi 100% tercetak tanpa peran (Harry, 6
 * November 2026).
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
              <td className="tabular w-24 py-2 pr-6 text-right">
                {num(p.share, 2)}%
              </td>
              {shared ? <td className="w-28 py-2">{p.role}</td> : null}
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
              {/* Open cover: nominal brokerage baru ada per deklarasi. */}
              {usesOpenCover(slip) ? "" : moneyCents(brokerageAmount(slip), slip.currency)}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  )
}
