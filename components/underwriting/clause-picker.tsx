"use client"

import * as React from "react"
import {
  ArrowDown,
  ArrowUp,
  BookOpenText,
  Check,
  Pencil,
  RotateCcw,
  Search,
  X,
} from "lucide-react"

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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CLAUSES,
  resolveSlipClauses,
  wordingHtml,
  wordingText,
  type ClassOfBusiness,
  type ClauseOverride,
} from "@/lib/data"
import { useFormOptions } from "@/components/shared/form-options-provider"
import { clauseFitsSlip } from "@/lib/clause-filter"
import {
  CLAUSE_GROUP_SUGGESTIONS,
  CLAUSE_GROUP_TITLE_MAX,
  clauseGroupBlocks,
  clauseGroupOf,
  groupedClauseOrder,
  moveClause,
  moveClauseGroup,
  moveClauseToGroup,
  renameClauseGroup,
  type ClauseGroups,
} from "@/lib/clause-groups"
import { coversFor } from "@/lib/form-options"
import { cn } from "@/lib/utils"
import {
  getClausesForPickerAction,
  type ClausePickerItem,
} from "@/app/(app)/underwriting/actions"

/** Nilai pilihan kelompok: tanpa judul dan kelompok baru. */
const NO_GROUP = "__tanpa_judul__"
const NEW_GROUP = "__kelompok_baru__"

/**
 * Judul kelompok klausula. Disimpan saat keluar dari isian atau Enter, supaya
 * kelompok tidak bergabung dengan kelompok lain di tengah mengetik.
 */
function GroupTitleInput({
  title,
  listId,
  onCommit,
}: {
  title: string
  listId: string
  onCommit: (title: string) => void
}) {
  const [draft, setDraft] = React.useState(title)
  const [prev, setPrev] = React.useState(title)
  if (prev !== title) {
    setPrev(title)
    setDraft(title)
  }
  return (
    <Input
      className="h-8 flex-1 text-xs font-semibold"
      aria-label="Judul kelompok klausula"
      list={listId}
      maxLength={CLAUSE_GROUP_TITLE_MAX}
      placeholder="Tanpa judul. Ketik judul kelompok, misalnya Extensions"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          onCommit(draft)
        }
      }}
    />
  )
}

/**
 * Slip Property memasang dua picker (Section 1 dan 2) sekaligus. Keduanya
 * memakai satu permintaan daftar klausula (beserta wording, ratusan KB)
 * selama permintaan itu berjalan; picker yang mount sesudahnya mengambil ulang.
 */
let pendingClauses: ReturnType<typeof getClausesForPickerAction> | null = null

function loadPickerClauses() {
  pendingClauses ??= getClausesForPickerAction().finally(() => {
    pendingClauses = null
  })
  return pendingClauses
}

export function ClausePicker({
  cob,
  typeOfCover,
  typeOfCover2,
  selected,
  overrides,
  copies,
  onChange,
  onOverridesChange,
  groups,
  onGroupsChange,
  masterClauses: propMasterClauses,
}: {
  cob: ClassOfBusiness
  typeOfCover: string
  /** Type of cover kedua slip Property (Earthquake). */
  typeOfCover2?: string
  selected: string[]
  overrides: Record<string, ClauseOverride>
  /**
   * Salinan klausula di slip. Klausula terpilih yang sudah nonaktif di master
   * (misalnya EQVET) tidak ada di daftar master, jadi tampil dari salinan ini
   * supaya tetap terlihat dan bisa dilepas.
   */
  copies?: Record<string, ClauseOverride>
  onChange: (ids: string[]) => void
  onOverridesChange: (overrides: Record<string, ClauseOverride>) => void
  /**
   * Judul kelompok per klausul (slip tanpa section). Bila `onGroupsChange`
   * diisi, daftar terpilih bisa dikelompokkan dengan judul seperti Extensions
   * dan General Conditions.
   */
  groups?: ClauseGroups
  onGroupsChange?: (groups: ClauseGroups) => void
  masterClauses?: ClausePickerItem[]
}) {
  /** Dua picker bisa membuka klausula yang sama, jadi id input dibuat unik per picker. */
  const pickerId = React.useId()
  const [query, setQuery] = React.useState("")
  const [editing, setEditing] = React.useState<string | null>(null)
  /** Editor hanya membaca isi awalnya, jadi reset ke master perlu remount. */
  const [resetTick, setResetTick] = React.useState(0)
  const [fetchedClauses, setFetchedClauses] = React.useState<ClausePickerItem[]>([])

  React.useEffect(() => {
    if (propMasterClauses && propMasterClauses.length > 0) return
    let active = true
    loadPickerClauses().then((res) => {
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

  const plainWording = React.useMemo(
    () => new Map(pool.map((c) => [c.id, wordingText(c.wording)])),
    [pool]
  )

  const options = useFormOptions()
  const knownCovers = React.useMemo(
    () => coversFor(options, cob).map((c) => c.name),
    [options, cob]
  )

  const available = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const slipCovers = [typeOfCover, typeOfCover2 ?? ""]
    return pool.filter((c) => {
      if (!clauseFitsSlip(c, cob, slipCovers, knownCovers)) return false
      if (!q) return true
      return (
        c.title.toLowerCase().includes(q) ||
        (plainWording.get(c.id) ?? "").toLowerCase().includes(q)
      )
    })
  }, [pool, plainWording, cob, typeOfCover, typeOfCover2, knownCovers, query])

  const selectedClauses = React.useMemo(() => {
    const inactive = Object.entries(copies ?? {})
      .filter(([id]) => !pool.some((c) => c.id === id))
      .map(([id, c]) => ({ id, title: c.title, wording: c.wording }))
    return resolveSlipClauses(
      {
        clauseIds: selected,
        clauseOverrides: overrides,
      },
      [...pool, ...inactive]
    ).map((c) => ({ ...c, inactive: inactive.some((i) => i.id === c.id) }))
  }, [selected, overrides, copies, pool])

  const grouping = Boolean(onGroupsChange)

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
      // Klausula yang dilepas tidak menyimpan override dan kelompok lagi.
      if (overrides[id]) {
        const next = { ...overrides }
        delete next[id]
        onOverridesChange(next)
      }
      if (groups?.[id] !== undefined && onGroupsChange) {
        const next = { ...groups }
        delete next[id]
        onGroupsChange(next)
      }
      if (editing === id) setEditing(null)
      return
    }
    // Klausula baru masuk kelompok klausula terakhir, jadi daftar bisa diisi
    // kelompok demi kelompok.
    const last = selected[selected.length - 1]
    const title = grouping && last ? clauseGroupOf(groups, last) : ""
    if (title && onGroupsChange) {
      onGroupsChange({ ...(groups ?? {}), [id]: title })
      onChange(groupedClauseOrder([...selected, id], { ...(groups ?? {}), [id]: title }))
      return
    }
    onChange([...selected, id])
  }

  const blocks = grouping
    ? clauseGroupBlocks(selected, groups)
    : [{ title: "", ids: selected }]
  const groupTitles = blocks.map((b) => b.title).filter(Boolean)
  const groupItems = [
    { label: "Tanpa judul", value: NO_GROUP },
    ...groupTitles.map((t) => ({ label: t, value: t })),
    { label: "Kelompok baru", value: NEW_GROUP },
  ]
  const suggestionsId = `${pickerId}-group-titles`

  function setGroup(id: string, value: string) {
    if (!onGroupsChange) return
    let title = value === NO_GROUP ? "" : value
    if (value === NEW_GROUP) {
      title = "Kelompok baru"
      for (let n = 2; groupTitles.includes(title); n++) title = `Kelompok baru ${n}`
    }
    const next = moveClauseToGroup(selected, groups, id, title)
    onGroupsChange(next.groups)
    onChange(next.ids)
  }

  function renameGroup(from: string, to: string) {
    if (!onGroupsChange || from === to.trim()) return
    const next = renameClauseGroup(selected, groups, from, to.trim())
    onGroupsChange(next)
    // Judul yang sama dengan kelompok lain menggabungkan keduanya.
    onChange(groupedClauseOrder(selected, next))
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
                      {c.sourceGroup || c.cobName || "Umum"}
                    </Badge>
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                    {plainWording.get(c.id)}
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
          {grouping ? (
            <p className="text-[11px] text-muted-foreground">
              Beri judul kelompok, misalnya Extensions atau General Conditions,
              lalu pindahkan klausula lewat pilihan kelompoknya. Nomor klausula
              mulai dari 1 di tiap kelompok.
            </p>
          ) : null}
          {grouping ? (
            <datalist id={suggestionsId}>
              {[...new Set([...CLAUSE_GROUP_SUGGESTIONS, ...groupTitles])].map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          ) : null}

          <div className="flex flex-col gap-3">
            {blocks.map((block, bi) => (
              <div key={block.title || "tanpa-judul"} className="flex flex-col gap-1.5">
                {grouping ? (
                  <div className="flex items-center gap-1">
                    <GroupTitleInput
                      title={block.title}
                      listId={suggestionsId}
                      onCommit={(to) => renameGroup(block.title, to)}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Naikkan kelompok ${block.title || "tanpa judul"}`}
                      disabled={bi === 0}
                      onClick={() =>
                        onChange(moveClauseGroup(selected, groups, block.title, -1))
                      }
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Turunkan kelompok ${block.title || "tanpa judul"}`}
                      disabled={bi === blocks.length - 1}
                      onClick={() =>
                        onChange(moveClauseGroup(selected, groups, block.title, 1))
                      }
                    >
                      <ArrowDown />
                    </Button>
                  </div>
                ) : null}

                {block.ids.map((id, i) => {
                  const c = selectedClauses.find((x) => x.id === id)
                  if (!c) return null
                  const open = editing === c.id
                  return (
                    <div key={c.id} className="rounded-lg bg-muted/60">
                      <div className="flex items-center gap-1.5 px-3 py-2 text-[13px]">
                        <span className="w-6 shrink-0 text-muted-foreground tabular">
                          {i + 1}.
                        </span>
                        <span className="min-w-0 flex-1 truncate">{c.title}</span>

                        {c.inactive ? (
                          <Badge variant="outline" className="shrink-0">
                            Nonaktif di master
                          </Badge>
                        ) : null}
                        {c.overridden ? (
                          <Badge variant="outline" className="shrink-0">
                            Diedit
                          </Badge>
                        ) : null}

                        {grouping ? (
                          <Select
                            items={groupItems}
                            value={block.title || NO_GROUP}
                            onValueChange={(v) => setGroup(c.id, String(v))}
                          >
                            <SelectTrigger
                              size="sm"
                              className="h-8 w-48 shrink-0"
                              aria-label={`Kelompok ${c.title}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {groupItems.map((g) => (
                                  <SelectItem key={g.value} value={g.value}>
                                    {g.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        ) : null}

                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Naikkan ${c.title}`}
                          disabled={i === 0}
                          className="text-muted-foreground"
                          onClick={() => onChange(moveClause(selected, groups, c.id, -1))}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Turunkan ${c.title}`}
                          disabled={i === block.ids.length - 1}
                          className="text-muted-foreground"
                          onClick={() => onChange(moveClause(selected, groups, c.id, 1))}
                        >
                          <ArrowDown />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          aria-expanded={open}
                          className="text-muted-foreground"
                          onClick={() => setEditing(open ? null : c.id)}
                        >
                          {/* Hasil edit sudah masuk ke slip saat diketik; Save hanya menutup
                              editor. Ke database tetap lewat Simpan Draft. */}
                          {open ? (
                            <>
                              <Check data-icon="inline-start" />
                              Save
                            </>
                          ) : (
                            <>
                              <Pencil data-icon="inline-start" />
                              Edit wording
                            </>
                          )}
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
                              htmlFor={`${pickerId}-title-${c.id}`}
                              className="text-xs text-muted-foreground"
                            >
                              Judul klausula di slip ini
                            </label>
                            <Input
                              id={`${pickerId}-title-${c.id}`}
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
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
