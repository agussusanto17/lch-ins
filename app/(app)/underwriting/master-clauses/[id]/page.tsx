import { notFound } from "next/navigation"

import { ClauseForm } from "@/components/underwriting/clause-form"
import {
  getClause,
  listCobOptions,
  listCoverTypeOptions,
  listSourceGroups,
} from "@/lib/server/clauses"

export default async function EditClausePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [clause, cobs, coverTypes, groups] = await Promise.all([
    getClause(id),
    listCobOptions(),
    listCoverTypeOptions(),
    listSourceGroups(),
  ])
  if (!clause) notFound()

  return (
    <ClauseForm
      mode="edit"
      clause={{
        id: clause.id,
        title: clause.title,
        wordingHtml: clause.wordingHtml,
        sourceGroup: clause.sourceGroup,
        cobId: clause.cobId,
        coverTypeId: clause.coverTypeId,
      }}
      cobs={cobs}
      coverTypes={coverTypes}
      groups={groups}
    />
  )
}
