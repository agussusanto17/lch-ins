import { LoginForm } from "@/components/auth/login-form"

export const metadata = { title: "Masuk — LCH Insurance Brokers" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  // Hanya terima path internal, supaya parameter ini tidak bisa dipakai
  // mengarahkan pengguna ke situs lain setelah login.
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/"

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <p className="text-lg font-semibold tracking-tight">
            PT. LCH Insurance Brokers
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sistem Back Office
          </p>
        </div>

        <div className="rounded-xl border bg-background p-6 shadow-sm">
          <LoginForm next={target} />
        </div>
      </div>
    </main>
  )
}
