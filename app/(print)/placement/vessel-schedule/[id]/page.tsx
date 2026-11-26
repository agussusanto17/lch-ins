import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { DocumentShell } from "@/components/documents/document-shell"
import { VesselScheduleDocument } from "@/components/documents/hull-documents"
import { usesHullSchedule } from "@/lib/marine-hull"
import { getPlacingSlipById } from "@/lib/server/placing-slips"

export const metadata: Metadata = { title: "Jadwal Kapal — LCH Insurance Brokers" }

/** Lampiran jadwal kapal slip Marine Hull, landscape (format Patria A4, MHL A3). */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const slip = await getPlacingSlipById(id)
  if (!slip || !usesHullSchedule(slip)) notFound()
  return (
    <DocumentShell slip wide letterhead={false} backHref={`/placement/edit/${slip.id}`}>
      <VesselScheduleDocument slip={slip} schedule={slip.hullSchedule} />
    </DocumentShell>
  )
}
