import { z } from "zod"

import { PARTICIPANT_LIMITS } from "@/lib/slip-participants"

const text = z
  .string()
  .max(PARTICIPANT_LIMITS.text, `Isian peserta maksimal ${PARTICIPANT_LIMITS.text} karakter`)
  .optional()

/**
 * Satu peserta PA grup dari form slip atau endorsement. Nama dan sum insured
 * boleh kosong di draft; release slip yang mewajibkannya (participantIssues).
 */
export const participantSchema = z.object({
  id: z.string(),
  name: z
    .string()
    .trim()
    .max(PARTICIPANT_LIMITS.text, `Nama peserta maksimal ${PARTICIPANT_LIMITS.text} karakter`),
  idNumber: text,
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal lahir peserta tidak valid")
    .nullish(),
  gender: text,
  position: text,
  level: text,
  workLocation: text,
  sumInsured: z.coerce.number().min(0, "Sum insured peserta tidak boleh negatif"),
  beneficiary: text,
})

export const participantListSchema = z
  .array(participantSchema)
  .max(
    PARTICIPANT_LIMITS.rows,
    `Peserta maksimal ${PARTICIPANT_LIMITS.rows.toLocaleString("id-ID")} orang`
  )
