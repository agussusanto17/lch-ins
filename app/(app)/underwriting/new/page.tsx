import { NewSlip } from "@/components/underwriting/new-slip"

export const metadata = { title: "Buat Placing Slip — LCH Insurance Brokers" }

export default async function NewSlipPage({
  searchParams,
}: {
  searchParams: Promise<{ sppa?: string; client?: string }>
}) {
  const { sppa, client } = await searchParams
  return <NewSlip sppaId={sppa} clientId={client} />
}
