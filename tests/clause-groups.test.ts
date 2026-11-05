import assert from "node:assert/strict"
import test from "node:test"

import {
  cleanClauseGroups,
  clauseGroupBlocks,
  installPackage,
  packageToInstall,
  groupedClauseOrder,
  hasClauseGroups,
  moveClause,
  moveClauseGroup,
  moveClauseToGroup,
  renameClauseGroup,
} from "../lib/clause-groups"

// CI Cendanawati: EXTENSIONS lalu GENERAL CONDITIONS.
const ids = ["icc", "war", "akad", "nma"]
const groups = { icc: "Extensions", war: "Extensions", akad: "General Conditions", nma: "General Conditions" }

test("kelompok klausul menurut kemunculan pertama, klausul sekelompok berdampingan", () => {
  assert.deepEqual(clauseGroupBlocks(ids, groups), [
    { title: "Extensions", ids: ["icc", "war"] },
    { title: "General Conditions", ids: ["akad", "nma"] },
  ])
  assert.deepEqual(groupedClauseOrder(["icc", "akad", "war"], groups), ["icc", "war", "akad"])
  assert.deepEqual(clauseGroupBlocks(["a", "b"], undefined), [{ title: "", ids: ["a", "b"] }])
  assert.equal(hasClauseGroups(ids, groups), true)
  assert.equal(hasClauseGroups(ids, { icc: "  " }), false)
})

test("pindah kelompok: ke akhir kelompok tujuan, atau ke akhir daftar untuk kelompok baru", () => {
  assert.deepEqual(moveClauseToGroup(ids, groups, "nma", "Extensions"), {
    ids: ["icc", "war", "nma", "akad"],
    groups: { ...groups, nma: "Extensions" },
  })
  const fresh = moveClauseToGroup(ids, groups, "icc", "Compulsory Clauses")
  assert.deepEqual(fresh.ids, ["war", "akad", "nma", "icc"])
  const none = moveClauseToGroup(ids, groups, "war", "")
  assert.equal("war" in none.groups, false)
  assert.deepEqual(none.ids, ["icc", "akad", "nma", "war"])
})

test("geser klausul di dalam kelompok dan geser kelompok", () => {
  assert.deepEqual(moveClause(ids, groups, "war", -1), ["war", "icc", "akad", "nma"])
  assert.deepEqual(moveClause(ids, groups, "akad", -1), ids)
  assert.deepEqual(moveClauseGroup(ids, groups, "General Conditions", -1), ["akad", "nma", "icc", "war"])
  assert.deepEqual(moveClauseGroup(ids, groups, "Extensions", -1), ids)
})

test("ganti judul kelompok, dan judul sama menggabungkan kelompok", () => {
  assert.deepEqual(renameClauseGroup(ids, groups, "Extensions", "EXTENSIONS"), {
    ...groups,
    icc: "EXTENSIONS",
    war: "EXTENSIONS",
  })
  const merged = renameClauseGroup(ids, groups, "Extensions", "General Conditions")
  assert.deepEqual(clauseGroupBlocks(ids, merged), [{ title: "General Conditions", ids }])
})

test("peta kelompok yang disimpan: hanya klausul terpilih dengan judul", () => {
  assert.deepEqual(cleanClauseGroups(["icc", "akad"], { ...groups, gone: "Extensions", akad: " " }), {
    icc: "Extensions",
  })
  assert.equal(cleanClauseGroups(["x"], {}), undefined)
  assert.equal(cleanClauseGroups(["x"], { x: "a".repeat(250) })?.x.length, 200)
})

test("paket klausul: urut paket lalu judul, tanpa yang sudah terpasang", () => {
  const master = [
    { id: "b", title: "B clause", inPackage: true, packageOrder: 2, packageGroup: "General Conditions" },
    { id: "a", title: "A clause", inPackage: true, packageOrder: 2, packageGroup: "General Conditions" },
    { id: "x", title: "X clause", inPackage: true, packageOrder: 1, packageGroup: "Extensions" },
    { id: "n", title: "Not in package", inPackage: false },
    { id: "s", title: "Selected", inPackage: true, packageOrder: 0 },
  ]
  const picked = packageToInstall(master, ["s"])
  assert.deepEqual(picked.map((c) => c.id), ["x", "a", "b"])
  // Slip dengan kelompok: klausul paket masuk kelompoknya.
  const grouped = installPackage(["s"], undefined, picked, true)
  assert.deepEqual(grouped.ids, ["s", "x", "a", "b"])
  assert.deepEqual(grouped.groups, { x: "Extensions", a: "General Conditions", b: "General Conditions" })
  // Slip ber-section: tanpa kelompok, ditambah di akhir.
  assert.deepEqual(installPackage(["s"], undefined, picked, false), { ids: ["s", "x", "a", "b"], groups: undefined })
})
