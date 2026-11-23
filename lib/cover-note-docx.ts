/**
 * Generator dokumen Word (.docx) untuk Draft Cover Note.
 * Menghasilkan file OpenXML (.docx) standar yang dapat dibuka di Microsoft Word
 * tanpa peringatan keamanan atau format tidak cocok.
 */

import {
  AlignmentType,
  BorderStyle,
  convertMillimetersToTwip,
  Document,
  Footer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx"

import {
  calculateParEqvet,
  discountAmount,
  isParEqvetSlip,
  totalPremium,
  totalSumInsured,
} from "@/lib/calc"
import { clauseTitleCase } from "@/lib/data/clauses"
import { constructionClassLabel } from "@/lib/data/reference"
import type { PlacingSlip } from "@/lib/data"
import { slipDocumentDate } from "@/lib/document-dates"
import { dateEn, money, moneyCents, num } from "@/lib/format"
import { isMultiYearMotor } from "@/lib/multi-year"
import { usesOpenCover } from "@/lib/open-cover"
import { deductibleGroups, deductiblesByUnit } from "@/lib/slip-deductibles"
import {
  isBusinessLabel,
  isExistingPolicyLabel,
  printedDetailRows,
} from "@/lib/slip-details"
import { isFlatLine, isLimitOnlyItem, itemSection } from "@/lib/slip-items"
import {
  addressLines,
  isFloatingSumInsured,
  isMultiLocation,
  locationGroups,
  locationInsuredName,
  slipLocations,
} from "@/lib/slip-locations"
import { participantPidText, usesParticipants } from "@/lib/slip-participants"
import { AS_ATTACHED } from "@/lib/slip-schedule"
import { isMultiVehicle } from "@/lib/slip-vehicles"
import { clauseGroups } from "@/components/documents/doc-blocks"
import {
  coverLabel,
  exclusionItems,
  slipOccupationText,
  slipPeriodRow,
  slipSectionTitles,
  usesPropertyBlocks,
} from "@/components/underwriting/slip-model"

const FONT_FAMILY = "Arial"
const FONT_SIZE_TITLE = 28 // 14pt
const FONT_SIZE_HEADING = 21 // 10.5pt
const FONT_SIZE_BODY = 19 // 9.5pt
const FONT_SIZE_SMALL = 17 // 8.5pt

const COLOR_NAVY = "1E3A8A"
const COLOR_MUTED = "4B5563"
const COLOR_BORDER = "E5E7EB"
const COLOR_HEADER_BG = "F3F4F6"

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "auto" }
const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
}

const VEHICLE_ATTACHED_FIELDS = [
  "Merk / Model / Sub Model",
  "Type / Year of Built",
  "Police No.",
  "Chassis No. / Engine No.",
  "Colour",
] as const

export function coverNoteFilename(slip: PlacingSlip): string {
  const clean = (slip.insuredName || "draft")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
  return `cover-note-${clean || "draft"}.docx`
}

function createSectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    keepNext: true,
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 8,
        color: COLOR_NAVY,
        space: 4,
      },
    },
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        size: FONT_SIZE_HEADING,
        color: COLOR_NAVY,
        font: FONT_FAMILY,
      }),
    ],
  })
}

function createTextParagraph(
  text: string,
  options?: {
    bold?: boolean
    size?: number
    color?: string
    align?: (typeof AlignmentType)[keyof typeof AlignmentType]
    before?: number
    after?: number
    keepNext?: boolean
  }
): Paragraph {
  return new Paragraph({
    alignment: options?.align ?? AlignmentType.LEFT,
    spacing: {
      before: options?.before ?? 0,
      after: options?.after ?? 80,
    },
    keepNext: options?.keepNext ?? false,
    children: [
      new TextRun({
        text,
        bold: options?.bold ?? false,
        size: options?.size ?? FONT_SIZE_BODY,
        color: options?.color,
        font: FONT_FAMILY,
      }),
    ],
  })
}

function createDetailTable(slip: PlacingSlip): Table {
  const period = slipPeriodRow(slip)
  const covers = [
    slip.typeOfCover && (slip.typeOfCoverLabel?.trim() || slip.typeOfCover),
    slip.typeOfCover2 && (slip.typeOfCover2Label?.trim() || slip.typeOfCover2),
  ].filter(Boolean)

  const rows: Array<{ label: string; value: string; isVehicleAttached?: boolean }> = [
    {
      label: "Type of Cover",
      value:
        covers.length > 1
          ? covers.map((c) => `- ${c}`).join("\n")
          : covers[0] || "—",
    },
  ]

  const wordingForms = slip.wordingForms.filter(Boolean)
  if (wordingForms.length) {
    rows.push({
      label: "Wording Form",
      value:
        wordingForms.length > 1
          ? wordingForms.map((w) => `- ${w}`).join("\n")
          : wordingForms[0],
    })
  }

  const details = printedDetailRows(slip.detailRows)
  const existing = details.find((r) => isExistingPolicyLabel(r.label))
  const business = details.filter((r) => isBusinessLabel(r.label))

  rows.push(
    {
      label: "Insured Name",
      value: [slip.insuredName.trim() || "—", slip.insuredDescription?.trim()]
        .filter(Boolean)
        .join("\n"),
    },
    {
      label: "Correspondence Address",
      value: slip.correspondenceAddress || "—",
    },
    ...business.map((r) => ({ label: r.label, value: r.value })),
    {
      label: period[0],
      value: Array.isArray(period[1]) ? period[1].join("\n") : String(period[1]),
    }
  )

  if (usesParticipants(slip.cob) && slip.participants?.length === 1) {
    rows.push({
      label: "PID / Insured Name",
      value: participantPidText(slip.participants[0]),
    })
  }

  if (isMultiLocation(slip)) {
    const groups = locationGroups(slip)
    rows.push({
      label: "Risk(s) Location",
      value: `${AS_ATTACHED} (${groups.length} locations)`,
    })
  } else if (isFloatingSumInsured(slip) && locationGroups(slip).length > 1) {
    const groups = locationGroups(slip)
    const occ = slipOccupationText(slip)
    if (occ) rows.push({ label: "Occupation", value: occ })
    const locLines = groups.map((g, i) => `${i + 1}. ${g.location.riskLocation || "—"}`).join("\n")
    rows.push({ label: "Risk Location", value: locLines })
  } else {
    const occupation = slipOccupationText(slip)
    if (occupation) rows.push({ label: "Occupation", value: occupation })

    const insured =
      slip.cob === "Property"
        ? locationInsuredName(slipLocations(slip)[0], slip.insuredName)
        : ""
    const location = [insured, addressLines(slip.riskLocation ?? "")]
      .filter(Boolean)
      .join("\n")
    if (location) rows.push({ label: "Risk Location", value: location })

    if (slip.cob === "Property" && slip.constructionClass) {
      rows.push({
        label: "Construction Class",
        value: constructionClassLabel(slip.constructionClass),
      })
    }
  }

  if (slip.cob === "Property" && slip.indemnityPeriod) {
    rows.push({
      label: "Indemnity Period",
      value: slip.indemnityPeriod,
    })
  }

  for (const r of details) {
    if (r !== existing && !business.includes(r)) {
      rows.push({ label: r.label || "—", value: r.value })
    }
  }

  if (isMultiVehicle(slip)) {
    rows.push({
      label: "Object of Insured",
      value: "",
      isVehicleAttached: true,
    })
  }

  const tableRows: TableRow[] = []

  for (const r of rows) {
    let valueChildren: Paragraph[]
    if (r.isVehicleAttached) {
      valueChildren = VEHICLE_ATTACHED_FIELDS.map((field) => {
        return new Paragraph({
          spacing: { before: 20, after: 20 },
          children: [
            new TextRun({ text: field, font: FONT_FAMILY, size: FONT_SIZE_BODY }),
            new TextRun({ text: " : ", font: FONT_FAMILY, size: FONT_SIZE_BODY }),
            new TextRun({ text: AS_ATTACHED, font: FONT_FAMILY, size: FONT_SIZE_BODY }),
          ],
        })
      })
    } else {
      const lines = r.value.split("\n")
      valueChildren = lines.map(
        (line, idx) =>
          new Paragraph({
            spacing: { before: idx === 0 ? 0 : 20, after: 20 },
            children: [
              new TextRun({
                text: line,
                font: FONT_FAMILY,
                size: FONT_SIZE_BODY,
              }),
            ],
          })
      )
    }

    tableRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: convertMillimetersToTwip(38), type: WidthType.DXA },
            borders: NO_BORDERS,
            children: [
              new Paragraph({
                spacing: { after: 20 },
                children: [
                  new TextRun({
                    text: r.label,
                    font: FONT_FAMILY,
                    size: FONT_SIZE_BODY,
                    color: COLOR_MUTED,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: convertMillimetersToTwip(5), type: WidthType.DXA },
            borders: NO_BORDERS,
            children: [
              new Paragraph({
                spacing: { after: 20 },
                children: [
                  new TextRun({
                    text: ":",
                    font: FONT_FAMILY,
                    size: FONT_SIZE_BODY,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: convertMillimetersToTwip(147), type: WidthType.DXA },
            borders: NO_BORDERS,
            children: valueChildren,
          }),
        ],
      })
    )
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: tableRows,
  })
}

function createInterestSection(slip: PlacingSlip): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [createSectionHeading("INTEREST INSURED")]
  const total = totalSumInsured(slip)

  if (isMultiVehicle(slip)) {
    const vehicleTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      rows: VEHICLE_ATTACHED_FIELDS.map(
        (field) =>
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: convertMillimetersToTwip(50), type: WidthType.DXA },
                borders: NO_BORDERS,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: field, font: FONT_FAMILY, size: FONT_SIZE_BODY }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: convertMillimetersToTwip(5), type: WidthType.DXA },
                borders: NO_BORDERS,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: ":", font: FONT_FAMILY, size: FONT_SIZE_BODY })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: convertMillimetersToTwip(135), type: WidthType.DXA },
                borders: NO_BORDERS,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: AS_ATTACHED, font: FONT_FAMILY, size: FONT_SIZE_BODY }),
                    ],
                  }),
                ],
              }),
            ],
          })
      ),
    })
    elements.push(vehicleTable)

    elements.push(
      new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [
          new TextRun({
            text: `Total Sum Insured : ${money(total, slip.currency)}`,
            bold: true,
            font: FONT_FAMILY,
            size: FONT_SIZE_BODY,
          }),
        ],
      })
    )
    return elements
  }

  const isProperty = slip.cob === "Property"
  const multi = isMultiLocation(slip)

  if (isProperty) {
    if (slip.interestSection1 || slip.sumInsuredSection1.length) {
      elements.push(
        createTextParagraph("Section 1 — Material Damage", {
          bold: true,
          before: 80,
          after: 40,
          keepNext: true,
        })
      )
      if (slip.interestSection1) {
        elements.push(
          createTextParagraph(slip.interestSection1, {
            after: 80,
            align: AlignmentType.JUSTIFIED,
          })
        )
      }
      if (multi) {
        elements.push(createTextParagraph(AS_ATTACHED, { bold: true, after: 80 }))
      } else if (slip.sumInsuredSection1.length) {
        const itemRows = slip.sumInsuredSection1.map(
          (item) =>
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  width: { size: 75, type: WidthType.PERCENTAGE },
                  borders: NO_BORDERS,
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: item.description,
                          font: FONT_FAMILY,
                          size: FONT_SIZE_BODY,
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 25, type: WidthType.PERCENTAGE },
                  borders: NO_BORDERS,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [
                        new TextRun({
                          text: money(item.amount, slip.currency),
                          font: FONT_FAMILY,
                          size: FONT_SIZE_BODY,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            })
        )
        elements.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            rows: itemRows,
          })
        )
      }
    }

    if (slip.interestSection2 || slip.sumInsuredSection2.length) {
      elements.push(
        createTextParagraph("Section 2 — Business Interruption", {
          bold: true,
          before: 120,
          after: 40,
          keepNext: true,
        })
      )
      if (slip.interestSection2) {
        elements.push(
          createTextParagraph(slip.interestSection2, {
            after: 80,
            align: AlignmentType.JUSTIFIED,
          })
        )
      }
      if (multi) {
        elements.push(createTextParagraph(AS_ATTACHED, { bold: true, after: 80 }))
      } else if (slip.sumInsuredSection2.length) {
        const itemRows = slip.sumInsuredSection2.map(
          (item) =>
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  width: { size: 75, type: WidthType.PERCENTAGE },
                  borders: NO_BORDERS,
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: item.description,
                          font: FONT_FAMILY,
                          size: FONT_SIZE_BODY,
                        }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 25, type: WidthType.PERCENTAGE },
                  borders: NO_BORDERS,
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [
                        new TextRun({
                          text: money(item.amount, slip.currency),
                          font: FONT_FAMILY,
                          size: FONT_SIZE_BODY,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            })
        )
        elements.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: NO_BORDERS,
            rows: itemRows,
          })
        )
      }
    }

    elements.push(
      new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [
          new TextRun({
            text: `TOTAL SUM INSURED : ${money(total, slip.currency)}`,
            bold: true,
            font: FONT_FAMILY,
            size: FONT_SIZE_BODY,
          }),
        ],
      })
    )
    return elements
  }

  // COB selain Property dan Motor Vehicle multi
  const objectSections = slipSectionTitles(slip)
  if (objectSections) {
    for (const section of [1, 2] as const) {
      const items = slip.interestItems.filter((i) => itemSection(i) === section)
      if (!items.length) continue
      elements.push(
        createTextParagraph(objectSections[section - 1], {
          bold: true,
          before: 80,
          after: 40,
          keepNext: true,
        })
      )
      const itemRows = items.map(
        (item) =>
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 75, type: WidthType.PERCENTAGE },
                borders: NO_BORDERS,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: item.description,
                        font: FONT_FAMILY,
                        size: FONT_SIZE_BODY,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                borders: NO_BORDERS,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: `${isLimitOnlyItem(slip.cob, item) ? "Limit " : ""}${money(item.amount, slip.currency)}`,
                        font: FONT_FAMILY,
                        size: FONT_SIZE_BODY,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
      )
      elements.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: NO_BORDERS,
          rows: itemRows,
        })
      )
    }
  } else if (slip.interestItems.length) {
    const itemRows = slip.interestItems.map(
      (item) =>
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              borders: NO_BORDERS,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: item.description,
                      font: FONT_FAMILY,
                      size: FONT_SIZE_BODY,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              borders: NO_BORDERS,
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: `${isLimitOnlyItem(slip.cob, item) ? "Limit " : ""}${money(item.amount, slip.currency)}`,
                      font: FONT_FAMILY,
                      size: FONT_SIZE_BODY,
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
    )
    elements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows: itemRows,
      })
    )
  }

  elements.push(
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [
        new TextRun({
          text: `Total Sum Insured : ${money(total, slip.currency)}`,
          bold: true,
          font: FONT_FAMILY,
          size: FONT_SIZE_BODY,
        }),
      ],
    })
  )

  return elements
}

function createDeductiblesSection(slip: PlacingSlip): (Paragraph | Table)[] {
  const groups = deductibleGroups(slip)
  const intro = slip.deductibleIntro?.trim()
  if (!groups.length && !intro && !slip.specialConditions) return []

  const elements: (Paragraph | Table)[] = [
    createSectionHeading("DEDUCTIBLE & CONDITIONS"),
  ]

  if (intro) {
    elements.push(createTextParagraph(intro, { after: 60, align: AlignmentType.JUSTIFIED }))
  }

  for (const block of deductiblesByUnit(groups)) {
    if (block.unit) {
      elements.push(
        createTextParagraph(block.unit, { bold: true, before: 60, after: 20, keepNext: true })
      )
    }
    for (const g of block.groups) {
      if (g.heading) {
        elements.push(
          createTextParagraph(g.heading, {
            bold: true,
            before: 40,
            after: 20,
            color: COLOR_MUTED,
            keepNext: true,
          })
        )
      }
      for (const text of g.texts) {
        elements.push(
          new Paragraph({
            spacing: { before: 20, after: 40 },
            bullet: { level: 0 },
            children: [
              new TextRun({
                text,
                font: FONT_FAMILY,
                size: FONT_SIZE_BODY,
              }),
            ],
          })
        )
      }
    }
  }

  if (slip.specialConditions) {
    elements.push(
      createTextParagraph("Special Conditions", {
        bold: true,
        before: 60,
        after: 20,
        keepNext: true,
      })
    )
    elements.push(
      createTextParagraph(slip.specialConditions, {
        after: 60,
        align: AlignmentType.JUSTIFIED,
      })
    )
  }

  return elements
}

function createClausesSection(slip: PlacingSlip): Paragraph[] {
  const groups = clauseGroups(slip)
  if (!groups.length) return []

  const elements: Paragraph[] = [createSectionHeading("CLAUSES")]

  for (const g of groups) {
    if (g.heading) {
      elements.push(
        createTextParagraph(g.heading, {
          bold: true,
          before: 80,
          after: 30,
          color: COLOR_MUTED,
          keepNext: true,
        })
      )
    }
    g.clauses.forEach((c, i) => {
      elements.push(
        new Paragraph({
          spacing: { before: 20, after: 30 },
          children: [
            new TextRun({
              text: `${i + 1}. `,
              bold: true,
              font: FONT_FAMILY,
              size: FONT_SIZE_BODY,
            }),
            new TextRun({
              text: clauseTitleCase(c.title),
              font: FONT_FAMILY,
              size: FONT_SIZE_BODY,
            }),
          ],
        })
      )
    })
  }

  return elements
}

function createExclusionsSection(slip: PlacingSlip): Paragraph[] {
  const items = exclusionItems(slip.exclusions)
  if (!items.length) return []

  const elements: Paragraph[] = [createSectionHeading("EXCLUSIONS")]
  for (const item of items) {
    elements.push(
      new Paragraph({
        spacing: { before: 20, after: 40 },
        bullet: { level: 0 },
        children: [
          new TextRun({
            text: item.text,
            font: FONT_FAMILY,
            size: FONT_SIZE_BODY,
          }),
        ],
      })
    )
  }
  return elements
}

function createPremiumSection(slip: PlacingSlip): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [createSectionHeading("PREMIUM CALCULATION")]

  if (usesOpenCover(slip)) {
    elements.push(createTextParagraph("Open Cover: premi per deklarasi pengiriman.", { after: 60 }))
    return elements
  }

  if (isMultiLocation(slip) || isMultiVehicle(slip) || isMultiYearMotor(slip)) {
    elements.push(
      createTextParagraph(
        `${AS_ATTACHED} (rincian jadwal premi tercantum pada lampiran).`,
        { bold: true, after: 60 }
      )
    )
    return elements
  }

  if (isParEqvetSlip(slip)) {
    const calc = calculateParEqvet(slip)
    const currency = slip.currency || "IDR"
    const tableBorderBottom = {
      style: BorderStyle.SINGLE,
      size: 4,
      color: COLOR_BORDER,
    }
    const rowBorders = {
      top: NO_BORDER,
      bottom: tableBorderBottom,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    }

    const rows: TableRow[] = [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: COLOR_HEADER_BG },
            borders: rowBorders,
            children: [createTextParagraph("Peril / Group", { bold: true })],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: COLOR_HEADER_BG },
            borders: rowBorders,
            children: [createTextParagraph("Rate / Formula", { bold: true })],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: COLOR_HEADER_BG },
            borders: rowBorders,
            children: [
              createTextParagraph(`Premium (${currency})`, {
                bold: true,
                align: AlignmentType.RIGHT,
              }),
            ],
          }),
        ],
      }),
    ]

    for (const group of [calc.par, calc.eqvet]) {
      if (!group.lines.length) continue
      for (const line of group.lines) {
        rows.push(
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                borders: rowBorders,
                children: [createTextParagraph(line.fullName)],
              }),
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                borders: rowBorders,
                children: [createTextParagraph(line.rateText)],
              }),
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                borders: rowBorders,
                children: [
                  createTextParagraph(moneyCents(line.premium, currency), {
                    align: AlignmentType.RIGHT,
                  }),
                ],
              }),
            ],
          })
        )
      }
      rows.push(
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              borders: rowBorders,
              children: [createTextParagraph(`Subtotal Premium ${group.name}`, { bold: true })],
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              borders: rowBorders,
              children: [
                createTextParagraph(moneyCents(group.subtotal, currency), {
                  bold: true,
                  align: AlignmentType.RIGHT,
                }),
              ],
            }),
          ],
        })
      )
    }

    // Grand total
    rows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 70, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: COLOR_HEADER_BG },
            borders: rowBorders,
            children: [createTextParagraph("GRAND TOTAL PREMIUM", { bold: true })],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: COLOR_HEADER_BG },
            borders: rowBorders,
            children: [
              createTextParagraph(moneyCents(totalPremium(slip), currency), {
                bold: true,
                align: AlignmentType.RIGHT,
              }),
            ],
          }),
        ],
      })
    )

    elements.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        rows,
      })
    )
    return elements
  }

  // COB umum / Rate Lines
  const currency = slip.currency || "IDR"
  const tableBorderBottom = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: COLOR_BORDER,
  }
  const rowBorders = {
    top: NO_BORDER,
    bottom: tableBorderBottom,
    left: NO_BORDER,
    right: NO_BORDER,
    insideHorizontal: NO_BORDER,
    insideVertical: NO_BORDER,
  }

  const rows: TableRow[] = [
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: COLOR_HEADER_BG },
          borders: rowBorders,
          children: [createTextParagraph("Peril / Cover", { bold: true })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: COLOR_HEADER_BG },
          borders: rowBorders,
          children: [createTextParagraph("Rate", { bold: true })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: COLOR_HEADER_BG },
          borders: rowBorders,
          children: [
            createTextParagraph(`Premium (${currency})`, {
              bold: true,
              align: AlignmentType.RIGHT,
            }),
          ],
        }),
      ],
    }),
  ]

  const activeLines = (slip.rateLines || []).filter(
    (l) => l.rate !== null || l.premium > 0
  )
  for (const l of activeLines) {
    rows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: rowBorders,
            children: [createTextParagraph(coverLabel(slip, l))],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: rowBorders,
            children: [
              createTextParagraph(
                isFlatLine(slip.cob, l)
                  ? "Flat"
                  : l.rate !== null
                    ? `${num(l.rate, 2, 6)}%`
                    : "—"
              ),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: rowBorders,
            children: [
              createTextParagraph(moneyCents(l.premium, currency), {
                align: AlignmentType.RIGHT,
              }),
            ],
          }),
        ],
      })
    )
  }

  const discount = discountAmount(slip)
  if (discount > 0) {
    rows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 75, type: WidthType.PERCENTAGE },
            borders: rowBorders,
            children: [
              createTextParagraph(`Discount (${num(slip.discountPct || 0, 2)}%)`, {
                color: COLOR_MUTED,
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: rowBorders,
            children: [
              createTextParagraph(`(${moneyCents(discount, currency)})`, {
                align: AlignmentType.RIGHT,
                color: COLOR_MUTED,
              }),
            ],
          }),
        ],
      })
    )
  }

  rows.push(
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 75, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: COLOR_HEADER_BG },
          borders: rowBorders,
          children: [createTextParagraph("TOTAL PREMIUM", { bold: true })],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: COLOR_HEADER_BG },
          borders: rowBorders,
          children: [
            createTextParagraph(moneyCents(totalPremium(slip) - discount, currency), {
              bold: true,
              align: AlignmentType.RIGHT,
            }),
          ],
        }),
      ],
    })
  )

  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      rows,
    })
  )

  return elements
}

function createSecuritySection(slip: PlacingSlip): (Paragraph | Table)[] {
  const panel = (slip.securityPanel ?? []).filter((p) => p.insurer)
  if (!panel.length) return []

  const elements: (Paragraph | Table)[] = [createSectionHeading("SECURITY")]

  const tableBorderBottom = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: COLOR_BORDER,
  }
  const rowBorders = {
    top: NO_BORDER,
    bottom: tableBorderBottom,
    left: NO_BORDER,
    right: NO_BORDER,
    insideHorizontal: NO_BORDER,
    insideVertical: NO_BORDER,
  }

  const rows: TableRow[] = [
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 55, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: COLOR_HEADER_BG },
          borders: rowBorders,
          children: [createTextParagraph("Insurer Name", { bold: true })],
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: COLOR_HEADER_BG },
          borders: rowBorders,
          children: [
            createTextParagraph("Share", { bold: true, align: AlignmentType.RIGHT }),
          ],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: COLOR_HEADER_BG },
          borders: rowBorders,
          children: [createTextParagraph("Role / Status", { bold: true })],
        }),
      ],
    }),
  ]

  let totalShare = 0
  for (const p of panel) {
    totalShare += Number(p.share || 0)
    rows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: rowBorders,
            children: [createTextParagraph(p.insurer)],
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            borders: rowBorders,
            children: [
              createTextParagraph(`${num(p.share, 0, 2)}%`, {
                align: AlignmentType.RIGHT,
              }),
            ],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: rowBorders,
            children: [createTextParagraph(p.role || "—")],
          }),
        ],
      })
    )
  }

  rows.push(
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 55, type: WidthType.PERCENTAGE },
          borders: rowBorders,
          children: [createTextParagraph("Total Share", { bold: true })],
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          borders: rowBorders,
          children: [
            createTextParagraph(`${num(totalShare, 0, 2)}%`, {
              bold: true,
              align: AlignmentType.RIGHT,
            }),
          ],
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          borders: rowBorders,
          children: [createTextParagraph("")],
        }),
      ],
    })
  )

  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      rows,
    })
  )

  return elements
}

function createSignatureSection(slip: PlacingSlip): (Paragraph | Table)[] {
  const date = slipDocumentDate(slip, "coverNote")
  const panel = (slip.securityPanel ?? []).filter((p) => p.insurer)
  const shared = panel.length > 1

  const elements: (Paragraph | Table)[] = [
    createSectionHeading("SIGNED"),
    createTextParagraph(`Jakarta, ${dateEn(date)}`, { after: 120 }),
  ]

  const signatories = panel.length
    ? panel
    : [{ id: "placeholder", insurer: "Nama Perusahaan Asuransi", share: 100, role: "" }]

  const sigCells: TableCell[] = signatories.map((p) => {
    return new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      children: [
        createTextParagraph(p.insurer.toUpperCase().replace(/\bTBK\b/g, "Tbk"), {
          bold: true,
          after: 20,
        }),
        shared && p.share
          ? createTextParagraph(`(${num(p.share, 0, 2)}% share ${p.role.replace(/^As /, "as ")})`, {
              size: FONT_SIZE_SMALL,
              color: COLOR_MUTED,
              after: 40,
            })
          : new Paragraph({ spacing: { after: 40 } }),
        new Paragraph({ spacing: { before: 400, after: 20 } }),
        createTextParagraph("( …………………………………… )", { bold: false }),
      ],
    })
  })

  const sigRows: TableRow[] = []
  for (let i = 0; i < sigCells.length; i += 2) {
    const children = [sigCells[i]]
    if (sigCells[i + 1]) {
      children.push(sigCells[i + 1])
    } else {
      children.push(
        new TableCell({
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: NO_BORDERS,
          children: [new Paragraph({})],
        })
      )
    }
    sigRows.push(new TableRow({ cantSplit: true, children }))
  }

  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      rows: sigRows,
    })
  )

  return elements
}

export function buildCoverNoteDocument(slip: PlacingSlip): Document {
  const children: (Paragraph | Table)[] = [
    // Judul Dokumen (Draft Cover Note tanpa kop dan nomor, sesuai PR #159)
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 240 },
      keepNext: true,
      children: [
        new TextRun({
          text: "COVER NOTE",
          bold: true,
          size: FONT_SIZE_TITLE,
          font: FONT_FAMILY,
          color: COLOR_NAVY,
        }),
      ],
    }),
    createDetailTable(slip),
  ]

  // Coverage
  const cov = slip.coverage?.trim()
  if (cov && usesPropertyBlocks(slip.cob)) {
    children.push(createSectionHeading("COVERAGE"))
    children.push(
      createTextParagraph(cov, {
        align: AlignmentType.JUSTIFIED,
        after: 80,
      })
    )
  }

  // Interest Insured
  children.push(...createInterestSection(slip))

  // Deductibles
  children.push(...createDeductiblesSection(slip))

  // Clauses
  children.push(...createClausesSection(slip))

  // Exclusions
  children.push(...createExclusionsSection(slip))

  // Rate & Premium
  children.push(...createPremiumSection(slip))

  // Subjectivity
  if (slip.subjectivity?.trim()) {
    children.push(createSectionHeading("SUBJECTIVITY"))
    children.push(
      createTextParagraph(slip.subjectivity.trim(), {
        align: AlignmentType.JUSTIFIED,
        after: 80,
      })
    )
  }

  // Security
  children.push(...createSecuritySection(slip))

  // Remarks
  if (slip.coverNoteRemarks?.trim()) {
    children.push(createSectionHeading("REMARKS"))
    children.push(
      createTextParagraph(slip.coverNoteRemarks.trim(), {
        align: AlignmentType.JUSTIFIED,
        after: 80,
      })
    )
  }

  // Signature
  children.push(...createSignatureSection(slip))

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(20),
              bottom: convertMillimetersToTwip(20),
              left: convertMillimetersToTwip(10), // 10mm sesuai margin dokumen slip (--print-x: 10mm)
              right: convertMillimetersToTwip(10),
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "Halaman ",
                    font: FONT_FAMILY,
                    size: FONT_SIZE_SMALL,
                    color: COLOR_MUTED,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: FONT_FAMILY,
                    size: FONT_SIZE_SMALL,
                    color: COLOR_MUTED,
                  }),
                  new TextRun({
                    text: " dari ",
                    font: FONT_FAMILY,
                    size: FONT_SIZE_SMALL,
                    color: COLOR_MUTED,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    font: FONT_FAMILY,
                    size: FONT_SIZE_SMALL,
                    color: COLOR_MUTED,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })
}

export async function exportCoverNoteDocx(slip: PlacingSlip): Promise<void> {
  const doc = buildCoverNoteDocument(slip)
  const { Packer } = await import("docx")
  const blob = await Packer.toBlob(doc)
  const filename = coverNoteFilename(slip)

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function generateCoverNoteDocxBuffer(slip: PlacingSlip): Promise<Buffer> {
  const doc = buildCoverNoteDocument(slip)
  const { Packer } = await import("docx")
  return await Packer.toBuffer(doc)
}
