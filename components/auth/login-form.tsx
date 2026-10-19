"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signIn } from "@/lib/auth-client"

export function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const { error } = await signIn.email({ email, password })

    if (error) {
      // Pesan dari Better Auth berbahasa Inggris dan membedakan email tidak
      // ditemukan dengan kata sandi salah. Keduanya disamakan di sini supaya
      // tidak bisa dipakai menebak email mana yang terdaftar.
      setError("Email atau kata sandi salah.")
      setPending(false)
      return
    }

    router.push(next)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@lch.co.id"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="password">Kata sandi</FieldLabel>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" />
            Masuk…
          </>
        ) : (
          "Masuk"
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Lupa kata sandi? Hubungi Admin untuk disetel ulang.
      </p>
    </form>
  )
}
