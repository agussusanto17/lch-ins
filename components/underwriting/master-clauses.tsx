"use client"

import * as React from "react"
import Link from "next/link"
import { BookOpenText, Pencil, Plus, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { SearchInput } from "@/components/shared/table-toolbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CLASSES_OF_BUSINESS, CLAUSES, wordingText } from "@/lib/data"

const COB_ITEMS = [
  { label: "Semua class", value: "all" },
  { label: "All (berlaku semua)", value: "All" },
  ...CLASSES_OF_BUSINESS.map((c) => ({ label: c, value: c })),
]

export function MasterClauses() {
  const [query, setQuery] = React.useState("")
  const [cob, setCob] = React.useState("all")

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return CLAUSES.filter((c) => {
      if (cob !== "all" && c.cob !== cob) return false
      if (!q) return true
      return c.title.toLowerCase().includes(q) || c.wording.toLowerCase().includes(q)
    })
  }, [query, cob])

  return (
    <>
      <PageHeader
        title="Master Clauses"
        description="Pustaka klausula per type of cover & class of business"
        actions={
          <Button render={<Link href="/underwriting/master-clauses/new" />} nativeButton={false}>
            <Plus data-icon="inline-start" />
            Tambah Clause
          </Button>
        }
      />

      <Card className="flex-row flex-wrap items-center gap-3 px-5 py-4">
        <SearchInput value={query} onValueChange={setQuery} placeholder="Cari judul atau isi wording…" />
        <Select items={COB_ITEMS} value={cob} onValueChange={(v) => setCob(v as string)}>
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
        <span className="text-muted-foreground ml-auto text-sm">
          {rows.length} dari {CLAUSES.length} clause
        </span>
      </Card>

      {rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenText />
            </EmptyMedia>
            <EmptyTitle>Tidak ada clause</EmptyTitle>
            <EmptyDescription>Ubah kata kunci atau filter class of business.</EmptyDescription>
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
                      <Badge variant="outline" className="max-w-[240px] truncate">
                        {c.typeOfCover}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground mt-2 line-clamp-3 text-[13px] leading-relaxed">
                    {wordingText(c.wording)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${c.title}`}
                    render={<Link href={`/underwriting/master-clauses/${c.id}`} />}
                    nativeButton={false}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Hapus ${c.title}`}
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
