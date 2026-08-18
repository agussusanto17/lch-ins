import { notFound } from "next/navigation"

import { ClauseForm } from "@/components/underwriting/clause-form"
import { CLAUSES, clauseById } from "@/lib/data"

export function generateStaticParams() {
  return CLAUSES.map((c) => ({ id: c.id }))
}

export default async function EditClausePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const clause = clauseById(id)
  if (!clause) notFound()
  return <ClauseForm clause={clause} mode="edit" />
}
