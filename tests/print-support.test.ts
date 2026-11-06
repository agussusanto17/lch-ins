import assert from "node:assert/strict"
import test from "node:test"

import { repeatsPrintHeaderFooter } from "../lib/print-support"

const UA = {
  safariMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  safariIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  chromeMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  edgeWin:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0",
  firefoxMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0",
}

test("Safari tidak mengulang header dan footer cetak", () => {
  assert.equal(repeatsPrintHeaderFooter(UA.safariMac), false)
  assert.equal(repeatsPrintHeaderFooter(UA.safariIos), false)
})

test("Chrome, Edge, dan Firefox mengulang header dan footer cetak", () => {
  assert.equal(repeatsPrintHeaderFooter(UA.chromeMac), true)
  assert.equal(repeatsPrintHeaderFooter(UA.edgeWin), true)
  assert.equal(repeatsPrintHeaderFooter(UA.firefoxMac), true)
})
