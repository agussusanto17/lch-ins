"use client"

import * as React from "react"
import { FileSpreadsheet, FileText, Loader2, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"

import {
  deleteSlipAttachmentAction,
  setSlipAttachmentPrintAction,
  uploadSlipAttachmentAction,
} from "@/app/(app)/placement/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import type { SlipAttachment } from "@/lib/data/types"
import { dateShort } from "@/lib/format"
import { compressImage } from "@/lib/image-compress"
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_HINT,
  attachmentUploadProblem,
} from "@/lib/uploads"

const fileSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("id-ID")} KB`

const isExcel = (name: string) => /\.xlsx$/i.test(name)

/**
 * Lampiran placing slip, langsung tersimpan saat diunggah, terpisah dari Simpan Draft.
 * Isi lampiran yang dicentang Cetak isi ikut tercetak di halaman akhir (Harry, 9 November 2026).
 */
export function SlipAttachments({
  slipId,
  attachments,
  locked,
  onChange,
}: {
  /** Id slip yang sudah tersimpan; null untuk slip baru. */
  slipId: string | null
  attachments: SlipAttachment[]
  locked: boolean
  onChange: (list: SlipAttachment[]) => void
}) {
  const [description, setDescription] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [removing, setRemoving] = React.useState<SlipAttachment | null>(null)
  const [toggling, setToggling] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  async function upload(picked: File) {
    const file = await compressImage(picked)
    const problem = attachmentUploadProblem(file)
    if (problem) {
      toast.error(problem)
      return
    }
    if (!slipId) return
    const form = new FormData()
    form.set("file", file)
    form.set("description", description)
    setPending(true)
    const res = await uploadSlipAttachmentAction(slipId, form)
    setPending(false)
    if (inputRef.current) inputRef.current.value = ""
    if (!res.ok || !res.data) {
      toast.error("Gagal mengunggah lampiran", { description: res.error })
      return
    }
    setDescription("")
    onChange(res.data)
    toast.success("Lampiran ditambahkan", { description: file.name })
  }

  async function setPrint(item: SlipAttachment, printContent: boolean) {
    setToggling(item.id)
    const res = await setSlipAttachmentPrintAction(item.id, printContent)
    setToggling(null)
    if (!res.ok || !res.data) {
      toast.error("Gagal mengubah lampiran", { description: res.error })
      return
    }
    onChange(res.data)
  }

  async function remove(item: SlipAttachment) {
    setRemoving(null)
    const res = await deleteSlipAttachmentAction(item.id)
    if (!res.ok || !res.data) {
      toast.error("Gagal menghapus lampiran", { description: res.error })
      return
    }
    onChange(res.data)
    toast.success("Lampiran dihapus", { description: item.description || item.fileName })
  }

  return (
    <div className="flex flex-col gap-4">
      {!slipId ? (
        <p className="rounded-lg bg-muted/60 px-3 py-3 text-sm text-muted-foreground">
          Simpan draft dulu, lalu tambahkan lampiran seperti vessel schedule atau
          daftar unit.
        </p>
      ) : !locked ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              aria-label="Keterangan lampiran"
              className="sm:max-w-sm"
              maxLength={200}
              placeholder="Keterangan, misalnya Vessel Schedule (opsional)"
              value={description}
              disabled={pending}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
            >
              {pending ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Upload data-icon="inline-start" />
              )}
              {pending ? "Mengunggah…" : "Unggah file"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              className="hidden"
              aria-label="Pilih file lampiran"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void upload(file)
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {ATTACHMENT_HINT} Daftar lampiran tercetak di dokumen slip. Isi
            lampiran yang dicentang Cetak isi ikut tercetak di halaman akhir:
            gambar dan PDF per halaman, Excel sebagai tabel.
          </p>
        </div>
      ) : null}

      {attachments.length ? (
        <ul className="flex flex-col divide-y rounded-lg border">
          {attachments.map((a) => {
            const Icon = isExcel(a.fileName) ? FileSpreadsheet : FileText
            return (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.description || a.fileName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.description ? `${a.fileName} · ` : ""}
                    {fileSize(a.sizeBytes)} · {dateShort(a.uploadedAt)}
                  </p>
                </div>
                <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={a.printContent !== false}
                    disabled={locked || toggling === a.id}
                    onCheckedChange={(checked) => void setPrint(a, checked === true)}
                    aria-label={`Cetak isi ${a.description || a.fileName}`}
                  />
                  Cetak isi
                </label>
                {a.url ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    // Lebar tetap supaya centang Cetak isi sejajar di semua baris.
                    className="w-16"
                    nativeButton={false}
                    render={<a href={a.url} target="_blank" rel="noopener noreferrer" />}
                  >
                    {isExcel(a.fileName) ? "Unduh" : "Buka"}
                  </Button>
                ) : null}
                {!locked ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Hapus lampiran ${a.description || a.fileName}`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setRemoving(a)}
                  >
                    <Trash2 />
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
      ) : slipId ? (
        <p className="text-sm text-muted-foreground">Belum ada lampiran.</p>
      ) : null}

      <AlertDialog open={removing != null} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus lampiran?</AlertDialogTitle>
            <AlertDialogDescription>
              {removing?.description || removing?.fileName} dihapus dari slip ini
              beserta isi berkasnya.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => removing && void remove(removing)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
