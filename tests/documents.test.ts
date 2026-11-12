import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

test("globals.css defines top-level @page and synchronized 18mm print margins", () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), "app/globals.css"),
    "utf-8"
  )

  // Verify @page is declared at root level before @media print
  const pageIndex = css.indexOf("@page")
  const mediaPrintIndex = css.indexOf("@media print")
  assert.ok(pageIndex !== -1, "@page should exist")
  assert.ok(mediaPrintIndex !== -1, "@media print should exist")
  assert.ok(
    pageIndex < mediaPrintIndex,
    "@page should be placed before @media print at root level"
  )

  // Verify full-bleed footer with exact print colors
  assert.match(
    css,
    /\.print-footer-fixed\s*\{[^}]*left:\s*0;[^}]*right:\s*0;[^}]*width:\s*100%;[^}]*print-color-adjust:\s*exact;/,
    "print-footer-fixed should bleed 100% full width with exact print colors"
  )

  // Verify html and body overflow reset in @media print
  assert.match(
    css,
    /@media print\s*\{[^}]*html,\s*body\s*\{[^}]*overflow:\s*visible !important;/,
    "html and body should reset overflow to visible in @media print"
  )

  // Verify 18mm header margin
  assert.match(
    css,
    /\.print-header-fixed\s*\{[^}]*left:\s*18mm;[^}]*right:\s*18mm;/,
    "print-header-fixed should have 18mm side margins"
  )
})

test("document-shell uses 18mm content margins and full-width print overrides", () => {
  const shell = fs.readFileSync(
    path.join(process.cwd(), "components/documents/document-shell.tsx"),
    "utf-8"
  )

  assert.ok(
    shell.includes("print:px-[18mm]"),
    "table content cell should use 18mm print horizontal padding"
  )
  assert.ok(
    shell.includes("print:m-0 print:p-0 print:max-w-none print:w-full print:block print:gap-0"),
    "outer shell should reset print constraints and switch to block layout"
  )
})

test("letterhead footer applies full-width bleed on screen and 18mm print padding", () => {
  const letterhead = fs.readFileSync(
    path.join(process.cwd(), "components/documents/letterhead.tsx"),
    "utf-8"
  )

  // Print footer internal content padding
  assert.ok(
    letterhead.includes('px-[18mm] py-2.5 text-white'),
    "print fixed footer should use 18mm padding to align with document content"
  )

  // On-screen footer card breakout
  assert.ok(
    letterhead.includes('-mx-8 -mb-8 md:-mx-12 md:-mb-12'),
    "on-screen footer should break out to card boundary"
  )
})

test("doc-blocks prints clause list titles unbolded without wording and keeps bold titles in the wording appendix", () => {
  const docBlocks = fs.readFileSync(
    path.join(process.cwd(), "components/documents/doc-blocks.tsx"),
    "utf-8"
  )

  // ClausesBlock: titles only, unbolded, in all four slip documents (Harry, 9 Nov 2026).
  const start = docBlocks.indexOf("export function ClausesBlock")
  const clausesBlock = docBlocks.slice(start, docBlocks.indexOf("\n}\n", start))
  assert.ok(start >= 0, "ClausesBlock should exist")
  assert.ok(
    !clausesBlock.includes("font-semibold"),
    "ClausesBlock should not bold clause titles"
  )
  assert.ok(
    !clausesBlock.includes("dangerouslySetInnerHTML"),
    "ClausesBlock should print titles only; wording belongs in the appendix"
  )
  assert.ok(
    clausesBlock.includes('className="flex-1 min-w-0 text-left"'),
    "ClausesBlock should use natural left alignment for titles"
  )
  assert.ok(
    !clausesBlock.includes("text-justify"),
    "ClausesBlock titles should not force justified text"
  )

  // In ClauseWordingAppendix: titles remain font-semibold, heading is CLAUSE WORDINGS,
  // and content preserves hanging indentation relative to the clause number
  const appendixSection = docBlocks.slice(
    docBlocks.indexOf("function ClauseWordingAppendix")
  )
  assert.ok(
    appendixSection.includes("<SectionHeading>CLAUSE WORDINGS</SectionHeading>"),
    "ClauseWordingAppendix should render CLAUSE WORDINGS as section heading"
  )
  assert.ok(
    appendixSection.includes('className="font-semibold text-left"'),
    "ClauseWordingAppendix should keep titles bolded with natural left alignment"
  )
  assert.ok(
    appendixSection.includes('<div className="flex-1 min-w-0">'),
    "ClauseWordingAppendix should nest clause title and wording body inside flex-1 min-w-0 column for hanging indent"
  )
  assert.ok(
    appendixSection.includes('className="rte-prose mt-0.5 text-[12px] text-justify"'),
    "ClauseWordingAppendix should justify descriptive wording paragraphs"
  )
})

// Isi dokumen yang diketik user tidak abu-abu (catatan Harry, 12 November 2026).
test("free-text content blocks in slip documents use the normal text color", () => {
  const slipDocs = fs.readFileSync(
    path.join(process.cwd(), "components/documents/slip-documents.tsx"),
    "utf-8"
  )
  const blocks = fs.readFileSync(
    path.join(process.cwd(), "components/documents/doc-blocks.tsx"),
    "utf-8"
  )
  for (const field of ["slip.subjectivity", "slip.coverNoteRemarks", "slip.closingInstruction"]) {
    const start = slipDocs.indexOf(`text={${field}}`)
    assert.ok(start > 0, `${field} should be rendered with HangingIndentText`)
    const props = slipDocs.slice(start, slipDocs.indexOf("/>", start))
    assert.ok(!props.includes("text-muted-foreground"), `${field} should not be grey`)
  }
  for (const field of ["slip.interestSection1", "slip.interestSection2", "slip.specialConditions"]) {
    const start = blocks.indexOf(`text={${field}}`)
    assert.ok(start > 0, `${field} should be rendered with HangingIndentText`)
    const props = blocks.slice(start, blocks.indexOf("/>", start))
    assert.ok(!props.includes("text-muted-foreground"), `${field} should not be grey`)
  }
})

test("globals.css configures natural left alignment for headings and justified text for paragraphs in rich text", () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), "app/globals.css"),
    "utf-8"
  )

  assert.match(
    css,
    /\.rte-content h2,\s*\.rte-prose h2\s*\{[^}]*text-align:\s*left;/,
    "h2 in rich text should have natural left alignment"
  )
  assert.match(
    css,
    /\.rte-content h3,\s*\.rte-prose h3\s*\{[^}]*text-align:\s*left;/,
    "h3 in rich text should have natural left alignment"
  )
  assert.match(
    css,
    /\.rte-content p,\s*\.rte-prose p\s*\{[^}]*text-align:\s*justify;[^}]*text-justify:\s*inter-word;/,
    "paragraphs in rich text should have justified text alignment"
  )
})

test("parseBulletLine parses bullet markers and numbered list items correctly", async () => {
  const { parseBulletLine } = await import("../lib/document-format.js")

  // Hyphen bullet (such as Wording Form list item in screenshot)
  assert.deepEqual(
    parseBulletLine(
      "- Munich-Re Wording Amended with Riot, Strike, Malicious Damage and Civil Commotion Endorsement (Code 4.1B/2007)"
    ),
    {
      marker: "-",
      content:
        "Munich-Re Wording Amended with Riot, Strike, Malicious Damage and Civil Commotion Endorsement (Code 4.1B/2007)",
    }
  )

  // En-dash and em-dash bullets
  assert.deepEqual(parseBulletLine("– En-dash item"), {
    marker: "–",
    content: "En-dash item",
  })
  assert.deepEqual(parseBulletLine("— Em-dash item"), {
    marker: "—",
    content: "Em-dash item",
  })

  // Dot bullet and asterisk
  assert.deepEqual(parseBulletLine("• Bullet dot item"), {
    marker: "•",
    content: "Bullet dot item",
  })
  assert.deepEqual(parseBulletLine("* Asterisk item"), {
    marker: "*",
    content: "Asterisk item",
  })

  // Numbered list items
  assert.deepEqual(parseBulletLine("1. Clause title"), {
    marker: "1.",
    content: "Clause title",
  })
  assert.deepEqual(parseBulletLine("2) Second item"), {
    marker: "2)",
    content: "Second item",
  })
  assert.deepEqual(parseBulletLine("(1) Sub-item in parens"), {
    marker: "(1)",
    content: "Sub-item in parens",
  })
  assert.deepEqual(parseBulletLine("(1). Sub-item with trailing dot"), {
    marker: "(1).",
    content: "Sub-item with trailing dot",
  })

  // Lettered list items
  assert.deepEqual(parseBulletLine("a. Lettered item"), {
    marker: "a.",
    content: "Lettered item",
  })
  assert.deepEqual(parseBulletLine("A. BUILDINGS"), {
    marker: "A.",
    content: "BUILDINGS",
  })
  assert.deepEqual(parseBulletLine("B. MACHINERY & EQUIPMENT"), {
    marker: "B.",
    content: "MACHINERY & EQUIPMENT",
  })
  assert.deepEqual(parseBulletLine("b) Lettered paren item"), {
    marker: "b)",
    content: "Lettered paren item",
  })
  assert.deepEqual(parseBulletLine("(a) Parens letter"), {
    marker: "(a)",
    content: "Parens letter",
  })

  // Roman numerals
  assert.deepEqual(parseBulletLine("i. Roman item"), {
    marker: "i.",
    content: "Roman item",
  })
  assert.deepEqual(parseBulletLine("iv. Fourth roman"), {
    marker: "iv.",
    content: "Fourth roman",
  })

  // Negative tests: ordinary text without markers should not match
  assert.equal(parseBulletLine("—"), null)
  assert.equal(parseBulletLine("-"), null)
  assert.equal(parseBulletLine("PT. Asuransi LCH"), null)
  assert.equal(parseBulletLine("PT. HABCO PRIMATAMA"), null)
  assert.equal(parseBulletLine("CV. MAJU JAYA"), null)
  assert.equal(parseBulletLine("01 January 2026 - 31 December 2026"), null)
  assert.equal(parseBulletLine("A standard paragraph without bullets"), null)
})

test("InterestBlock and ExclusionsBlock format items with text-justify and HangingIndentText", () => {
  const docBlocks = fs.readFileSync(
    path.join(process.cwd(), "components/documents/doc-blocks.tsx"),
    "utf-8"
  )

  const interestStart = docBlocks.indexOf("export function InterestBlock")
  const interestBlock = docBlocks.slice(
    interestStart,
    docBlocks.indexOf("export function OpenCoverRateBlock", interestStart)
  )

  assert.ok(interestBlock.includes("<HangingIndentText text={i.description} />"))
  assert.ok(interestBlock.includes("<HangingIndentText\n                  text={slip.interestSection1}"))
  assert.ok(interestBlock.includes("<HangingIndentText\n                  text={slip.interestSection2}"))

  const exclusionsStart = docBlocks.indexOf("export function ExclusionsBlock")
  const exclusionsBlock = docBlocks.slice(
    exclusionsStart,
    docBlocks.indexOf("export function ClausesBlock", exclusionsStart)
  )
  assert.ok(exclusionsBlock.includes('className="flex-1 min-w-0 text-justify"'))
})
