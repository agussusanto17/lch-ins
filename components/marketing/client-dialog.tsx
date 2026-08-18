"use client"

import * as React from "react"
import { Plus, Upload } from "lucide-react"
import { toast } from "sonner"

import { FormDrawer } from "@/components/shared/form-drawer"
import { SelectField } from "@/components/shared/select-field"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CLASSES_OF_BUSINESS } from "@/lib/data"

export function ClientDialog() {
  const [open, setOpen] = React.useState(false)

  return (
    <FormDrawer
      open={open}
      onOpenChange={setOpen}
      title="Tambah Klien Baru"
      description="Field bertanda * wajib diisi."
      trigger={
        <Button>
          <Plus data-icon="inline-start" />
          Tambah Klien
        </Button>
      }
      onSubmit={() => {
        setOpen(false)
        toast.success("Klien tersimpan", {
          description: "Demo statis — data belum dipersist ke database.",
        })
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="c-name">Nama Perusahaan *</FieldLabel>
          <Input id="c-name" placeholder="PT Contoh Sejahtera" autoFocus />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="c-contact">Kontak Person</FieldLabel>
            <Input id="c-contact" placeholder="Bpk. / Ibu" />
          </Field>
          <Field>
            <FieldLabel htmlFor="c-email">Email</FieldLabel>
            <Input
              id="c-email"
              type="email"
              placeholder="nama@perusahaan.co.id"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="c-phone">Telepon</FieldLabel>
            <Input id="c-phone" placeholder="+62 21 …" />
          </Field>
          <Field>
            <FieldLabel htmlFor="c-npwp">NPWP</FieldLabel>
            <Input id="c-npwp" placeholder="00.000.000.0-000.000" />
          </Field>
          <Field>
            <FieldLabel htmlFor="c-ktp">No. KTP</FieldLabel>
            <Input id="c-ktp" placeholder="16 digit" />
          </Field>
          <SelectField
            label="Class of Business *"
            items={CLASSES_OF_BUSINESS}
            defaultValue="Property"
          />
          <SelectField
            label="Status"
            items={["Active", "Prospect", "Inactive"]}
            defaultValue="Active"
          />
        </div>

        <FieldSeparator />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Scan NPWP</FieldLabel>
            <Button
              variant="outline"
              type="button"
              className="justify-start rounded-lg"
            >
              <Upload data-icon="inline-start" />
              Pilih file
            </Button>
          </Field>
          <Field>
            <FieldLabel>Scan KTP</FieldLabel>
            <Button
              variant="outline"
              type="button"
              className="justify-start rounded-lg"
            >
              <Upload data-icon="inline-start" />
              Pilih file
            </Button>
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="c-address">Alamat</FieldLabel>
          <Textarea
            id="c-address"
            rows={3}
            placeholder="Alamat lengkap korespondensi"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="c-notes">Catatan</FieldLabel>
          <Textarea
            id="c-notes"
            rows={2}
            placeholder="Catatan internal (opsional)"
          />
        </Field>
      </FieldGroup>
    </FormDrawer>
  )
}
