"use client"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { OCCUPATIONS } from "@/lib/data"

const ITEMS = OCCUPATIONS.map((o) => o.label)

export function OccupationCombobox({
  value,
  onValueChange,
}: {
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <Combobox
      items={ITEMS}
      value={value}
      onValueChange={(v) => onValueChange((v as string) ?? "")}
    >
      <ComboboxInput placeholder="Ketik atau pilih okupasi…" showClear />
      <ComboboxContent>
        <ComboboxEmpty>Okupasi tidak ditemukan — ketik manual.</ComboboxEmpty>
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
