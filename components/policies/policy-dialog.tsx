"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { FormDrawer } from "@/components/shared/form-drawer"
import { SelectField } from "@/components/shared/select-field"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CLASSES_OF_BUSINESS, CURRENCIES, INSURERS } from "@/lib/data"

export function PolicyDialog() {
  const [open, setOpen] = React.useState(false)

  return (
    <FormDrawer
      open={open}
      onOpenChange={setOpen}
      title="Tambah Polis Baru"
      description="Data polis yang sudah terbit dari perusahaan asuransi."
      trigger={
        <Button>
          <Plus data-icon="inline-start" />
          Tambah Polis
        </Button>
      }
      onSubmit={() => {
        setOpen(false)
        toast.success("Polis tersimpan", {
          description: "Demo statis — data belum dipersist.",
        })
      }}
    >
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
            className="sm:col-span-2"
          />
          <SelectField
            label="Class of Business"
            items={CLASSES_OF_BUSINESS}
            defaultValue="Property"
          />
          <SelectField label="Currency" items={CURRENCIES} defaultValue="IDR" />
          <Field>
            <FieldLabel htmlFor="p-inception">Inception Date</FieldLabel>
            <Input id="p-inception" type="date" />
          </Field>
          <Field>
            <FieldLabel htmlFor="p-expiry">Expiry Date</FieldLabel>
            <Input id="p-expiry" type="date" />
          </Field>
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
          <Textarea id="p-risk" rows={2} placeholder="Alamat lokasi risiko" />
        </Field>
      </FieldGroup>
    </FormDrawer>
  )
}
