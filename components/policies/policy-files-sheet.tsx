"use client"

import * as React from "react"
import { ExternalLink, FileText, FileUp, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { uploadPolicyFileAction } from "@/app/(app)/policies/actions"
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
import type { Policy } from "@/lib/data"
import { dateShort } from "@/lib/format"
import { UPLOAD_ACCEPT, UPLOAD_HINT, uploadProblem } from "@/lib/uploads"

/**
 * Riwayat softcopy polis (PRD A-17). Setiap upload menambah versi baru,
 * versi lama tetap tersimpan.
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
  const [uploading, setUploading] = React.useState(false)
  const files = [...(policy?.files ?? [])].reverse()

  async function upload(file: File) {
    if (!policy) return
    const problem = uploadProblem(file)
    if (problem) {
      toast.error(problem, { description: file.name })
      return
    }
    setUploading(true)
    const body = new FormData()
    body.append("file", file)
    const res = await uploadPolicyFileAction(policy.id, body)
    setUploading(false)
    if (!res.ok || !res.data) {
      toast.error(`Gagal mengunggah ${file.name}`, { description: res.error })
      return
    }
    const latest = res.data.files[res.data.files.length - 1]
    toast.success(`Softcopy v${latest?.version ?? ""} tersimpan`, {
      description: file.name,
    })
  }

  return (
    <Sheet open={policy != null} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b py-5">
          <SheetTitle className="text-base">Softcopy Polis</SheetTitle>
          <SheetDescription>
            {policy?.policyNo} · {policy?.insuredName}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-5">
          {files.length === 0 ? (
            <p className="rounded-lg bg-muted/60 px-3 py-6 text-center text-sm text-muted-foreground">
              Belum ada softcopy untuk polis ini.
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
                if (file) upload(file)
                e.target.value = ""
              }}
            />
            <Button
              className="w-full"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <FileUp data-icon="inline-start" />
              )}
              {uploading ? "Mengunggah..." : "Upload versi baru"}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {UPLOAD_HINT}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
