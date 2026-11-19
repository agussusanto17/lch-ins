"use client"

import * as React from "react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  NO_SIGNATURE,
  initialSignatoryId,
  type DocumentSignatory,
} from "@/lib/document-signatories"
import { beginPrintTask } from "@/lib/print-tasks"

/*
 * Tanda tangan LCH di cetak Placing Slip, Quotation Slip, dan Closing Instruction (Harry,
 * 19 November 2026). Pilihannya di toolbar halaman cetak dan tidak disimpan di slip.
 */

const SignatoryContext = React.createContext<DocumentSignatory | null>(null)

/** Pilihan tanda tangan halaman cetak: default terpilih otomatis, bisa diganti atau dikosongkan. */
export function useSignatoryChoice(signatories: DocumentSignatory[] | undefined) {
  const list = signatories ?? []
  const [value, setValue] = React.useState(() => initialSignatoryId(list))
  const selected = list.find((s) => s.id === value) ?? null
  return { value, setValue, selected }
}

export function SignatoryProvider({
  value,
  children,
}: {
  value: DocumentSignatory | null
  children: React.ReactNode
}) {
  return <SignatoryContext.Provider value={value}>{children}</SignatoryContext.Provider>
}

export function SignaturePicker({
  signatories,
  value,
  onValueChange,
}: {
  signatories: DocumentSignatory[]
  value: string
  onValueChange: (value: string) => void
}) {
  const items = [
    ...signatories.map((s) => ({ value: s.id, label: s.name })),
    { value: NO_SIGNATURE, label: "Tanpa tanda tangan" },
  ]
  return (
    <div className="flex items-center gap-2">
      <span id="doc-signature-label" className="text-xs whitespace-nowrap text-muted-foreground">
        Tanda tangan
      </span>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => onValueChange(next ?? NO_SIGNATURE)}
      >
        <SelectTrigger
          size="sm"
          aria-labelledby="doc-signature-label"
          className="min-w-40 bg-background"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** Gambar tanda tangan; tombol cetak menunggu sampai gambarnya termuat. */
function SignatureImage({ src, alt }: { src: string; alt: string }) {
  const ref = React.useRef<HTMLImageElement>(null)
  React.useEffect(() => {
    const img = ref.current
    if (!img || img.complete) return
    const done = beginPrintTask()
    img.addEventListener("load", done, { once: true })
    img.addEventListener("error", done, { once: true })
    return done
  }, [src])
  return (
    // eslint-disable-next-line @next/next/no-img-element -- berkas privat dari /api/files, bukan aset statis
    <img
      ref={ref}
      src={src}
      alt={alt}
      className="h-full w-auto max-w-full object-contain object-left-bottom"
    />
  )
}

/**
 * Ruang tanda tangan di atas garis "Authorized Signatory". Tingginya sama dengan atau tanpa
 * gambar, jadi pemisahan halaman cetak tidak bergeser saat tanda tangan diganti.
 */
export function SignatureSlot() {
  const signatory = React.useContext(SignatoryContext)
  return (
    <div className="flex h-14 items-end">
      {signatory?.imageUrl ? (
        <SignatureImage
          key={signatory.imageUrl}
          src={signatory.imageUrl}
          alt={`Tanda tangan ${signatory.name}`}
        />
      ) : null}
    </div>
  )
}
