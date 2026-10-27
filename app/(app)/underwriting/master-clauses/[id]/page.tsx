import { notFound } from "next/navigation"

import { ClauseForm } from "@/components/underwriting/clause-form"
import { canManage } from "@/lib/access"
import {
  getClause,
  listCobOptions,
  listCoverTypeOptions,
  listSourceGroups,
} from "@/lib/server/clauses"
import { currentUser } from "@/lib/server/session"

export default async function EditClausePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [clause, cobs, coverTypes, groups, user] = await Promise.all([
    getClause(id),
    listCobOptions(),
    listCoverTypeOptions(),
    listSourceGroups(),
    currentUser(),
  ])
  if (!clause) notFound()

  const canManageClause = user
    ? canManage(user.roles, "/underwriting/master-clauses")
    : false

  return (
    <ClauseForm
      mode="edit"
      canManage={canManageClause}
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
