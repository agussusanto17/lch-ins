"use client"

import { ChevronDown } from "lucide-react"

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
}: {
  id: string
  cover: string
  value: string
  onChange: (value: string) => void
  choices: string[]
  placeholder?: string
}) {
  return (
    <InputGroup>
      <InputGroupInput
        id={id}
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
