"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CLASSES_OF_BUSINESS, CURRENCIES, INSURERS } from "@/lib/data"

function SelectField({
  label,
  items,
  defaultValue,
}: {
  label: string
  items: string[]
  defaultValue: string
}) {
  const options = items.map((i) => ({ label: i, value: i }))
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select items={options} defaultValue={defaultValue}>
        <SelectTrigger>
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
    </Field>
  )
}

export function PolicyDialog() {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus data-icon="inline-start" />
        Tambah Polis
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tambah Polis Baru</DialogTitle>
          <DialogDescription>
            Data polis yang sudah terbit dari perusahaan asuransi.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto px-1">
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="p-no">No. Polis</FieldLabel>
                <Input id="p-no" placeholder="PAR/2026/JKT/…" autoFocus />
              </Field>
              <Field>
                <FieldLabel htmlFor="p-insured">Nama Tertanggung *</FieldLabel>
                <Input id="p-insured" placeholder="PT …" />
              </Field>
              <SelectField
                label="Asuransi"
                items={INSURERS}
                defaultValue={INSURERS[0]}
              />
              <SelectField
                label="Class of Business"
                items={CLASSES_OF_BUSINESS}
                defaultValue="Property"
              />
              <Field>
                <FieldLabel htmlFor="p-inception">Inception Date</FieldLabel>
                <Input id="p-inception" type="date" />
              </Field>
              <Field>
                <FieldLabel htmlFor="p-expiry">Expiry Date</FieldLabel>
                <Input id="p-expiry" type="date" />
              </Field>
              <SelectField
                label="Currency"
                items={CURRENCIES}
                defaultValue="IDR"
              />
              <Field>
                <FieldLabel htmlFor="p-si">Total Sum Insured</FieldLabel>
                <Input
                  id="p-si"
                  className="tabular"
                  inputMode="numeric"
                  placeholder="0"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="p-premium">Total Premium</FieldLabel>
                <Input
                  id="p-premium"
                  className="tabular"
                  inputMode="numeric"
                  placeholder="0"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="p-brokerage">Brokerage (%)</FieldLabel>
                <Input
                  id="p-brokerage"
                  className="tabular"
                  inputMode="decimal"
                  placeholder="0"
                />
              </Field>
              <SelectField
                label="Tipe"
                items={["Baru", "Renewal"]}
                defaultValue="Baru"
              />
              <SelectField
                label="Status"
                items={["Active", "Expiring", "Expired"]}
                defaultValue="Active"
              />
            </div>
            <Field>
              <FieldLabel htmlFor="p-risk">Risk Location</FieldLabel>
              <Textarea
                id="p-risk"
                rows={2}
                placeholder="Alamat lokasi risiko"
              />
            </Field>
          </FieldGroup>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
          <Button
            onClick={() => {
              setOpen(false)
              toast.success("Polis tersimpan", {
                description: "Demo statis — data belum dipersist.",
              })
            }}
          >
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
