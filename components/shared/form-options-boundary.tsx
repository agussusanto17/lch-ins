import { FormOptionsProvider } from "@/components/shared/form-options-provider"
import { getFormOptions } from "@/lib/server/form-options"

/**
 * Memuat pilihan dropdown master data per halaman, bukan di layout: layout tidak dirender ulang
 * saat pindah halaman, jadi isian master baru tidak muncul sampai reload.
 */
export async function FormOptionsBoundary({
  children,
}: {
  children: React.ReactNode
}) {
  const options = await getFormOptions()
  return <FormOptionsProvider options={options}>{children}</FormOptionsProvider>
}
