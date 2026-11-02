"use client"

import * as React from "react"
import { Pencil, Plus, Power, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  createDeductibleOptionAction,
  deleteDeductibleOptionAction,
  toggleDeductibleOptionStatusAction,
  updateDeductibleOptionAction,
} from "@/app/(app)/master-data/actions"
import { usePermission } from "@/components/auth/permission-provider"
import {
  ACTION_COL_CLASS,
  RowActions,
  type RowAction,
} from "@/components/shared/row-actions"
import { StatusBadge } from "@/components/shared/status-badge"
import { TableEmpty } from "@/components/shared/table-empty"
import { TablePagination, usePagination } from "@/components/shared/table-pagination"
import { SearchInput } from "@/components/shared/table-toolbar"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { CobOption } from "@/lib/form-options"
import type { DeductibleOptionRecord } from "@/lib/server/master-data"

const ALL_COB = "all"
/** Nilai Select untuk type of cover kosong: berlaku untuk semua TOC di COB. */
const ALL_COVERS = "all-covers"

export interface DeductibleOptionsTabProps {
  initialOptions: DeductibleOptionRecord[]
  /** COB dan type of cover yang aktif, untuk filter dan isian dialog. */
  cobs: CobOption[]
}

export function DeductibleOptionsTab({ initialOptions, cobs }: DeductibleOptionsTabProps) {
  const permission = usePermission()
  const canManage = permission.canManage("/master-data")
  const [options, setOptions] = React.useState(initialOptions)
  const [prevInitial, setPrevInitial] = React.useState(initialOptions)
  if (prevInitial !== initialOptions) {
    setPrevInitial(initialOptions)
    setOptions(initialOptions)
  }
  const [search, setSearch] = React.useState("")
  const [cobFilter, setCobFilter] = React.useState(ALL_COB)
  const [isPending, startTransition] = React.useTransition()

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<DeductibleOptionRecord | null>(null)
  const [cobId, setCobId] = React.useState("")
  const [coverTypeId, setCoverTypeId] = React.useState(ALL_COVERS)
  const [text, setText] = React.useState("")

  const cobItems = [
    { label: "Semua COB", value: ALL_COB },
    ...cobs.map((c) => ({ label: c.label, value: c.id })),
  ]
  const dialogCobItems = cobs.map((c) => ({ label: c.label, value: c.id }))
  const dialogCovers = cobs.find((c) => c.id === cobId)?.covers ?? []
  const coverItems = [
    { label: "Semua type of cover", value: ALL_COVERS },
    ...dialogCovers.map((c) => ({ label: `${c.code} ${c.name}`, value: c.id })),
  ]

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return options.filter((o) => {
      if (cobFilter !== ALL_COB && o.cobId !== cobFilter) return false
      if (!q) return true
      return [o.text, o.coverTypeName ?? "", o.coverTypeCode ?? ""].some((v) =>
        v.toLowerCase().includes(q)
      )
    })
  }, [options, search, cobFilter])

  const { page, pageSize, totalItems, paginatedItems, setPage, setPageSize } =
    usePagination(filtered, 15)

  function openAddDialog() {
    setEditing(null)
    setCobId(cobFilter !== ALL_COB ? cobFilter : (cobs[0]?.id ?? ""))
    setCoverTypeId(ALL_COVERS)
    setText("")
    setDialogOpen(true)
  }

  function openEditDialog(o: DeductibleOptionRecord) {
    setEditing(o)
    setCobId(o.cobId)
    setCoverTypeId(o.coverTypeId ?? ALL_COVERS)
    setText(o.text)
    setDialogOpen(true)
  }

  function handleSave() {
    if (!cobId) {
      toast.error("Pilih COB")
      return
    }
    if (text.trim().length < 2) {
      toast.error("Teks deductible minimal 2 karakter")
      return
    }
    const payload = {
      cobId,
      coverTypeId: coverTypeId === ALL_COVERS ? null : coverTypeId,
      text,
    }
    startTransition(async () => {
      const res = editing
        ? await updateDeductibleOptionAction(editing.id, payload)
        : await createDeductibleOptionAction(payload)
      if (!res.ok || !res.data) {
        toast.error(res.error)
        return
      }
      const saved = res.data
      setOptions((prev) =>
        editing ? prev.map((o) => (o.id === saved.id ? saved : o)) : [saved, ...prev]
      )
      toast.success(editing ? "Deductible diperbarui" : "Deductible ditambahkan")
      setDialogOpen(false)
    })
  }

  function handleToggle(o: DeductibleOptionRecord) {
    const next = !o.isActive
    startTransition(async () => {
      const res = await toggleDeductibleOptionStatusAction(o.id, next)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setOptions((prev) => prev.map((x) => (x.id === o.id ? { ...x, isActive: next } : x)))
      toast.success(next ? "Deductible diaktifkan" : "Deductible dinonaktifkan")
    })
  }

  function handleDelete(o: DeductibleOptionRecord) {
    startTransition(async () => {
      const res = await deleteDeductibleOptionAction(o.id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setOptions((prev) => prev.filter((x) => x.id !== o.id))
      toast.success("Deductible dihapus")
    })
  }

  function actionsFor(o: DeductibleOptionRecord): RowAction[] {
    return [
      { label: "Edit deductible", icon: Pencil, onSelect: () => openEditDialog(o) },
      {
        label: o.isActive ? "Nonaktifkan" : "Aktifkan",
        icon: Power,
        disabled: isPending,
        onSelect: () => handleToggle(o),
      },
      {
        label: "Hapus",
        icon: Trash2,
        destructive: true,
        disabled: isPending,
        confirm: {
          title: "Hapus pilihan deductible ini?",
          description: `"${o.text}" tidak lagi muncul di pilihan placing slip. Slip yang sudah memakainya tidak berubah.`,
          actionLabel: "Hapus",
        },
        onSelect: () => handleDelete(o),
      },
    ]
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            items={cobItems}
            value={cobFilter}
            onValueChange={(v) => {
              setCobFilter((v as string) ?? ALL_COB)
              setPage(1)
            }}
          >
            <SelectTrigger size="sm" className="w-52" aria-label="Filter COB">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {cobItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Cari deductible atau type of cover…"
          />
        </div>

        {canManage && (
          <Button onClick={openAddDialog} disabled={!cobs.length}>
            <Plus data-icon="inline-start" />
            Tambah Deductible
          </Button>
        )}
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <Table className="min-w-180">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {canManage && <TableHead className={ACTION_COL_CLASS}>Aksi</TableHead>}
              <TableHead className="w-72">Type of Cover</TableHead>
              <TableHead>Deductible</TableHead>
              <TableHead className="w-28 pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableEmpty
                colSpan={canManage ? 4 : 3}
                message={
                  search || cobFilter !== ALL_COB
                    ? "Tidak ada deductible yang cocok dengan filter."
                    : "Belum ada pilihan deductible. Tambahkan supaya bisa dipilih di placing slip."
                }
              />
            ) : (
              paginatedItems.map((o) => (
                <TableRow key={o.id}>
                  {canManage && (
                    <TableCell className={ACTION_COL_CLASS}>
                      <RowActions actions={actionsFor(o)} />
                    </TableCell>
                  )}
                  <TableCell className="align-top">
                    <div className="font-medium text-foreground">
                      {o.coverTypeId
                        ? `${o.coverTypeCode} ${o.coverTypeName}`
                        : "Semua type of cover"}
                    </div>
                    <div className="text-muted-foreground">{o.cobName}</div>
                  </TableCell>
                  <TableCell className="align-top whitespace-normal text-foreground">
                    {o.text}
                  </TableCell>
                  <TableCell className="pr-4 align-top">
                    <StatusBadge status={o.isActive ? "Active" : "Inactive"} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <TablePagination
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        itemName="deductible"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Deductible" : "Tambah Deductible"}</DialogTitle>
            <DialogDescription>
              Muncul sebagai pilihan di isian deductible per cover pada placing
              slip dengan type of cover ini. Teksnya tetap bisa diubah di slip.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deductible-cob">
                Class of Business <span className="text-destructive">*</span>
              </Label>
              <Select
                items={dialogCobItems}
                value={cobId || null}
                onValueChange={(v) => {
                  setCobId((v as string) ?? "")
                  setCoverTypeId(ALL_COVERS)
                }}
              >
                <SelectTrigger id="deductible-cob" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {dialogCobItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deductible-cover">Type of Cover</Label>
              <Select
                items={coverItems}
                value={coverTypeId}
                onValueChange={(v) => setCoverTypeId((v as string) ?? ALL_COVERS)}
              >
                <SelectTrigger id="deductible-cover" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {coverItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deductible-text">
                Teks Deductible <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="deductible-text"
                rows={3}
                maxLength={500}
                placeholder="Contoh: 10% of claim minimum IDR 10,000,000 each and every loss"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
            >
              Batal
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={isPending}>
              {editing ? "Simpan Perubahan" : "Simpan Deductible"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
