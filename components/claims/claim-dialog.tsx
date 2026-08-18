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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
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
import {
  ADJUSTERS,
  CLASSES_OF_BUSINESS,
  CURRENCIES,
  INSURERS,
  POLICIES,
} from "@/lib/data"

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

const POLICY_ITEMS = [
  { label: "Pilih polis…", value: null as string | null },
  ...POLICIES.map((p) => ({
    label: `${p.policyNo} — ${p.insuredName}`,
    value: p.id,
  })),
]

export function ClaimDialog() {
  const [open, setOpen] = React.useState(false)
  const [policyId, setPolicyId] = React.useState<string | null>(null)
  const policy = POLICIES.find((p) => p.id === policyId)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus data-icon="inline-start" />
        Input Klaim Baru
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Input Klaim Baru</DialogTitle>
          <DialogDescription>
            Pilih polis untuk mengisi data tertanggung secara otomatis.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] overflow-y-auto px-1">
          <FieldGroup>
            <Field>
              <FieldLabel>Pilih Polis (opsional)</FieldLabel>
              <Select
                items={POLICY_ITEMS}
                value={policyId}
                onValueChange={(v) => setPolicyId(v as string | null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {POLICY_ITEMS.slice(1).map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                Data tertanggung, asuransi, dan COB akan terisi otomatis.
              </FieldDescription>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="k-no">No. Klaim</FieldLabel>
                <Input id="k-no" placeholder="CLM/2026/08/…" />
              </Field>
              <Field>
                <FieldLabel htmlFor="k-policy">No. Polis</FieldLabel>
                <Input
                  id="k-policy"
                  readOnly={Boolean(policy)}
                  value={policy?.policyNo ?? ""}
                  placeholder="No. polis"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="k-insured">Tertanggung *</FieldLabel>
                <Input
                  id="k-insured"
                  readOnly={Boolean(policy)}
                  value={policy?.insuredName ?? ""}
                  placeholder="Nama tertanggung"
                />
              </Field>
              <SelectField
                label="Asuransi"
                items={INSURERS}
                defaultValue={policy?.insurer ?? INSURERS[0]}
              />
              <SelectField
                label="Class of Business"
                items={CLASSES_OF_BUSINESS}
                defaultValue={policy?.cob ?? "Property"}
              />
              <SelectField
                label="Currency"
                items={CURRENCIES}
                defaultValue={policy?.currency ?? "IDR"}
              />
              <Field>
                <FieldLabel htmlFor="k-loss">Tanggal Kejadian *</FieldLabel>
                <Input id="k-loss" type="date" />
              </Field>
              <Field>
                <FieldLabel htmlFor="k-reported">Tanggal Dilaporkan</FieldLabel>
                <Input id="k-reported" type="date" />
              </Field>
              <Field>
                <FieldLabel htmlFor="k-doc">Tgl. Dokumen Lengkap</FieldLabel>
                <Input id="k-doc" type="date" />
              </Field>
              <Field>
                <FieldLabel htmlFor="k-spk">Tanggal SPK / SPGR</FieldLabel>
                <Input id="k-spk" type="date" />
              </Field>
              <Field>
                <FieldLabel htmlFor="k-est">Estimasi Kerugian</FieldLabel>
                <Input
                  id="k-est"
                  className="tabular"
                  inputMode="numeric"
                  placeholder="0"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="k-claimed">Jumlah Klaim</FieldLabel>
                <Input
                  id="k-claimed"
                  className="tabular"
                  inputMode="numeric"
                  placeholder="0"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="k-paid">Jumlah Dibayar</FieldLabel>
                <Input
                  id="k-paid"
                  className="tabular"
                  inputMode="numeric"
                  placeholder="0"
                />
              </Field>
              <SelectField
                label="Adjuster"
                items={ADJUSTERS}
                defaultValue={ADJUSTERS[0]}
              />
              <SelectField
                label="Status"
                items={[
                  "Open",
                  "Dokumen Lengkap",
                  "Proses Adjuster",
                  "Approved",
                  "Paid",
                  "Rejected",
                ]}
                defaultValue="Open"
              />
              <Field>
                <FieldLabel htmlFor="k-asset">Deskripsi Aset</FieldLabel>
                <Input
                  id="k-asset"
                  placeholder="Aset yang mengalami kerugian"
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="k-loc">Lokasi Kejadian</FieldLabel>
              <Input id="k-loc" placeholder="Alamat lokasi kejadian" />
            </Field>
            <Field>
              <FieldLabel htmlFor="k-desc">Deskripsi Kerugian</FieldLabel>
              <Textarea
                id="k-desc"
                rows={3}
                placeholder="Kronologi dan uraian kerugian"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="k-notes">Catatan</FieldLabel>
              <Textarea id="k-notes" rows={2} placeholder="Catatan internal" />
            </Field>
          </FieldGroup>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
          <Button
            onClick={() => {
              setOpen(false)
              toast.success("Klaim tersimpan", {
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
