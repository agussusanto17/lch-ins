"use client"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

/** Dropdown asuransi di panel security yang bisa diketik untuk mencari (LCH, 10 November 2026). */
export function InsurerCombobox({
  items,
  value,
  onValueChange,
  disabled,
  "aria-label": ariaLabel,
}: {
  items: string[]
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  "aria-label"?: string
}) {
  return (
    <Combobox
      items={items}
      value={value || null}
      onValueChange={(v) => onValueChange((v as string | null) ?? "")}
      disabled={disabled}
    >
      <ComboboxInput
        className="w-full min-w-0"
        placeholder="Ketik atau pilih asuransi…"
        aria-label={ariaLabel}
        showClear={Boolean(value) && !disabled}
        disabled={disabled}
      />
      <ComboboxContent>
        <ComboboxEmpty>Asuransi tidak ada di Master Data.</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
