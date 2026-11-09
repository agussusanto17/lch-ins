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

  // Verify full-bleed footer
  assert.match(
    css,
    /\.print-footer-fixed\s*\{[^}]*left:\s*0;[^}]*right:\s*0;[^}]*width:\s*100%;/,
    "print-footer-fixed should bleed 100% full width"
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
    shell.includes("print:m-0 print:p-0 print:max-w-none print:w-full"),
    "outer shell should reset print constraints"
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

  // In ClauseWordingAppendix: titles remain font-semibold
  const appendixSection = docBlocks.slice(
    docBlocks.indexOf("function ClauseWordingAppendix")
  )
  assert.ok(
    appendixSection.includes('className="font-semibold"'),
    "ClauseWordingAppendix should keep titles bolded"
  )
})
