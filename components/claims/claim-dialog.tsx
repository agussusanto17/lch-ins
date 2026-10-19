"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { FormDrawer } from "@/components/shared/form-drawer"
import { SelectField } from "@/components/shared/select-field"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
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

const POLICY_ITEMS = [
  { label: "Tanpa polis terkait", value: null as string | null },
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
    <FormDrawer
      open={open}
      onOpenChange={setOpen}
      title="Input Klaim Baru"
      description="Pilih polis untuk mengisi data tertanggung secara otomatis."
      trigger={
        <Button>
          <Plus data-icon="inline-start" />
          Input Klaim Baru
        </Button>
      }
      onSubmit={() => {
        setOpen(false)
        toast.success("Klaim tersimpan", {
          description: "Demo statis — data belum dipersist.",
        })
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel>Polis terkait</FieldLabel>
          <Select
            items={POLICY_ITEMS}
            value={policyId}
            onValueChange={(v) => setPolicyId(v as string | null)}
          >
            <SelectTrigger className="w-full">
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
            Tertanggung, asuransi, dan COB akan terisi otomatis.
          </FieldDescription>
        </Field>

        <FieldSeparator />

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
          <Field className="sm:col-span-2">
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
            className="sm:col-span-2"
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
        </div>

        <FieldSeparator />

        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>

        <FieldSeparator />

        <div className="grid gap-4 sm:grid-cols-2">
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
            items={["Outstanding", "Settled", "Closed", "Rejected"]}
            defaultValue="Outstanding"
          />
          <SelectField
            label="Tahapan Dokumen"
            items={[
              "Tunggu Dokumen",
              "Dokumen Belum Lengkap",
              "Dokumen Lengkap",
              "Proses Adjuster",
              "SPK / SPGR terbit",
            ]}
            defaultValue="Tunggu Dokumen"
          />
        </div>

        <FieldSeparator />

        <Field>
          <FieldLabel htmlFor="k-loc">Lokasi Kejadian</FieldLabel>
          <Input id="k-loc" placeholder="Alamat lokasi kejadian" />
        </Field>
        <Field>
          <FieldLabel htmlFor="k-asset">Deskripsi Aset</FieldLabel>
          <Input id="k-asset" placeholder="Aset yang mengalami kerugian" />
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
    </FormDrawer>
  )
}
