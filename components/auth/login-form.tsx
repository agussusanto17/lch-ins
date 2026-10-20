"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Eye, EyeOff, LoaderCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signIn } from "@/lib/auth-client"

export function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const { data, error } = await signIn.email({ email, password })

    if (error) {
      // Better Auth error messages are in English and distinguish between
      // non-existent email and invalid password. Normalize to a single generic
      // message to prevent user enumeration.
      setError("Email atau kata sandi salah.")
      setPending(false)
      return
    }

    // Defensive validation against open redirect or protocol-relative redirect
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/"
    const userMustChange = (data?.user as { mustChangePassword?: boolean } | undefined)
      ?.mustChangePassword
    const target = userMustChange ? "/change-password" : safeNext

    router.push(target)
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
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
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
