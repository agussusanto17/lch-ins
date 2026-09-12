"use server"

import { revalidatePath } from "next/cache"

import {
  createClause,
  deleteClause,
  updateClause,
  type ClauseInput,
} from "@/lib/server/clauses"

const LIST_PATH = "/underwriting/master-clauses"

export type ActionResult = { ok: true } | { ok: false; error: string }

/** Pesan error dari lapisan data dipakai apa adanya, sudah ditulis untuk user. */
function fail(e: unknown): ActionResult {
  const error =
    e instanceof Error ? e.message : "Clause gagal disimpan, coba lagi."
  return { ok: false, error }
}

export async function saveClauseAction(
  id: string | null,
  input: ClauseInput
): Promise<ActionResult> {
  try {
    if (id) await updateClause(id, input)
    else await createClause(input)
  } catch (e) {
    return fail(e)
  }
  revalidatePath(LIST_PATH)
  if (id) revalidatePath(`${LIST_PATH}/${id}`)
  return { ok: true }
}

export async function deleteClauseAction(
  id: string
): Promise<ActionResult & { deactivated?: boolean; used?: number }> {
  try {
    const result = await deleteClause(id)
    revalidatePath(LIST_PATH)
    return { ok: true, ...result }
  } catch (e) {
    return fail(e)
  }
}
