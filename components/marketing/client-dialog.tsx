"use client"

import * as React from "react"
import { Plus, Upload } from "lucide-react"
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
import { CLASSES_OF_BUSINESS } from "@/lib/data"

const COB_ITEMS = CLASSES_OF_BUSINESS.map((c) => ({ label: c, value: c }))
const STATUS_ITEMS = [
  { label: "Active", value: "Active" },
  { label: "Prospect", value: "Prospect" },
  { label: "Inactive", value: "Inactive" },
]

export function ClientDialog() {
  const [open, setOpen] = React.useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus data-icon="inline-start" />
        Tambah Klien
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Tambah Klien Baru</DialogTitle>
          <DialogDescription>
            Lengkapi data klien. Field bertanda * wajib diisi.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto px-1">
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
              <Field>
                <FieldLabel>Class of Business *</FieldLabel>
                <Select items={COB_ITEMS} defaultValue="Property">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {COB_ITEMS.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select items={STATUS_ITEMS} defaultValue="Active">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {STATUS_ITEMS.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Scan NPWP</FieldLabel>
                <Button
                  variant="outline"
                  type="button"
                  className="justify-start"
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
                  className="justify-start"
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
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
          <Button
            onClick={() => {
              setOpen(false)
              toast.success("Klien tersimpan", {
                description: "Demo statis — data belum dipersist ke database.",
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
