"use client"

import * as React from "react"
import { ImageUp, Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  createDocumentSignatoryAction,
  deleteDocumentSignatoryAction,
  setDefaultDocumentSignatoryAction,
  updateDocumentSignatoryAction,
} from "@/app/(app)/master-data/actions"
import { usePermission } from "@/components/auth/permission-provider"
import {
  ACTION_COL_CLASS,
  RowActions,
  type RowAction,
} from "@/components/shared/row-actions"
import { ToneBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { DocumentSignatory } from "@/lib/document-signatories"
import { uploadInParts } from "@/lib/upload-client"
import {
  SIGNATURE_ACCEPT,
  SIGNATURE_HINT,
  signatureUploadProblem,
} from "@/lib/uploads"
import { cn } from "@/lib/utils"

/** Gambar di atas latar putih seperti kertas, supaya PNG transparan tetap terbaca di mode gelap. */
function SignaturePreview({
  src,
  alt,
  className,
}: {
  src: string | null
  alt: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-md border bg-white p-1",
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- berkas privat dari /api/files atau pratinjau lokal
        <img src={src} alt={alt} className="h-full w-auto max-w-full object-contain" />
      ) : (
        <span className="text-xs text-neutral-500">Belum ada gambar</span>
      )}
    </div>
  )
}

/**
 * Daftar tanda tangan dan cap untuk cetak dokumen penutupan (Harry, 19 November 2026).
 * Gambar diunggah lewat alur potongan yang sama dengan berkas lain, lalu ditautkan ke namanya.
 */
export function SignaturesTab({
  initialSignatories,
}: {
  initialSignatories: DocumentSignatory[]
}) {
  const permission = usePermission()
  const canManage = permission.canManage("/master-data")
  const [signatories, setSignatories] = React.useState(initialSignatories)
  const [isPending, startTransition] = React.useTransition()

  const [prevInitial, setPrevInitial] = React.useState(initialSignatories)
  if (prevInitial !== initialSignatories) {
    setPrevInitial(initialSignatories)
    setSignatories(initialSignatories)
  }

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<DocumentSignatory | null>(null)
  const [name, setName] = React.useState("")
  // Gambar yang baru dipilih beserta URL pratinjaunya; URL lama dilepas saat diganti.
  const [picked, setPicked] = React.useState<{ file: File; url: string } | null>(null)
  const [isDefault, setIsDefault] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const file = picked?.file ?? null

  const firstOne = !editing && signatories.length === 0

  function replacePicked(next: File | null) {
    if (picked) URL.revokeObjectURL(picked.url)
    setPicked(next ? { file: next, url: URL.createObjectURL(next) } : null)
  }

  function openAdd() {
    setEditing(null)
    setName("")
    replacePicked(null)
    setIsDefault(signatories.length === 0)
    setDialogOpen(true)
  }

  function openEdit(item: DocumentSignatory) {
    setEditing(item)
    setName(item.name)
    replacePicked(null)
    setIsDefault(item.isDefault)
    setDialogOpen(true)
  }

  function pick(next: File | undefined) {
    if (inputRef.current) inputRef.current.value = ""
    if (!next) return
    const problem = signatureUploadProblem(next)
    if (problem) {
      toast.error(problem)
      return
    }
    replacePicked(next)
  }

  async function save() {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      toast.error("Nama minimal 2 karakter")
      return
    }
    if (!editing && !file) {
      toast.error("Pilih gambar tanda tangan")
      return
    }
    setSaving(true)
    let fileId: string | null = null
    if (file) {
      const staged = await uploadInParts(file, "signature")
      if (!staged.ok || !staged.data) {
        setSaving(false)
        toast.error("Gagal mengunggah gambar", { description: staged.error })
        return
      }
      fileId = staged.data.id
    }
    const res = editing
      ? await updateDocumentSignatoryAction(editing.id, { name: trimmed, fileId })
      : await createDocumentSignatoryAction({ name: trimmed, fileId, isDefault: firstOne || isDefault })
    setSaving(false)
    if (!res.ok || !res.data) {
      toast.error(editing ? "Gagal menyimpan perubahan" : "Gagal menambah tanda tangan", {
        description: res.error,
      })
      return
    }
    setSignatories(res.data)
    setDialogOpen(false)
    toast.success(editing ? "Tanda tangan diperbarui" : "Tanda tangan ditambahkan", {
      description: trimmed,
    })
  }

  function run(
    action: () => Promise<{ ok: boolean; data?: DocumentSignatory[]; error?: string }>,
    success: string
  ) {
    startTransition(async () => {
      const res = await action()
      if (!res.ok || !res.data) {
        toast.error(res.error ?? "Gagal menyimpan perubahan")
        return
      }
      setSignatories(res.data)
      toast.success(success)
    })
  }

  function rowActions(item: DocumentSignatory): RowAction[] {
    return [
      { label: "Edit", icon: Pencil, onSelect: () => openEdit(item) },
      {
        label: item.isDefault ? "Sudah default" : "Jadikan default",
        icon: Star,
        disabled: isPending || item.isDefault,
        onSelect: () =>
          run(
            () => setDefaultDocumentSignatoryAction(item.id),
            `${item.name} jadi tanda tangan default`
          ),
      },
      {
        label: "Hapus",
        icon: Trash2,
        destructive: true,
        disabled: isPending,
        confirm: {
          title: "Hapus tanda tangan ini?",
          description: item.isDefault && signatories.length > 1
            ? `Tanda tangan ${item.name} dihapus permanen, dan tanda tangan berikutnya menjadi default. Dokumen yang sudah dicetak tidak berubah.`
            : `Tanda tangan ${item.name} dihapus permanen. Dokumen yang sudah dicetak tidak berubah.`,
          actionLabel: "Hapus",
        },
        onSelect: () =>
          run(() => deleteDocumentSignatoryAction(item.id), `Tanda tangan ${item.name} dihapus`),
      },
    ]
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage ? (
        <div className="flex justify-end">
          <Button onClick={openAdd}>
            <Plus data-icon="inline-start" />
            Tambah Tanda Tangan
          </Button>
        </div>
      ) : null}

      <Card className="gap-0 overflow-hidden py-0">
        <Table className="min-w-160">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {canManage && <TableHead className={ACTION_COL_CLASS}>Aksi</TableHead>}
              <TableHead className="w-60">Gambar</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead className="w-32 pr-4">Pilihan Awal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {signatories.length === 0 ? (
              <TableEmpty
                colSpan={canManage ? 4 : 3}
                message="Belum ada tanda tangan. Dokumen dicetak tanpa tanda tangan sampai ada yang ditambahkan."
              />
            ) : (
              signatories.map((item) => (
                <TableRow key={item.id}>
                  {canManage && (
                    <TableCell className={ACTION_COL_CLASS}>
                      <RowActions actions={rowActions(item)} />
                    </TableCell>
                  )}
                  <TableCell>
                    <SignaturePreview
                      src={item.imageUrl}
                      alt={`Tanda tangan ${item.name}`}
                      className="h-14 w-52"
                    />
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                  <TableCell className="pr-4">
                    {item.isDefault ? <ToneBadge tone="success">Default</ToneBadge> : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => !saving && setDialogOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Tanda Tangan" : "Tambah Tanda Tangan"}</DialogTitle>
            <DialogDescription>
              Gambar dicetak di kolom Disiapkan oleh / Prepared by, setinggi sekitar 1,5 cm di
              atas nama perusahaan.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signatory-name">
                Nama <span className="text-destructive">*</span>
              </Label>
              <Input
                id="signatory-name"
                placeholder="Contoh: Rusli"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Muncul sebagai pilihan di halaman cetak, tidak ikut tercetak.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signatory-image">
                Gambar tanda tangan{editing ? null : <span className="text-destructive"> *</span>}
              </Label>
              <SignaturePreview
                src={picked?.url ?? editing?.imageUrl ?? null}
                alt={name ? `Tanda tangan ${name}` : "Pratinjau tanda tangan"}
                className="h-24 w-full"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => inputRef.current?.click()}
                >
                  <ImageUp data-icon="inline-start" />
                  {file || editing ? "Ganti gambar" : "Pilih gambar"}
                </Button>
                {file ? (
                  <span className="min-w-0 truncate text-xs text-muted-foreground">
                    {file.name}
                  </span>
                ) : null}
              </div>
              <input
                ref={inputRef}
                id="signatory-image"
                type="file"
                accept={SIGNATURE_ACCEPT}
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0])}
              />
              <p className="text-xs text-muted-foreground">{SIGNATURE_HINT}</p>
            </div>

            {editing ? null : (
              <div className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Jadikan default</span>
                  <span className="text-[11px] text-muted-foreground">
                    {firstOne
                      ? "Tanda tangan pertama otomatis jadi default."
                      : "Terpilih otomatis saat dokumen dibuka."}
                  </span>
                </div>
                <Switch
                  checked={firstOne || isDefault}
                  disabled={firstOne}
                  onCheckedChange={setIsDefault}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => setDialogOpen(false)}
            >
              Batal
            </Button>
            <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}
              {saving ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Simpan Tanda Tangan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
