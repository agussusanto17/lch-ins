import { chromium } from "playwright"

const OUT = process.env.OUT || "./shots"
const PAGES = [
  ["01-dashboard", "/"],
  ["02-marketing", "/marketing"],
  ["03-underwriting", "/underwriting"],
  ["04-slip-new", "/underwriting/new"],
  ["05-slip-edit-motor", "/underwriting/edit/s-001"],
  ["06-slip-edit-property", "/underwriting/edit/s-002"],
  ["07-quotation-draft", "/underwriting/quotation/edit/s-001"],
  ["08-doc-placing-slip", "/underwriting/slip/s-001"],
  ["09-doc-quotation", "/underwriting/quotation/s-001"],
  ["10-doc-cover-note", "/underwriting/cover-note/s-001"],
  ["11-doc-closing", "/underwriting/closing/s-001"],
  ["12-master-clauses", "/underwriting/master-clauses"],
  ["13-policies", "/policies"],
  ["14-claims", "/claims"],
  ["15-reports", "/reports"],
  ["16-404", "/halaman-tidak-ada"],
]

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
const errors = []
page.on("console", (m) => { if (m.type() === "error") errors.push(`[console] ${page.url()} :: ${m.text()}`) })
page.on("pageerror", (e) => errors.push(`[pageerror] ${page.url()} :: ${e.message}`))

for (const [name, path] of PAGES) {
  await page.goto(`http://localhost:3000${path}`, { waitUntil: "networkidle" })
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  const h = await page.evaluate(() => document.body.scrollHeight)
  console.log(`${name.padEnd(24)} ${String(h).padStart(6)}px  ${path}`)
}

await browser.close()
if (errors.length) { console.log("\n--- ERRORS ---"); errors.forEach((e) => console.log(e)) }
else console.log("\nNo console errors.")
