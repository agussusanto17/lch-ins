"use client"

import { FileSpreadsheet, Printer, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

export function SearchInput({
  value,
  onValueChange,
  placeholder = "Cari…",
  className,
}: {
  value: string
  onValueChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <InputGroup className={cn("h-9 w-full sm:max-w-xs", className)}>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        value={value}
        placeholder={placeholder}
        onChange={(e) => onValueChange(e.target.value)}
      />
    </InputGroup>
  )
}

export function ExportButtons({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button variant="outline" size="sm">
        <FileSpreadsheet data-icon="inline-start" />
        Excel / CSV
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer data-icon="inline-start" />
        Print
      </Button>
    </div>
  )
}
