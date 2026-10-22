import { releaseIssues } from "@/components/underwriting/slip-model"
import { prisma } from "@/lib/prisma"
import {
  createPlacingSlip,
  deletePlacingSlip,
  getPlacingSlipById,
  listPlacingSlips,
  releasePlacingSlip,
} from "@/lib/server/placing-slips"

let failed = 0
function check(name: string, ok: boolean, detail?: unknown) {
  if (!ok) failed++
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ` ${JSON.stringify(detail)}`}`)
}

async function main() {
  const admin = await prisma.user.findFirstOrThrow({ where: { email: "admin@lch.example" } })
  const slips = await listPlacingSlips()

  for (const s of slips.filter((x) => x.status === "Released")) {
    const full = await getPlacingSlipById(s.id)
    check(`released ${s.slipNo} passes guard`, !!full && releaseIssues(full).length === 0, full && releaseIssues(full))
  }

  const source = slips.find((x) => x.slipNo === "002/LCH-PLCMT/PS-PAREQ/VIII/2026")
  const template = source && (await getPlacingSlipById(source.id))
  if (!template?.clientId) throw new Error("Seed slip 002 tidak ditemukan.")
  const base = { ...template, clientId: template.clientId, status: "Draft" as const }

  const created = await createPlacingSlip(base, admin.id)
  try {
    const reread = await getPlacingSlipById(created.id)
    check("typeOfCover survives save", reread?.typeOfCover === "PAR + EQVET", reread?.typeOfCover)
    check("coverCode derives from label", reread?.coverCode === "PAREQ", reread?.coverCode)
    check("copied slip passes guard", !!reread && releaseIssues(reread).length === 0, reread && releaseIssues(reread))

    const blank = await createPlacingSlip({ ...base, typeOfCover: "" }, admin.id)
    const blankRead = await getPlacingSlipById(blank.id)
    check("missing cover is reported", !!blankRead && releaseIssues(blankRead).includes("Pilih type of cover."))
    await deletePlacingSlip(blank.dbId, admin.id)

    const released = await releasePlacingSlip(created.dbId, admin.id)
    check("released number carries cover code", /\/PS-PAREQ\//.test(released.slipNo ?? ""), released.slipNo)
  } finally {
    await prisma.slipRateLine.deleteMany({ where: { slipId: created.dbId } })
    await prisma.placingSlip.delete({ where: { id: created.dbId } }).catch(() => {})
  }

  console.log(failed ? `${failed} FAILED` : "ALL PASSED")
  process.exit(failed ? 1 : 0)
}

main()
