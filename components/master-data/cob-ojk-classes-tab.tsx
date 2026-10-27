"use client"

import * as React from "react"
import { Pencil, Plus, Search } from "lucide-react"
import { toast } from "sonner"

import {
  createCobOjkClassAction,
  updateCobOjkClassAction,
} from "@/app/(app)/master-data/actions"
import { StatusBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import { usePermission } from "@/components/auth/permission-provider"
import { Badge } from "@/components/ui/badge"
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
import type { CobOjkClassRecord } from "@/lib/server/cob-ojk-classes"

export interface CobOjkClassesTabProps {
  initialCobOjkClasses: CobOjkClassRecord[]
}

export function CobOjkClassesTab({ initialCobOjkClasses }: CobOjkClassesTabProps) {
  const permission = usePermission()
  const canManage = permission.canManage("/master-data")
  const [items, setItems] = React.useState<CobOjkClassRecord[]>(initialCobOjkClasses)
  const [search, setSearch] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<CobOjkClassRecord | null>(null)
  const [name, setName] = React.useState("")
  const [isActive, setIsActive] = React.useState(true)

  const [prevInitial, setPrevInitial] = React.useState(initialCobOjkClasses)
  if (prevInitial !== initialCobOjkClasses) {
    setPrevInitial(initialCobOjkClasses)
    setItems(initialCobOjkClasses)
  }

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => it.name.toLowerCase().includes(q))
  }, [items, search])

  function openAdd() {
    setEditingItem(null)
    setName("")
    setIsActive(true)
    setDialogOpen(true)
  }

  function openEdit(item: CobOjkClassRecord) {
    setEditingItem(item)
    setName(item.name)
    setIsActive(item.isActive)
    setDialogOpen(true)
  }

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("Nama klasifikasi OJK wajib diisi")
      return
    }

    startTransition(async () => {
      if (editingItem) {
        const res = await updateCobOjkClassAction(editingItem.id, { name: trimmed, isActive })
        if (!res.ok || !res.data) {
          toast.error(res.error ?? "Gagal memperbarui klasifikasi OJK")
          return
        }
        setItems((prev) => prev.map((it) => (it.id === editingItem.id ? res.data! : it)))
        toast.success(`Klasifikasi OJK "${trimmed}" berhasil diperbarui`)
      } else {
        const res = await createCobOjkClassAction({ name: trimmed, isActive })
        if (!res.ok || !res.data) {
          toast.error(res.error ?? "Gagal menambahkan klasifikasi OJK")
          return
        }
        setItems((prev) => [res.data!, ...prev])
        toast.success(`Klasifikasi OJK "${trimmed}" berhasil ditambahkan`)
      }
      setDialogOpen(false)
    })
  }

  function handleToggle(item: CobOjkClassRecord) {
    const next = !item.isActive
    startTransition(async () => {
      const res = await updateCobOjkClassAction(item.id, { name: item.name, isActive: next })
      if (!res.ok || !res.data) {
        toast.error(res.error ?? "Gagal mengubah status klasifikasi OJK")
        return
      }
      setItems((prev) => prev.map((it) => (it.id === item.id ? res.data! : it)))
      toast.success(next ? `"${item.name}" diaktifkan` : `"${item.name}" dinonaktifkan`)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari klasifikasi OJK..."
            className="h-8.5 pl-8 text-xs"
          />
        </div>

        {canManage && (
          <Button onClick={openAdd} size="sm" className="h-8.5 gap-1.5 text-xs">
            <Plus className="size-3.5" />
            Tambah Klasifikasi OJK
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <Table className="min-w-160">
          <TableHeader>
            <TableRow className="bg-muted/50 text-xs">
              <TableHead>Nama Klasifikasi OJK</TableHead>
              <TableHead className="w-36 text-center">Polis Terkait</TableHead>
              <TableHead className="w-28">Status</TableHead>
              {canManage && (
                <>
                  <TableHead className="w-20 text-center">Aktif</TableHead>
                  <TableHead className="w-20 text-right pr-4">Aksi</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableEmpty
                colSpan={canManage ? 5 : 3}
                message={
                  search
                    ? `Tidak ada klasifikasi OJK yang cocok dengan "${search}".`
                    : "Belum ada master klasifikasi OJK. Klik tombol Tambah untuk membuat baru."
                }
              />
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id} className="text-xs hover:bg-muted/40">
                  <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-2xs font-normal">
                      {item._count.policies} polis
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.isActive ? "Active" : "Inactive"} />
                  </TableCell>
                  {canManage && (
                    <>
                      <TableCell className="text-center">
                        <Switch
                          checked={item.isActive}
                          onCheckedChange={() => handleToggle(item)}
                          disabled={isPending}
                          className="scale-75"
                          title={item.isActive ? "Nonaktifkan klasifikasi" : "Aktifkan klasifikasi"}
                        />
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(item)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          title="Edit klasifikasi OJK"
                        >
                          <Pencil className="size-3.5" />
                          <span className="sr-only">Edit {item.name}</span>
                        </Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Klasifikasi OJK" : "Tambah Klasifikasi OJK"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Klasifikasi lini usaha menurut OJK untuk pengelompokan pelaporan produksi dan polis.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2 text-xs">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ojk-name" className="text-xs font-medium">
                Nama Klasifikasi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ojk-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Rangka Kapal, Harta Benda, Kendaraan Bermotor"
                className="h-8.5 text-xs"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-2.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-foreground">Status Aktif</span>
                <span className="text-2xs text-muted-foreground">
                  Menentukan apakah opsi ini muncul di dropdown form polis
                </span>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              className="h-8.5 text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              className="h-8.5 text-xs"
            >
              {isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
