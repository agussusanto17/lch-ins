"use client"

import { useState } from "react"
import { useActionState } from "react"
import { AlertTriangle, Eye, EyeOff, KeyRound, LoaderCircle, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { changePasswordAction, type ChangePasswordResult } from "@/app/(app)/change-password/actions"

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<
    ChangePasswordResult | null,
    FormData
  >(changePasswordAction, null)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p>
          Akun Anda diwajibkan menyetel kata sandi baru sebelum dapat mengakses
          sistem back office LCH.
        </p>
      </div>

      <Field>
        <FieldLabel htmlFor="currentPassword">Kata sandi saat ini</FieldLabel>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          placeholder="Masukkan kata sandi sementara"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="newPassword">Kata sandi baru</FieldLabel>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showNewPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            placeholder="Minimal 10 karakter"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showNewPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showNewPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </Field>

      <Field>
        <FieldLabel htmlFor="confirmPassword">
          Konfirmasi kata sandi baru
        </FieldLabel>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            placeholder="Ulangi kata sandi baru"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showConfirmPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showConfirmPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </Field>

      {state?.error ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} className="mt-2 w-full">
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" />
            Menyimpan kata sandi…
          </>
        ) : (
          <>
            <KeyRound className="size-4" />
            Simpan Kata Sandi Baru
          </>
        )}
      </Button>
    </form>
  )
}
