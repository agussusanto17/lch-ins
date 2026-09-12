"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { BookOpenText, Pencil, Plus } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { wordingText } from "@/lib/data"
import type { ClauseListItem } from "@/lib/server/clauses"

const ALL = "all"

export interface MasterClausesProps {
  result: {
    items: ClauseListItem[]
    total: number
    page: number
    pageCount: number
  }
  groups: string[]
  cobs: { id: string; name: string; code: string }[]
  filter: { query: string; sourceGroup: string; cobId: string; page: number }
}

export function MasterClauses({
  result,
  groups,
  cobs,
  filter,
}: MasterClausesProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = React.useState(filter.query)

  /** Filter disimpan di URL supaya hasil pencarian bisa dibagikan dan di-back. */
  const push = React.useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v)
        else next.delete(k)
      }
      // Mengganti filter selalu balik ke halaman pertama.
      if (!("page" in patch)) next.delete("page")
      router.push(next.size ? `${pathname}?${next}` : pathname)
    },
    [pathname, router, searchParams]
  )

  // Ketikan ditunda sebentar supaya tidak memukul database tiap huruf.
  React.useEffect(() => {
    if (query === filter.query) return
    const t = setTimeout(() => push({ q: query }), 350)
    return () => clearTimeout(t)
  }, [query, filter.query, push])

  const groupItems = [
    { label: "Semua kelompok", value: ALL },
    ...groups.map((g) => ({ label: g, value: g })),
  ]
  const cobItems = [
    { label: "Semua class", value: ALL },
    ...cobs.map((c) => ({ label: c.name, value: c.id })),
  ]

  const showing = result.items.length

  return (
    <>
      <PageHeader
        title="Master Clauses"
        description="Pustaka klausula LCH, dipakai saat menyusun placing slip"
        actions={
          <Button
            render={<Link href="/underwriting/master-clauses/new" />}
            nativeButton={false}
          >
            <Plus data-icon="inline-start" />
            Tambah Clause
          </Button>
        }
      />

      <Card className="flex-row flex-wrap items-center gap-3 px-5 py-4">
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Cari judul atau isi wording…"
        />

        <Select
          items={groupItems}
          value={filter.sourceGroup || ALL}
          onValueChange={(v) => push({ group: v === ALL ? "" : (v as string) })}
        >
          <SelectTrigger size="sm" className="w-[170px]">
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

        <Select
          items={cobItems}
          value={filter.cobId || ALL}
          onValueChange={(v) => push({ cob: v === ALL ? "" : (v as string) })}
        >
          <SelectTrigger size="sm" className="w-[190px]">
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

        <span className="ml-auto text-sm text-muted-foreground">
          {result.total === 0
            ? "Tidak ada clause"
            : `${showing} dari ${result.total} clause`}
        </span>
      </Card>

      {result.items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenText />
            </EmptyMedia>
            <EmptyTitle>Tidak ada clause</EmptyTitle>
            <EmptyDescription>
              Ubah kata kunci atau filter di atas.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {result.items.map((c) => (
            <Card key={c.id} className="gap-2 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold">{c.title}</h3>
                    {c.sourceGroup ? (
                      <Badge variant="secondary">{c.sourceGroup}</Badge>
                    ) : null}
                    {c.cobName ? (
                      <Badge variant="outline">{c.cobName}</Badge>
                    ) : null}
                    {c.coverTypeName ? (
                      <Badge
                        variant="outline"
                        className="max-w-[240px] truncate"
                      >
                        {c.coverTypeName}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
                    {wordingText(c.wordingHtml)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${c.title}`}
                  className="shrink-0"
                  render={
                    <Link href={`/underwriting/master-clauses/${c.id}`} />
                  }
                  nativeButton={false}
                >
                  <Pencil />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {result.pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            Halaman {result.page} dari {result.pageCount}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={result.page <= 1}
              onClick={() => push({ page: String(result.page - 1) })}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={result.page >= result.pageCount}
              onClick={() => push({ page: String(result.page + 1) })}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      ) : null}
    </>
  )
}
