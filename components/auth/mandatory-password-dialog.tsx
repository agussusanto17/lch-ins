"use client"

import * as React from "react"
import { ShieldCheck } from "lucide-react"

import { ChangePasswordForm } from "@/components/auth/change-password-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface MandatoryPasswordDialogProps {
  userEmail?: string
  userName?: string
}

/**
 * Modal wajib ganti kata sandi; tidak bisa ditutup (X, Escape, backdrop) sampai berhasil.
 * Overlay abu-abu tanpa blur, jadi dashboard di belakang tetap tampak tapi nonaktif.
 */
export function MandatoryPasswordDialog({
  userEmail,
}: MandatoryPasswordDialogProps) {
  return (
    <Dialog open={true} onOpenChange={() => {}} disablePointerDismissal={true}>
      <DialogContent
        showCloseButton={false}
        blur={false}
        overlayClassName="bg-neutral-950/45 dark:bg-black/60"
        className="w-full sm:max-w-[480px] rounded-xl border border-border/80 bg-background p-6 sm:p-7 shadow-lg gap-5"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
      >
        <DialogHeader className="text-left gap-2 p-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            <span>Keamanan Akun</span>
          </div>

          <DialogTitle className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Buat kata sandi baru
          </DialogTitle>

          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Kata sandi sementara untuk akun{" "}
            {userEmail ? (
              <strong className="font-medium text-foreground">{userEmail}</strong>
            ) : (
              "Anda"
            )}{" "}
            wajib diganti sebelum dapat mengakses back office LCH.
          </DialogDescription>
        </DialogHeader>

        <ChangePasswordForm />
      </DialogContent>
    </Dialog>
  )
}
