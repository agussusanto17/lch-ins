"use client"

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function SelectField({
  label,
  items,
  defaultValue,
  value,
  onValueChange,
  description,
  className,
}: {
  label: string
  items: string[]
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  description?: React.ReactNode
  className?: string
}) {
  const options = items.map((i) => ({ label: i, value: i }))
  return (
    <Field className={className}>
      <FieldLabel>{label}</FieldLabel>
      <Select
        items={options}
        defaultValue={defaultValue}
        value={value}
        onValueChange={
          onValueChange ? (v) => onValueChange(v as string) : undefined
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  )
}
