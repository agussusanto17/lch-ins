"use client"

import * as React from "react"
import Link from "next/link"
import { Check, ExternalLink, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { CLIENTS } from "@/lib/data"
import type { ClientAddress } from "@/lib/data/types"

const ITEMS = CLIENTS.map((c) => c.name)

export function clientById(id: string | null | undefined) {
  return id ? (CLIENTS.find((c) => c.id === id) ?? null) : null
}

/** Alamat korespondensi klien, jatuh ke alamat pertama bila belum ada. */
function defaultAddress(addresses: ClientAddress[]) {
  return (
    addresses.find((a) => a.label.toLowerCase().includes("korespondensi")) ??
    addresses[0] ??
    null
  )
}

export function InsuredPicker({
  clientId,
  insuredName,
  correspondenceAddress,
  onChange,
}: {
  clientId: string | null
  insuredName: string
  correspondenceAddress: string
  onChange: (patch: {
    clientId?: string | null
    insuredName?: string
    correspondenceAddress?: string
  }) => void
}) {
  const client = clientById(clientId)
  const addresses = client?.addresses ?? []
  const activeAddress = addresses.find(
    (a) => a.value === correspondenceAddress.trim()
  )

  function pickClient(name: string) {
    const next = CLIENTS.find((c) => c.name === name)
    if (next) {
      // Nama disalin apa adanya dari master klien; dokumen cetak yang mengatur
      // huruf besarnya, jadi isi slip tetap sama dengan data Marketing.
      onChange({
        clientId: next.id,
        insuredName: next.name,
        correspondenceAddress: defaultAddress(next.addresses)?.value ?? "",
      })
      return
    }
    // Nama boleh diketik bebas, misalnya ditambah "and/or Subsidiary Companies".
    // Kaitan ke klien tetap dipegang sampai fieldnya dikosongkan.
    onChange({ insuredName: name, ...(name ? {} : { clientId: null }) })
  }

  return (
    <>
      <Field className="md:col-span-2">
        <FieldLabel htmlFor="insured">
          Nama Tertanggung / Insured Name *
        </FieldLabel>
        <Combobox
          items={ITEMS}
          value={insuredName}
          onValueChange={(v) => pickClient(((v as string) ?? "").trim())}
        >
          <ComboboxInput
            id="insured"
            placeholder="Pilih klien dari Marketing…"
            showClear
          />
          <ComboboxContent>
            <ComboboxEmpty>
              Klien belum terdaftar. Tambahkan dulu di menu Marketing.
            </ComboboxEmpty>
            <ComboboxList>
              {(item: string) => (
                <ComboboxItem key={item} value={item}>
                  {item}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>

        {client ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              Klien {client.name} · {client.contactPerson} · {client.phone}
            </span>
            <span>NPWP {client.npwp}</span>
            <Link
              href="/marketing"
              className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
            >
              Lihat di Marketing
              <ExternalLink className="size-3" />
            </Link>
          </div>
        ) : insuredName ? (
          <p className="text-xs text-muted-foreground">
            Nama ini belum terhubung ke data klien, jadi alamat tidak bisa
            diambil otomatis.
          </p>
        ) : null}
      </Field>

      <Field className="md:col-span-2">
        <FieldLabel htmlFor="addr">Correspondence Address</FieldLabel>

        {addresses.length ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {addresses.map((a) => {
              const active = activeAddress?.id === a.id
              return (
                <Button
                  key={a.id}
                  variant={active ? "secondary" : "outline"}
                  size="sm"
                  aria-pressed={active}
                  title={a.value}
                  onClick={() => onChange({ correspondenceAddress: a.value })}
                >
                  {active ? <Check data-icon="inline-start" /> : null}
                  {a.label}
                </Button>
              )
            })}
            {correspondenceAddress && !activeAddress ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Pencil className="size-3" />
                Diedit khusus slip ini, data klien tidak berubah
              </span>
            ) : null}
          </div>
        ) : null}

        <Textarea
          id="addr"
          rows={2}
          value={correspondenceAddress}
          placeholder={
            client
              ? "Pilih alamat di atas atau ketik alamat khusus slip ini"
              : "Alamat korespondensi tertanggung"
          }
          onChange={(e) => onChange({ correspondenceAddress: e.target.value })}
        />
      </Field>
    </>
  )
}
