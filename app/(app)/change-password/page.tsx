import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { ChangePasswordForm } from "@/components/auth/change-password-form"
import { currentUser } from "@/lib/server/session"

export const metadata: Metadata = {
  title: "Ganti Kata Sandi — LCH Insurance Brokers",
}

export default async function ChangePasswordPage() {
  const user = await currentUser()
  if (!user) {
    redirect("/login")
  }

  if (!user.mustChangePassword) {
    redirect("/")
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold tracking-tight">
            Setel Kata Sandi Baru
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Akun:{" "}
            <span className="font-medium text-foreground">{user.email}</span>
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  )
}
