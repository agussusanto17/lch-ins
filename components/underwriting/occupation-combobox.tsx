"use client"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { OCCUPATION_TARIFFS } from "@/lib/data/ojk-tariff"

const ITEMS = OCCUPATION_TARIFFS.map((o) => `${o.code} - ${o.name}`)

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
        <ComboboxEmpty>Okupasi tidak ada di daftar OJK.</ComboboxEmpty>
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
