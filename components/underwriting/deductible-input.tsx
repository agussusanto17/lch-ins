"use client"

import { ChevronDown, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { MAX_DEDUCTIBLES } from "@/lib/data/types"

/**
 * Isian deductible satu cover. Tombol Pilih mengisi teks dari Master Data >
 * Deductible, lalu teks itu tetap bisa diubah khusus untuk slip ini.
 */
export function DeductibleInput({
  id,
  cover,
  value,
  onChange,
  choices,
  placeholder,
  ariaLabel,
}: {
  id: string
  cover: string
  value: string
  onChange: (value: string) => void
  choices: string[]
  placeholder?: string
  /** Untuk isian yang tidak punya label sendiri, misalnya deductible kedua. */
  ariaLabel?: string
}) {
  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {choices.length ? (
        <InputGroupAddon align="inline-end">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <InputGroupButton
                  className="h-7 px-2.5"
                  aria-label={`Pilih deductible ${cover} dari master data`}
                />
              }
            >
              Pilih
              <ChevronDown data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-auto max-w-[min(36rem,calc(100vw-2rem))]"
            >
              <DropdownMenuGroup>
                {choices.map((choice) => (
                  <DropdownMenuItem
                    key={choice}
                    className="whitespace-normal"
                    onClick={() => onChange(choice)}
                  >
                    {choice}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  )
}

/**
 * Deductible satu cover, paling banyak MAX_DEDUCTIBLES isian (permintaan 4
 * November 2026). Isian pertama selalu tampil dan memakai `id`, supaya label
 * cover tetap menunjuk ke sana. Isian kosong dibuang saat slip disimpan.
 */
export function DeductibleList({
  id,
  cover,
  values,
  onChange,
  choices,
  placeholder,
}: {
  id: string
  cover: string
  values: string[]
  onChange: (values: string[]) => void
  choices: string[]
  placeholder?: string
}) {
  const items = values.length ? values : [""]
  return (
    <div className="flex flex-col gap-2">
      {items.map((value, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <DeductibleInput
              id={i === 0 ? id : `${id}-${i + 1}`}
              ariaLabel={i === 0 ? undefined : `Deductible ${i + 1} ${cover}`}
              cover={cover}
              value={value}
              choices={choices}
              placeholder={placeholder}
              onChange={(next) =>
                onChange(items.map((v, j) => (j === i ? next : v)))
              }
            />
          </div>
          {items.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Hapus deductible ${i + 1} ${cover}`}
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <Trash2 />
            </Button>
          ) : null}
        </div>
      ))}
      {items.length < MAX_DEDUCTIBLES ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="self-start text-muted-foreground"
          onClick={() => onChange([...items, ""])}
        >
          <Plus data-icon="inline-start" />
          Tambah deductible
        </Button>
      ) : null}
    </div>
  )
}
