"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Save, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  deleteClauseAction,
  saveClauseAction,
} from "@/app/(app)/placement/master-clauses/actions"
import { usePermission } from "@/components/auth/permission-provider"
import { PageShell } from "@/components/layout/page-header"
import {
  FormActions,
  FormBody,
  FormToolbar,
} from "@/components/shared/form-chrome"
import { SectionCard } from "@/components/shared/section-card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Switch } from "@/components/ui/switch"
import {
  CLAUSE_GROUP_SUGGESTIONS,
  CLAUSE_GROUP_TITLE_MAX,
} from "@/lib/clause-groups"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const LIST_HREF = "/placement/master-clauses"
const NONE = "none"

export interface ClauseFormValue {
  id: string
  title: string
  wordingHtml: string
  sourceGroup: string
  cobId: string | null
  coverTypeId: string | null
  inPackage: boolean
  packageGroup: string | null
  packageOrder: number
}

export function ClauseForm({
  clause,
  mode,
  canManage,
  cobs,
  coverTypes,
  groups,
}: {
  clause?: ClauseFormValue
  mode: "new" | "edit"
  canManage?: boolean
  cobs: { id: string; name: string; code: string; isActive: boolean }[]
  coverTypes: { id: string; name: string; code: string; cobId: string; isActive: boolean }[]
  groups: string[]
}) {
  const router = useRouter()
  const permission = usePermission()
  const canManageEffective =
    canManage ?? permission.canManage("/placement/master-clauses")
  const [title, setTitle] = React.useState(clause?.title ?? "")
  const [wording, setWording] = React.useState(clause?.wordingHtml ?? "")
  const [sourceGroup, setSourceGroup] = React.useState(
    clause?.sourceGroup ?? ""
  )
  const [cobId, setCobId] = React.useState(clause?.cobId ?? "")
  const [coverTypeId, setCoverTypeId] = React.useState(
    clause?.coverTypeId ?? ""
  )
  const [inPackage, setInPackage] = React.useState(clause?.inPackage ?? false)
  const [packageGroup, setPackageGroup] = React.useState(
    clause?.packageGroup ?? ""
  )
  const [packageOrder, setPackageOrder] = React.useState<number | null>(
    clause?.packageOrder ?? null
  )
  const [saving, setSaving] = React.useState(false)

  const words = wording
    .replace(/<[^>]+>/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

  const cobItems = [
    { label: "Berlaku semua class", value: NONE },
    ...cobs
      .filter((c) => c.isActive || c.id === cobId)
      .map((c) => ({ label: c.name, value: c.id })),
  ]
  const coverItems = [
    { label: "Berlaku semua type of cover", value: NONE },
    ...coverTypes
      .filter((t) => t.cobId === cobId && (t.isActive || t.id === coverTypeId))
      .map((t) => ({ label: `${t.code} — ${t.name}`, value: t.id })),
  ]
  const groupItems = [
    { label: "Tanpa kelompok", value: NONE },
    ...groups.map((g) => ({ label: g, value: g })),
  ]

  async function save() {
    setSaving(true)
    const result = await saveClauseAction(clause?.id ?? null, {
      title,
      wordingHtml: wording,
      sourceGroup,
      cobId: cobId || null,
      coverTypeId: coverTypeId || null,
      inPackage,
      packageGroup,
      packageOrder: packageOrder ?? 0,
    })
    setSaving(false)

    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(
      mode === "new" ? "Clause baru tersimpan" : "Clause diperbarui"
    )
    router.push(LIST_HREF)
  }

  async function remove() {
    if (!clause) return
    const result = await deleteClauseAction(clause.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(
      result.deactivated ? "Clause dinonaktifkan" : "Clause dihapus",
      result.deactivated
        ? {
            description: `Dipakai ${result.used} placing slip, jadi tidak dihapus supaya slip lama tetap bisa ditelusuri.`,
          }
        : undefined
    )
    router.push(LIST_HREF)
  }

  return (
    <PageShell className="gap-0 p-0">
      <FormToolbar
        title={
          mode === "new"
            ? "Clause Baru"
            : canManageEffective
              ? "Edit Clause"
              : "Detail Clause"
        }
        backHref={LIST_HREF}
        badge={
          sourceGroup ? <Badge variant="secondary">{sourceGroup}</Badge> : null
        }
        subtitle={title || "Belum ada judul"}
        meta={`${words} kata`}
      />

      <FormBody className="max-w-[980px]">
        <SectionCard title="Identitas Clause">
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="cl-title">Judul Clause *</FieldLabel>
              <Input
                id="cl-title"
                value={title}
                placeholder="Contoh: Machinery Breakdown Clause"
                autoFocus={canManageEffective}
                disabled={!canManageEffective}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field>
                <FieldLabel>Kelompok Produk</FieldLabel>
                <Select
                  items={groupItems}
                  value={sourceGroup || NONE}
                  disabled={!canManageEffective}
                  onValueChange={(v) =>
                    setSourceGroup(v === NONE ? "" : (v as string))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {groupItems.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Kelompok di pustaka wording LCH. Judul yang sama boleh dipakai
                  lagi asal kelompoknya berbeda.
                </p>
              </Field>

              <Field>
                <FieldLabel>Class of Business</FieldLabel>
                <Select
                  items={cobItems}
                  value={cobId || NONE}
                  disabled={!canManageEffective}
                  onValueChange={(v) => {
                    setCobId(v === NONE ? "" : (v as string))
                    setCoverTypeId("")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {cobItems.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Type of Cover</FieldLabel>
                <Select
                  items={coverItems}
                  value={coverTypeId || NONE}
                  disabled={!canManageEffective || !cobId}
                  onValueChange={(v) =>
                    setCoverTypeId(v === NONE ? "" : (v as string))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {coverItems.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {cobId
                    ? "Kosongkan agar berlaku di seluruh type of cover class ini."
                    : "Pilih class of business dulu."}
                </p>
              </Field>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Paket Klausul"
          description="Klausul paket dipasang sekaligus lewat tombol Pasang paket klausula di placing slip, untuk type of cover di atas atau semua type of cover class ini bila kosong."
        >
          <div className="flex flex-col gap-4">
            <Field orientation="horizontal">
              <Switch
                id="cl-in-package"
                checked={inPackage}
                disabled={!canManageEffective || !cobId}
                onCheckedChange={setInPackage}
              />
              <FieldLabel htmlFor="cl-in-package" className="font-normal">
                Masuk paket klausul bawaan
              </FieldLabel>
            </Field>
            {!cobId ? (
              <p className="text-xs text-muted-foreground">
                Pilih class of business dulu. Klausul untuk semua class tidak
                masuk paket.
              </p>
            ) : null}
            {inPackage && cobId ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="cl-package-group">
                    Kelompok di slip
                  </FieldLabel>
                  <Input
                    id="cl-package-group"
                    list="cl-package-group-options"
                    maxLength={CLAUSE_GROUP_TITLE_MAX}
                    value={packageGroup}
                    placeholder="Kosongkan bila tanpa judul kelompok"
                    disabled={!canManageEffective}
                    onChange={(e) => setPackageGroup(e.target.value)}
                  />
                  <datalist id="cl-package-group-options">
                    {CLAUSE_GROUP_SUGGESTIONS.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                  <p className="text-xs text-muted-foreground">
                    Misalnya Extensions atau General Conditions. Hanya dipakai
                    slip tanpa section.
                  </p>
                </Field>
                <Field>
                  <FieldLabel htmlFor="cl-package-order">Urutan</FieldLabel>
                  <NumberInput
                    id="cl-package-order"
                    value={packageOrder}
                    placeholder="0"
                    disabled={!canManageEffective}
                    onValueChange={(v) => setPackageOrder(v)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Kecil lebih dulu. Urutan sama diurutkan menurut judul.
                  </p>
                </Field>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard
          title="Isi Wording Clause"
          description="Format ikut terbawa ke placing slip dan dokumen turunannya. Boleh dikosongkan bila klausul cukup dicetak judulnya."
        >
          <RichTextEditor
            value={wording}
            onChange={setWording}
            editable={canManageEffective}
            minHeight="26rem"
            placeholder="Tulis wording klausula lengkap — gunakan daftar bernomor untuk sub-ayat."
          />
        </SectionCard>
      </FormBody>

      <FormActions>
        {canManageEffective && mode === "edit" ? (
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              <Trash2 data-icon="inline-start" />
              Hapus Clause
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus clause ini?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{clause?.title}&rdquo; akan dihapus dari master. Kalau
                  sudah dipakai placing slip, clause-nya hanya dinonaktifkan
                  supaya slip lama tetap bisa ditelusuri.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={remove}>Hapus</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            render={<Link href={LIST_HREF} />}
            nativeButton={false}
          >
            {canManageEffective ? "Batal" : "Kembali"}
          </Button>
          {canManageEffective ? (
            <Button onClick={save} disabled={saving}>
              <Save data-icon="inline-start" />
              {saving ? "Menyimpan…" : "Simpan Clause"}
            </Button>
          ) : null}
        </div>
      </FormActions>
    </PageShell>
  )
}
