import type { Metadata } from "next"
import Image from "next/image"
import { redirect } from "next/navigation"
import { connection } from "next/server"

import { LoginForm } from "@/components/auth/login-form"
import { currentUser } from "@/lib/server/session"
import logoMark from "@/public/images/logo-lch-mark.png"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "Masuk | LCH Insurance Brokers" }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  await connection()
  const { next } = await searchParams
  // Hanya terima path internal, supaya parameter ini tidak bisa dipakai
  // mengarahkan pengguna ke situs lain setelah login.
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/"

  // Sesi aktif langsung diarahkan ke tujuan. Dicek di sini, bukan di proxy, supaya
  // cookie kedaluwarsa tidak memicu redirect loop.
  const user = await currentUser()
  if (user) {
    if (user.mustChangePassword) {
      redirect("/change-password")
    }
    redirect(target)
  }

  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* Panel merek: indigo dan emas dari logo LCH (#29166E, #F7C303), simpul logo jadi
          motif besar di belakang. */}
      <section className="relative isolate flex flex-col gap-10 overflow-hidden bg-[radial-gradient(120%_90%_at_0%_0%,#3a28a6_0%,#29166e_55%,#1d0f52_100%)] px-6 py-8 text-white sm:px-10 lg:min-h-svh lg:px-14 lg:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-32 -z-10 size-96 bg-white/[0.07] [mask-image:url(/images/logo-lch-mark-mono.svg)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] sm:size-[34rem] lg:-top-52 lg:-right-72 lg:size-[60rem]"
        />

        <div className="flex items-center gap-3.5">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white p-2 shadow-lg shadow-black/20">
            <Image src={logoMark} alt="" className="size-full" loading="eager" />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-semibold sm:text-lg">
              PT. LCH Insurance Brokers
            </span>
            <span className="mt-0.5 block text-sm text-white/75">
              SKOJK Nomor KEP-46/NB.1/2016
            </span>
          </span>
        </div>

        <div className="lg:mt-auto">
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-7xl">
            Sistem
            <br />
            <span className="text-[#f7c303]">Back Office</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-balance text-white/80 sm:text-lg lg:mt-6">
            SPPA, placing slip, polis, dan klaim dalam satu sistem.
          </p>
        </div>
      </section>

      <section className="flex flex-col px-6 py-10 sm:px-10 lg:px-16 lg:py-12">
        <div className="m-auto w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Masuk</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Akun dibuat oleh Admin LCH. Login pertama wajib mengganti kata sandi.
          </p>
          <div className="mt-8">
            <LoginForm next={target} />
          </div>
        </div>
        <p className="mx-auto mt-10 w-full max-w-sm text-center text-xs text-muted-foreground lg:text-left">
          © {new Date().getFullYear()} PT. LCH Insurance Brokers
        </p>
      </section>
    </main>
  )
}
