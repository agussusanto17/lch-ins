"use client"

import * as React from "react"
import { BookOpenText, Check, Search, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CLAUSES, type ClassOfBusiness } from "@/lib/data"
import { cn } from "@/lib/utils"

export function ClausePicker({
  cob,
  typeOfCover,
  selected,
  onChange,
}: {
  cob: ClassOfBusiness
  typeOfCover: string
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [query, setQuery] = React.useState("")

  const available = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return CLAUSES.filter((c) => {
      if (c.cob !== "All" && c.cob !== cob) return false
      if (c.typeOfCover && typeOfCover && c.typeOfCover !== typeOfCover)
        return false
      if (!q) return true
      return (
        c.title.toLowerCase().includes(q) || c.wording.toLowerCase().includes(q)
      )
    })
  }, [cob, typeOfCover, query])

  const selectedClauses = selected
    .map((id) => CLAUSES.find((c) => c.id === id))
    .filter(Boolean)

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="h-9 flex-1 sm:max-w-sm">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            placeholder="Cari klausula dari master…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>
        <Badge variant="secondary" className="h-8 px-3">
          <BookOpenText />
          {available.length} klausula relevan
        </Badge>
      </div>

      {!typeOfCover ? (
        <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning">
          Isi <strong>Type of Cover</strong> di Informasi Dasar agar klausula
          terfilter sesuai jenis asuransi.
        </p>
      ) : null}

      <ScrollArea className="h-[280px] rounded-xl border">
        <div className="divide-y">
          {available.map((c) => {
            const active = selected.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={cn(
                  "flex w-full gap-3 p-3 text-left transition-colors hover:bg-muted/60",
                  active && "bg-primary/5"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/35"
                  )}
                >
                  {active ? <Check className="size-3" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] leading-tight font-semibold">
                      {c.title}
                    </span>
                    <Badge variant="outline" className="shrink-0">
                      {c.cob}
                    </Badge>
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                    {c.wording}
                  </span>
                </span>
              </button>
            )
          })}
          {available.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Tidak ada klausula yang cocok.
            </p>
          ) : null}
        </div>
      </ScrollArea>

      {selectedClauses.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-primary">
            Klausula terpilih ({selectedClauses.length})
          </p>
          <div className="flex flex-col gap-1.5">
            {selectedClauses.map((c) => (
              <div
                key={c!.id}
                className="flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2 text-[13px]"
              >
                <span className="min-w-0 flex-1 truncate">{c!.title}</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Lepas klausula"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => toggle(c!.id)}
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
