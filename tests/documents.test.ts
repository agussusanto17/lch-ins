import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

test("globals.css defines top-level @page and print margins from --print-x (18mm default, 10mm for slips)", () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), "app/globals.css"),
    "utf-8"
  )

  const pageIndex = css.indexOf("@page")
  const mediaPrintIndex = css.indexOf("@media print")
  assert.ok(pageIndex !== -1, "@page should exist")
  assert.ok(mediaPrintIndex !== -1, "@media print should exist")
  assert.ok(
    pageIndex < mediaPrintIndex,
    "@page should be placed before @media print at root level"
  )

  assert.match(
    css,
    /\.print-footer-fixed\s*\{[^}]*left:\s*0;[^}]*right:\s*0;[^}]*width:\s*100%;[^}]*print-color-adjust:\s*exact;/,
    "print-footer-fixed should bleed 100% full width with exact print colors"
  )

  assert.match(
    css,
    /@media print\s*\{[^}]*html,\s*body\s*\{[^}]*overflow:\s*visible !important;/,
    "html and body should reset overflow to visible in @media print"
  )

  assert.match(
    css,
    /\.print-header-fixed\s*\{[^}]*left:\s*var\(--print-x,\s*18mm\);[^}]*right:\s*var\(--print-x,\s*18mm\);/,
    "print-header-fixed should follow --print-x with an 18mm default"
  )

  assert.match(
    css,
    /\.doc-slip\s*\{[^}]*--print-x:\s*10mm;/,
    "slip documents should narrow the print side margin to 10mm"
  )
})

test("document-shell uses --print-x content margins and full-width print overrides", () => {
  const shell = fs.readFileSync(
    path.join(process.cwd(), "components/documents/document-shell.tsx"),
    "utf-8"
  )

  assert.ok(
    shell.includes("print:px-[var(--print-x,18mm)]"),
    "table content cell should use the --print-x print padding (18mm default)"
  )
  assert.ok(
    shell.includes('slip ? "doc-slip '),
    "slip documents should get the doc-slip class that sets --print-x to 10mm"
  )
  assert.ok(
    shell.includes("print:m-0 print:p-0 print:max-w-none print:w-full print:block print:gap-0"),
    "outer shell should reset print constraints and switch to block layout"
  )
})

test("letterhead footer applies full-width bleed on screen and --print-x print padding", () => {
  const letterhead = fs.readFileSync(
    path.join(process.cwd(), "components/documents/letterhead.tsx"),
    "utf-8"
  )

  assert.ok(
    letterhead.includes('px-[var(--print-x,18mm)] py-2.5 text-white'),
    "print fixed footer should follow --print-x so it aligns with document content"
  )

  assert.ok(
    letterhead.includes('-mx-8 -mb-8 md:-mx-12 md:-mb-12'),
    "on-screen footer should break out to card boundary"
  )

  assert.ok(
    letterhead.includes('loading="eager"') &&
      letterhead.includes('[print-color-adjust:exact]'),
    "print footer badges should load eagerly and force exact print color"
  )

  const sppaDocs = fs.readFileSync(
    path.join(process.cwd(), "components/documents/sppa-documents.tsx"),
    "utf-8"
  )
  assert.ok(
    sppaDocs.includes("overflow-x-auto print:overflow-visible"),
    "SPPA list table wrapper should reset overflow when printing"
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
    appendixSection.includes('className="rte-prose mt-0.5 text-[12px]"'),
    "ClauseWordingAppendix should render wording without forcing justify"
  )
  assert.ok(
    appendixSection.includes("hangNumberedWording(sanitizeHtml(c.wording))"),
    "ClauseWordingAppendix should hang numbered wording lines"
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

test("globals.css keeps editor paragraphs justified and document wording left-aligned", () => {
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
    /\.rte-content p\s*\{[^}]*text-align:\s*justify;[^}]*text-justify:\s*inter-word;/,
    "paragraphs in the editor should stay justified"
  )
  // Baris wording yang diputus <br> jadi renggang kalau di-justify (LMA 5397, 16 November 2026).
  assert.match(
    css,
    /\.rte-prose,\s*\.rte-prose p,\s*\.rte-prose li\s*\{[^}]*text-align:\s*left;/,
    "document wording should be left-aligned"
  )
  assert.match(css, /\.rte-prose p\[data-hang\]\s*\{[^}]*display:\s*flex;/)
})

test("parseBulletLine parses bullet markers and numbered list items correctly", async () => {
  const { parseBulletLine } = await import("../lib/document-format.js")

  // Hyphen bullet, as in Wording Form list items
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

test("VehiclesAttachedInterest renders aligned colon table for Object of Insured fields", () => {
  const docBlocks = fs.readFileSync(
    path.join(process.cwd(), "components/documents/doc-blocks.tsx"),
    "utf-8"
  )
  const start = docBlocks.indexOf("function VehiclesAttachedInterest")
  const block = docBlocks.slice(start, docBlocks.indexOf("export function VehiclePremiumAttached", start))
  assert.ok(block.includes("VEHICLE_ATTACHED_FIELDS.map"), "should iterate vehicle attached fields")
  assert.ok(block.includes('<td className={cn("w-3"'), "should render dedicated colon column for alignment")
})

test("groupNumberedItems keeps location name and address under each numbered risk location", async () => {
  const { groupNumberedItems } = await import("../lib/document-format.js")
  const text = [
    "1) PT MARGAMAS INDAH DEVELOPMENT and/or Subsidiary as MORTGAGEE",
    "MALL PANAKKUKANG",
    "Jl. Boulevard Panakkukang Mas, Kel. Masale, Makasar",
    "",
    "2) PT MARGAMAS INDAH DEVELOPMENT QQ PT MYKO INTERNASIONAL HOTEL",
    "HOTEL MYKO",
    "Jl. Boulevard Panakkukang Mas, Kel. Masale, Makasar",
  ].join("\n")
  assert.deepEqual(groupNumberedItems(text), [
    {
      marker: "1)",
      lines: [
        "PT MARGAMAS INDAH DEVELOPMENT and/or Subsidiary as MORTGAGEE",
        "MALL PANAKKUKANG",
        "Jl. Boulevard Panakkukang Mas, Kel. Masale, Makasar",
      ],
    },
    {
      marker: "2)",
      lines: [
        "PT MARGAMAS INDAH DEVELOPMENT QQ PT MYKO INTERNASIONAL HOTEL",
        "HOTEL MYKO",
        "Jl. Boulevard Panakkukang Mas, Kel. Masale, Makasar",
      ],
    },
  ])

  // Alamat tanpa nomor tetap satu kelompok tanpa marker.
  assert.deepEqual(groupNumberedItems("Grand Mall\nJl. Sudirman 1"), [
    { marker: null, lines: ["Grand Mall", "Jl. Sudirman 1"] },
  ])
})

// Wording LMA 5397 dari editor: nomor di baris sendiri, baris lanjutan menjorok (LCH, 16 November 2026).
test("hangNumberedWording splits numbered <br> lines into hanging items", async () => {
  const { hangNumberedWording } = await import("../lib/document-format.js")
  const html =
    "<p>1. Notwithstanding any provision,<br>resulting from, arising out of.</p>" +
    "<p>2. As used herein where :<br>2.1 the substance or agent, and<br>" +
    "2.2 the method of transmission or between<br>organisms, and</p>" +
    "<p>LMA5397<br>29 April 2020</p>"

  assert.equal(
    hangNumberedWording(html),
    '<p data-hang="first"><span data-hang-marker>1.</span>' +
      "<span data-hang-body>Notwithstanding any provision,<br>resulting from, arising out of.</span></p>" +
      '<p data-hang="first"><span data-hang-marker>2.</span>' +
      "<span data-hang-body>As used herein where :</span></p>" +
      '<p data-hang="cont"><span data-hang-marker>2.1</span>' +
      "<span data-hang-body>the substance or agent, and</span></p>" +
      '<p data-hang="cont"><span data-hang-marker>2.2</span>' +
      "<span data-hang-body>the method of transmission or between<br>organisms, and</span></p>" +
      "<p>LMA5397<br>29 April 2020</p>"
  )
})

test("hangNumberedWording keeps alignment styles and leaves plain paragraphs alone", async () => {
  const { hangNumberedWording } = await import("../lib/document-format.js")
  assert.equal(
    hangNumberedWording('<p style="text-align: center">Intro<br>(a) first item</p>'),
    '<p style="text-align: center">Intro</p>' +
      '<p data-hang="cont" style="text-align: center"><span data-hang-marker>(a)</span>' +
      "<span data-hang-body>first item</span></p>"
  )
  const plain = "<p>Sum of 1.000.000 dollars<br>29 April 2020</p><ul><li>1. item</li></ul>"
  assert.equal(hangNumberedWording(plain), plain)
})
