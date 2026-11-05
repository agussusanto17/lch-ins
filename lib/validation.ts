import * as z from "zod"

import type { PlacingSlip } from "@/lib/data/types"

export type FieldErrors = Record<string, string>

/**
 * Validate form data against a zod schema and collect field-level errors
 * (dot-delimited path, e.g. "addresses.0.value"). Shared with Server Actions
 * for defense-in-depth two-tier validation.
 */
export function validate<T extends z.ZodType>(
  schema: T,
  data: unknown
):
  | { ok: true; data: z.infer<T>; errors: FieldErrors }
  | { ok: false; data: null; errors: FieldErrors } {
  const result = schema.safeParse(data)
  if (result.success) return { ok: true, data: result.data, errors: {} }
  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join(".")
    if (!(key in errors)) errors[key] = issue.message
  }
  return { ok: false, data: null, errors }
}

/* Reusable schema fragments across forms. */

export const requiredText = (label: string) =>
  z.string().trim().min(1, `${label} wajib diisi`)

export const optionalText = z.string().trim().optional().or(z.literal(""))

export const isoDate = (label: string) =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} wajib diisi`)

export const optionalIsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional()
  .or(z.literal(""))

export const email = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || z.email().safeParse(v).success,
    "Format email tidak valid"
  )

/** NPWP: 15 digits (legacy format) or 16 digits (NIK / new NPWP format). */
export const npwp = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || [15, 16].includes(v.replace(/\D/g, "").length),
    "NPWP harus 15 atau 16 digit"
  )

/** Indonesian Citizen ID (NIK/KTP): 16 numeric digits. */
export const nik = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || /^\d{16}$/.test(v.replace(/\s/g, "")),
    "Nomor KTP harus 16 digit angka"
  )

export const money = (label: string) =>
  z.number(`${label} wajib diisi`).nonnegative(`${label} tidak boleh negatif`)

/**
 * Satu klausula slip Property hanya boleh ada di satu kelompok: tanpa
 * section, Section 1, atau Section 2.
 */
export function validateClauseUniquenessAcrossSections(
  slip: Pick<
    PlacingSlip,
    | "clauseIds"
    | "clauseIdsSection2"
    | "clauseIdsGeneral"
    | "clauseOverrides"
    | "clauseCopies"
    | "clauseOverridesSection2"
    | "clauseCopiesSection2"
    | "clauseOverridesGeneral"
    | "clauseCopiesGeneral"
  >,
  titleLookup?: (id: string) => string | undefined
): string[] {
  const issues: string[] = []
  const groups = [
    new Set(slip.clauseIdsGeneral ?? []),
    new Set(slip.clauseIds ?? []),
    new Set(slip.clauseIdsSection2 ?? []),
  ]
  const seen = new Map<string, number>()
  for (const group of groups) {
    for (const id of group) seen.set(id, (seen.get(id) ?? 0) + 1)
  }

  const duplicates = [...seen].filter(([, count]) => count > 1).map(([id]) => id)
  if (duplicates.length) {
    const names = duplicates.map((id) => {
      const fromLookup = titleLookup?.(id)
      if (fromLookup) return fromLookup
      const fromSlip =
        slip.clauseOverrides?.[id]?.title ||
        slip.clauseOverridesSection2?.[id]?.title ||
        slip.clauseOverridesGeneral?.[id]?.title ||
        slip.clauseCopies?.[id]?.title ||
        slip.clauseCopiesSection2?.[id]?.title ||
        slip.clauseCopiesGeneral?.[id]?.title
      return fromSlip || id
    })
    issues.push(
      `Klausula "${names.join(", ")}" dipilih di lebih dari satu kelompok. Pilih di salah satu saja: Clauses tanpa section, Section 1, atau Section 2.`
    )
  }
  return issues
}
