import assert from "node:assert/strict"
import test from "node:test"

import { ratePermilText } from "../lib/calc"

test("ratePermilText mencetak rate Property per mil enam desimal", () => {
  assert.equal(ratePermilText(0.8037), "0,803700‰")
  assert.equal(ratePermilText(0.344250), "0,344250‰")
  assert.equal(ratePermilText(0.000009), "0,000009‰")
  assert.equal(ratePermilText(1.14975), "1,149750‰")
})
