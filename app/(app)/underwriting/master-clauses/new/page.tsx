import { ClauseForm } from "@/components/underwriting/clause-form"
import {
  listCobOptions,
  listCoverTypeOptions,
  listSourceGroups,
} from "@/lib/server/clauses"

export const metadata = { title: "Clause Baru — LCH Insurance Brokers" }

export default async function NewClausePage() {
  const [cobs, coverTypes, groups] = await Promise.all([
    listCobOptions(),
    listCoverTypeOptions(),
    listSourceGroups(),
  ])
  return (
    <ClauseForm
      mode="new"
      cobs={cobs}
      coverTypes={coverTypes}
      groups={groups}
    />
  )
}
