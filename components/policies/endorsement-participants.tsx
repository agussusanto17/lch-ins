"use client"

import * as React from "react"
import { Calculator, Loader2, Search } from "lucide-react"
import { toast } from "sonner"

import { listPolicyParticipantsAction } from "@/app/(app)/policies/actions"
import { SlipParticipants } from "@/components/underwriting/slip-participants"
import { TablePagination } from "@/components/shared/table-pagination"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import type { Policy, SlipParticipant } from "@/lib/data"
import { money, num } from "@/lib/format"
import {
  endorsementSuggestion,
  participantActiveOn,
  type PolicyParticipant,
} from "@/lib/policy-participants"
import { participantsTotal } from "@/lib/slip-participants"

// Daftar di dalam form dibuat pendek; cari nama untuk peserta lain.
const PAGE_SIZE = 10

/**
 * Perubahan peserta PA grup lewat endorsement (jawaban Harry, 6 November
 * 2026): tambah peserta baru dan hentikan peserta polis induk, berlaku mulai
 * tanggal mulai endorsement. Usulan Total Sum Insured dan premi dihitung
 * pro-rata harian dari rate polis induk.
 */
export function EndorsementParticipants({
  parent,
  effectiveDate,
  currency,
  added,
  removedIds,
  onAddedChange,
  onRemovedChange,
  onApply,
}: {
  parent: Policy
  effectiveDate: string
  currency: string
  added: SlipParticipant[]
  removedIds: string[]
  onAddedChange: (list: SlipParticipant[]) => void
  onRemovedChange: (ids: string[]) => void
  onApply: (values: { sumInsured: number; premium: number }) => void
}) {
  const [roster, setRoster] = React.useState<PolicyParticipant[] | null>(null)
  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(1)

  React.useEffect(() => {
    let active = true
    listPolicyParticipantsAction(parent.id).then((res) => {
      if (!active) return
      if (!res.ok) {
        toast.error("Gagal memuat peserta polis induk", { description: res.error })
        setRoster([])
        return
      }
      setRoster(res.data ?? [])
    })
    return () => {
      active = false
    }
  }, [parent.id])

  // Hanya peserta yang masih dijamin pada tanggal endorsement yang bisa dihentikan.
  const date = effectiveDate || parent.inceptionDate
  const candidates = (roster ?? []).filter((p) => p.endDate == null && p.startDate <= date)
  const q = query.trim().toLowerCase()
  const filtered = q
    ? candidates.filter((p) =>
        [p.name, p.idNumber, p.level, p.workLocation]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q))
      )
    : candidates
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const shown = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const removed = candidates.filter((p) => removedIds.includes(p.id))

  const suggestion = endorsementSuggestion({
    parent,
    effectiveDate: date,
    addedTotal: participantsTotal(added),
    removedTotal: participantsTotal(removed),
  })
  const toggle = (id: string, on: boolean) =>
    onRemovedChange(on ? [...removedIds, id] : removedIds.filter((x) => x !== id))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium">Perubahan Peserta</p>
        <p className="text-xs text-muted-foreground">
          Berlaku mulai tanggal mulai endorsement. Peserta polis induk saat ini:{" "}
          {roster === null
            ? "memuat…"
            : `${candidates.length.toLocaleString("id-ID")} aktif`}
          .
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Peserta tambahan</p>
        <SlipParticipants
          participants={added}
          currency={currency}
          locked={false}
          onChange={onAddedChange}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">
          Peserta yang berhenti
          {removed.length ? (
            <span className="font-normal text-muted-foreground">
              {" "}
              · {removed.length.toLocaleString("id-ID")} dipilih, UP{" "}
              {money(participantsTotal(removed), currency)}
            </span>
          ) : null}
        </p>
        {roster === null ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Memuat peserta polis induk…
          </p>
        ) : candidates.length === 0 ? (
          <p className="rounded-lg bg-muted/60 px-3 py-3 text-sm text-muted-foreground">
            Polis induk belum punya peserta aktif.
          </p>
        ) : (
          <>
            <InputGroup className="h-9 sm:max-w-sm">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                placeholder="Cari peserta polis induk…"
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPage(1)
                }}
              />
            </InputGroup>
            <div
              role="group"
              aria-label="Peserta yang berhenti"
              className="flex flex-col divide-y rounded-lg border"
            >
              {shown.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50"
                >
                  <Checkbox
                    checked={removedIds.includes(p.id)}
                    onCheckedChange={(v) => toggle(p.id, v === true)}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {p.name}
                    <span className="text-muted-foreground">
                      {[p.level, p.workLocation].filter(Boolean).length
                        ? ` · ${[p.level, p.workLocation].filter(Boolean).join(" · ")}`
                        : ""}
                    </span>
                  </span>
                  <span className="tabular text-muted-foreground">
                    {money(p.sumInsured, currency)}
                  </span>
                </label>
              ))}
              {!shown.length ? (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  Tidak ada peserta yang cocok.
                </p>
              ) : null}
            </div>
            {filtered.length > PAGE_SIZE ? (
              <TablePagination
                page={safePage}
                pageSize={PAGE_SIZE}
                totalItems={filtered.length}
                onPageChange={setPage}
                itemName="peserta"
              />
            ) : null}
          </>
        )}
      </div>

      {added.length || removed.length ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
          <p className="mr-auto">
            Perubahan UP{" "}
            <span className="font-medium tabular">
              {money(suggestion.netSumInsured, currency)}
            </span>
            {" · "}usulan premi{" "}
            <span className="font-medium tabular">
              {money(suggestion.premium, currency)}
            </span>
            <span className="block text-xs text-muted-foreground">
              Rate polis induk {num(suggestion.rate * 100, 2, 6)}% × sisa{" "}
              {suggestion.remainingDays}/{suggestion.periodDays} hari.
              {participantActiveOn({ startDate: parent.inceptionDate, endDate: parent.expiryDate }, date)
                ? ""
                : " Tanggal endorsement di luar periode polis induk."}
            </span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onApply({ sumInsured: suggestion.netSumInsured, premium: suggestion.premium })
            }
          >
            <Calculator data-icon="inline-start" />
            Isi Sum Insured &amp; Premium
          </Button>
        </div>
      ) : null}
    </div>
  )
}
