import assert from "node:assert/strict"
import test from "node:test"

import { sanitizeHtml } from "../lib/sanitize"

test("keeps text alignment from the clause editor", () => {
  for (const align of ["left", "center", "right", "justify"]) {
    assert.equal(
      sanitizeHtml(`<p style="text-align: ${align}">Wording</p>`),
      `<p style="text-align: ${align}">Wording</p>`
    )
  }
  assert.equal(
    sanitizeHtml(`<h2 style="text-align:center">Title</h2>`),
    `<h2 style="text-align: center">Title</h2>`
  )
})

test("drops every other style", () => {
  assert.equal(
    sanitizeHtml(`<p style="color: red; text-align: center">x</p>`),
    "<p>x</p>"
  )
  assert.equal(
    sanitizeHtml(`<p style="text-align: center; background: url(x)">x</p>`),
    "<p>x</p>"
  )
  assert.equal(sanitizeHtml(`<p style="text-align: start">x</p>`), "<p>x</p>")
})

test("keeps alignment only on blocks the editor can align", () => {
  assert.equal(
    sanitizeHtml(`<strong style="text-align: center">x</strong>`),
    "<strong>x</strong>"
  )
  assert.equal(
    sanitizeHtml(`<p onclick="alert(1)" style="text-align: right">x</p>`),
    `<p style="text-align: right">x</p>`
  )
})
