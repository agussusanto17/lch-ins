"use client"

import * as React from "react"
import { BookOpenText, Check, Pencil, RotateCcw, Search, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  CLAUSES,
  resolveSlipClauses,
  wordingHtml,
  type ClassOfBusiness,
  type ClauseOverride,
} from "@/lib/data"
import { cn } from "@/lib/utils"
import {
  getClausesForPickerAction,
  type ClausePickerItem,
} from "@/app/(app)/underwriting/actions"

export function ClausePicker({
  cob,
  typeOfCover,
  selected,
  overrides,
  onChange,
  onOverridesChange,
  masterClauses: propMasterClauses,
}: {
  cob: ClassOfBusiness
  typeOfCover: string
  selected: string[]
  overrides: Record<string, ClauseOverride>
  onChange: (ids: string[]) => void
  onOverridesChange: (overrides: Record<string, ClauseOverride>) => void
  masterClauses?: ClausePickerItem[]
}) {
  const [query, setQuery] = React.useState("")
  const [editing, setEditing] = React.useState<string | null>(null)
  /** Editor hanya membaca isi awalnya, jadi reset ke master perlu remount. */
  const [resetTick, setResetTick] = React.useState(0)
  const [fetchedClauses, setFetchedClauses] = React.useState<ClausePickerItem[]>([])

  React.useEffect(() => {
    if (propMasterClauses && propMasterClauses.length > 0) return
    let active = true
    getClausesForPickerAction().then((res) => {
      if (active && res.ok && res.data) {
        setFetchedClauses(res.data)
      }
    })
    return () => {
      active = false
    }
  }, [propMasterClauses])

  const pool: ClausePickerItem[] = React.useMemo(() => {
    const list = propMasterClauses ?? (fetchedClauses.length > 0 ? fetchedClauses : null)
    if (list && list.length > 0) return list
    return CLAUSES.map((c) => ({
      id: c.id,
      title: c.title,
      wording: c.wording,
      sourceGroup: c.typeOfCover || "",
      cobName: c.cob === "All" ? null : c.cob,
      coverTypeName: c.typeOfCover || null,
    }))
  }, [propMasterClauses, fetchedClauses])

  const available = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return pool.filter((c) => {
      if (c.cobName && c.cobName.toLowerCase() !== "all" && c.cobName.toLowerCase() !== cob.toLowerCase()) {
        return false
      }
      if (c.coverTypeName && typeOfCover) {
        const coverNorm = typeOfCover.toLowerCase()
        const cCoverNorm = c.coverTypeName.toLowerCase()
        if (!coverNorm.includes(cCoverNorm) && !cCoverNorm.includes(coverNorm)) {
          return false
        }
      }
      if (!q) return true
      return (
        c.title.toLowerCase().includes(q) || c.wording.toLowerCase().includes(q)
      )
    })
  }, [pool, cob, typeOfCover, query])

  const selectedClauses = React.useMemo(() => {
    return resolveSlipClauses(
      {
        clauseIds: selected,
        clauseOverrides: overrides,
      },
      pool
    )
  }, [selected, overrides, pool])

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
      // Klausula yang dilepas tidak menyimpan override lagi.
      if (overrides[id]) {
        const next = { ...overrides }
        delete next[id]
        onOverridesChange(next)
      }
      if (editing === id) setEditing(null)
      return
    }
    onChange([...selected, id])
  }

  function patchOverride(id: string, patch: Partial<ClauseOverride>) {
    const master = pool.find((c) => c.id === id) ?? CLAUSES.find((c) => c.id === id)
    if (!master) return
    const base = overrides[id] ?? {
      title: master.title,
      wording: wordingHtml(master.wording),
    }
    onOverridesChange({ ...overrides, [id]: { ...base, ...patch } })
  }

  function resetOverride(id: string) {
    const next = { ...overrides }
    delete next[id]
    onOverridesChange(next)
    setResetTick((t) => t + 1)
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

      <ScrollArea className="h-[280px] rounded-lg border">
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
                  active && "bg-muted/50"
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
                      {c.cobName ?? c.sourceGroup ?? "Umum"}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-primary">
              Klausula terpilih ({selectedClauses.length})
            </p>
            <p className="text-[11px] text-muted-foreground">
              Wording bisa diedit untuk slip ini saja. Master Clauses tidak
              berubah.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            {selectedClauses.map((c) => {
              const open = editing === c.id
              return (
                <div key={c.id} className="rounded-lg bg-muted/60">
                  <div className="flex items-center gap-2 px-3 py-2 text-[13px]">
                    <span className="min-w-0 flex-1 truncate">{c.title}</span>

                    {c.overridden ? (
                      <Badge variant="outline" className="shrink-0">
                        Diedit
                      </Badge>
                    ) : null}

                    <Button
                      variant="ghost"
                      size="sm"
                      aria-expanded={open}
                      className="text-muted-foreground"
                      onClick={() => setEditing(open ? null : c.id)}
                    >
                      <Pencil data-icon="inline-start" />
                      {open ? "Tutup" : "Edit wording"}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Lepas klausula"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => toggle(c.id)}
                    >
                      <X />
                    </Button>
                  </div>

                  {open ? (
                    <div className="flex flex-col gap-3 border-t px-3 py-3">
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor={`clause-title-${c.id}`}
                          className="text-xs text-muted-foreground"
                        >
                          Judul klausula di slip ini
                        </label>
                        <Input
                          id={`clause-title-${c.id}`}
                          value={c.title}
                          onChange={(e) =>
                            patchOverride(c.id, { title: e.target.value })
                          }
                        />
                      </div>

                      <RichTextEditor
                        key={`${c.id}-${resetTick}`}
                        value={c.wording}
                        minHeight="10rem"
                        onChange={(html) =>
                          patchOverride(c.id, { wording: html })
                        }
                      />

                      {c.overridden ? (
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-muted-foreground">
                            Versi slip ini berbeda dari master.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetOverride(c.id)}
                          >
                            <RotateCcw data-icon="inline-start" />
                            Kembalikan ke master
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
