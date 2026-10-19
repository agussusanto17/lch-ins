"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { ChevronDown, Table2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function PanelLoading() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  )
}

// Isi panel baru diunduh saat pengguna membuka referensi tarif.
const PropertyPanel = dynamic(
  () =>
    import("@/components/underwriting/ojk-panels").then((m) => m.PropertyPanel),
  { ssr: false, loading: PanelLoading }
)
const MotorPanel = dynamic(
  () =>
    import("@/components/underwriting/ojk-panels").then((m) => m.MotorPanel),
  { ssr: false, loading: PanelLoading }
)

export interface RateBounds {
  min: number | null
  max: number | null
  source: string
}

type PickRate = (label: string, value: number, bounds?: RateBounds) => void

export function OjkReference({
  mode = "property",
  occupation,
  riskLocation,
  constructionClass,
  onConstructionClassChange,
  sumInsured = 0,
  baseRate = 0,
  eqRate,
  onPickRate,
  onPickIndemnity,
}: {
  mode?: "property" | "motor"
  occupation?: string
  riskLocation?: string
  constructionClass?: string
  onConstructionClassChange?: (code: string) => void
  /** Total sum insured, dipakai memilih kategori tarif kendaraan bermotor. */
  sumInsured?: number
  /** Jumlah rate FLEXAS, FWTWD, RSMDCC, dan Other Losses. Dasar perhitungan BI PAR. */
  baseRate?: number
  /** Rate EQVET berjalan. Dasar perhitungan BI EQVET. */
  eqRate?: number | null
  onPickRate?: PickRate
  onPickIndemnity?: (months: number) => void
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger render={<Button variant="outline" size="sm" />}>
        <Table2 data-icon="inline-start" />
        Referensi Tarif OJK
        <ChevronDown
          data-icon="inline-end"
          className={cn("transition-transform", open && "rotate-180")}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4 flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          SE OJK No. 6/SEOJK.05/2017. Angka bertombol bisa langsung diisi ke
          baris rate: pilih <span className="font-medium">Bawah</span> atau{" "}
          <span className="font-medium">Atas</span> sesuai kesepakatan dengan
          asuransi. Rate di luar batas hanya boleh bila ada potongan sesuai
          nilai pertanggungan atau perluasan jaminan.
        </p>

        {mode === "motor" ? (
          <MotorPanel
            riskLocation={riskLocation}
            sumInsured={sumInsured}
            onPickRate={onPickRate}
          />
        ) : (
          <PropertyPanel
            occupation={occupation}
            riskLocation={riskLocation}
            constructionClass={constructionClass}
            onConstructionClassChange={onConstructionClassChange}
            baseRate={baseRate}
            eqRate={eqRate}
            onPickRate={onPickRate}
            onPickIndemnity={onPickIndemnity}
          />
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
