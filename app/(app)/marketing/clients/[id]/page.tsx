import { PageShell } from "@/components/layout/page-header"
import { ClientDetail } from "@/components/marketing/client-detail"
import { clientById } from "@/lib/data"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const client = clientById(id)
  return {
    title: `${client?.name ?? "Detail Klien"} — LCH Insurance Brokers`,
  }
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // Data diambil dari store sesi di client, jadi klien yang baru ditambah
  // juga punya halaman detail.
  return (
    <PageShell>
      <ClientDetail id={id} />
    </PageShell>
  )
}
