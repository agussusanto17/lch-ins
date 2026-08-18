"use client"

import * as React from "react"
import { Check, Pencil, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/page-header"
import { SectionCard } from "@/components/shared/section-card"
import { SearchInput } from "@/components/shared/table-toolbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CLASSES_OF_BUSINESS, CLAUSES } from "@/lib/data"

const COB_ITEMS = [
  { label: "Semua class", value: "all" },
  { label: "All (berlaku semua)", value: "All" },
  ...CLASSES_OF_BUSINESS.map((c) => ({ label: c, value: c })),
]

export function MasterClauses() {
  const [query, setQuery] = React.useState("")
  const [cob, setCob] = React.useState("all")
  const [showForm, setShowForm] = React.useState(false)

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return CLAUSES.filter((c) => {
      if (cob !== "all" && c.cob !== cob) return false
      if (!q) return true
      return (
        c.title.toLowerCase().includes(q) || c.wording.toLowerCase().includes(q)
      )
    })
  }, [query, cob])

  return (
    <>
      <PageHeader
        title="Master Clauses"
        description="Pustaka klausula per type of cover & class of business"
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus data-icon="inline-start" />
            Tambah Clause
          </Button>
        }
      />

      {showForm ? (
        <SectionCard
          title="Clause Baru"
          action={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Tutup"
              onClick={() => setShowForm(false)}
            >
              <X />
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="cl-title">Judul Clause *</FieldLabel>
              <Input
                id="cl-title"
                placeholder="Contoh: Machinery Breakdown Clause"
                autoFocus
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="cl-cover">Type of Cover</FieldLabel>
                <Input
                  id="cl-cover"
                  placeholder="Kosongkan = berlaku semua type"
                />
              </Field>
              <Field>
                <FieldLabel>Class of Business</FieldLabel>
                <Select items={COB_ITEMS.slice(1)} defaultValue="All">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {COB_ITEMS.slice(1).map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="cl-wording">Isi Wording Clause</FieldLabel>
              <Textarea
                id="cl-wording"
                rows={6}
                placeholder="Teks wording klausula lengkap…"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Batal
              </Button>
              <Button
                onClick={() => {
                  setShowForm(false)
                  toast.success("Clause tersimpan", {
                    description: "Demo statis.",
                  })
                }}
              >
                <Check data-icon="inline-start" />
                Simpan
              </Button>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <Card className="flex-row flex-wrap items-center gap-3 px-5 py-4">
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Cari judul atau isi wording…"
        />
        <Select
          items={COB_ITEMS}
          value={cob}
          onValueChange={(v) => setCob(v as string)}
        >
          <SelectTrigger size="sm" className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {COB_ITEMS.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">
          {rows.length} dari {CLAUSES.length} clause
        </span>
      </Card>

      {rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Trash2 />
            </EmptyMedia>
            <EmptyTitle>Tidak ada clause</EmptyTitle>
            <EmptyDescription>
              Ubah kata kunci atau filter class of business.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((c) => (
            <Card key={c.id} className="gap-2 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold">{c.title}</h3>
                    <Badge variant="secondary">{c.cob}</Badge>
                    {c.typeOfCover ? (
                      <Badge
                        variant="outline"
                        className="max-w-[240px] truncate"
                      >
                        {c.typeOfCover}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    {c.wording}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Edit clause"
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Hapus clause"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
