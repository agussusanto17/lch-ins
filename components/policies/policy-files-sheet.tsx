"use client"

import * as React from "react"
import { ExternalLink, FileText, FileUp, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { attachPolicyFileAction } from "@/app/(app)/policies/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { usePermission } from "@/components/auth/permission-provider"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { Policy, PolicyFileKind } from "@/lib/data"
import { dateShort } from "@/lib/format"
import {
  POLICY_FILE_KINDS,
  policyFileKindsFor,
  policyFilesOfKind,
} from "@/lib/policy-files"
import { store } from "@/lib/store"
import { uploadInParts } from "@/lib/upload-client"
import {
  MAX_POLICY_FILE_BYTES,
  POLICY_FILE_HINT,
  UPLOAD_ACCEPT,
  uploadProblem,
} from "@/lib/uploads"

/**
 * Berkas polis (PRD A-17): Polis, Premium Note, dan Commission Note (Agus,
 * 9 November 2026). Setiap upload menambah versi baru per jenis, versi lama
 * tetap tersimpan. Berkas sampai 25 MB diunggah per potongan.
 */
export function PolicyFilesSheet({
  policy,
  onOpenChange,
}: {
  policy: Policy | null
  onOpenChange: (open: boolean) => void
}) {
  const permission = usePermission()
  const canManage = permission.canManage("/policies")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const pickingKind = React.useRef<PolicyFileKind>("Policy")
  // Jenis yang sedang diunggah dan persentasenya.
  const [uploading, setUploading] = React.useState<{
    kind: PolicyFileKind
    percent: number
  } | null>(null)

  async function upload(file: File, kind: PolicyFileKind, label: string) {
    if (!policy) return
    const problem = uploadProblem(file, MAX_POLICY_FILE_BYTES)
    if (problem) {
      toast.error(problem, { description: file.name })
      return
    }
    setUploading({ kind, percent: 0 })
    const staged = await uploadInParts(file, "policy_file", (sent, total) =>
      setUploading({ kind, percent: Math.round((sent / total) * 100) })
    )
    const res =
      staged.ok && staged.data
        ? await attachPolicyFileAction(policy.id, staged.data.id, kind)
        : { ok: false as const, error: staged.error, data: undefined }
    setUploading(null)
    if (!res.ok || !res.data) {
      toast.error(`Gagal mengunggah ${label} ${file.name}`, { description: res.error })
      return
    }
    store.upsert("policies", res.data)
    const latest = policyFilesOfKind(res.data.files, kind)[0]
    toast.success(`${label} v${latest?.version ?? ""} tersimpan`, {
      description: file.name,
    })
  }

  return (
    <Sheet open={policy != null} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b py-5">
          <SheetTitle className="text-base">Berkas Polis</SheetTitle>
          <SheetDescription>
            {policy?.policyNo} · {policy?.insuredName}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
          {policyFileKindsFor(policy ?? {}).map(({ kind, label }) => {
            const files = policyFilesOfKind(policy?.files ?? [], kind)
            const busy = uploading?.kind === kind
            return (
              <section key={kind} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">{label}</h3>
                  {canManage ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploading != null}
                      onClick={() => {
                        pickingKind.current = kind
                        inputRef.current?.click()
                      }}
                    >
                      {busy ? (
                        <Loader2 data-icon="inline-start" className="animate-spin" />
                      ) : (
                        <FileUp data-icon="inline-start" />
                      )}
                      {busy
                        ? `Mengunggah ${uploading.percent}%`
                        : files.length
                          ? "Upload versi baru"
                          : "Upload"}
                    </Button>
                  ) : null}
                </div>
                {files.length === 0 ? (
                  <p className="rounded-lg bg-muted/60 px-3 py-3 text-center text-xs text-muted-foreground">
                    Belum ada {label} untuk polis ini.
                  </p>
                ) : (
                  files.map((f, i) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                    >
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{f.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          v{f.version} · diupload {dateShort(f.uploadedAt)}
                        </p>
                      </div>
                      {i === 0 ? <Badge variant="secondary">Terbaru</Badge> : null}
                      {f.url ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Buka ${f.fileName}`}
                          render={
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          }
                          nativeButton={false}
                        >
                          <ExternalLink />
                        </Button>
                      ) : (
                        <span
                          className="text-[11px] text-muted-foreground"
                          title="File contoh belum tersimpan di server"
                        >
                          contoh
                        </span>
                      )}
                    </div>
                  ))
                )}
              </section>
            )
          })}
        </div>

        {canManage && (
          <div className="border-t px-6 py-4">
            <input
              ref={inputRef}
              type="file"
              accept={UPLOAD_ACCEPT}
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0]
                const kind = pickingKind.current
                const label =
                  POLICY_FILE_KINDS.find((k) => k.kind === kind)?.label ?? "Berkas"
                if (file) upload(file, kind, label)
                e.target.value = ""
              }}
            />
            <p className="text-center text-xs text-muted-foreground">
              {POLICY_FILE_HINT} File baru disimpan sebagai versi berikutnya.
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
