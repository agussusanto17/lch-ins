import { CircleDashed, HelpCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"

/**
 * Halaman modul yang belum dikerjakan. Sengaja tidak memakai data contoh supaya
 * tidak ada angka karangan yang terlihat seperti data asli saat didemokan ke LCH.
 */
export function ModulePlaceholder({
  phase,
  week,
  features,
  pending,
}: {
  /** Bagian kontrak: A Underwriting, B Finance, atau C Akuntansi. */
  phase: string
  week: string
  /** Yang akan dibangun di halaman ini. */
  features: string[]
  /** Yang masih ditunggu dari LCH sebelum halaman ini bisa dikerjakan. */
  pending?: string[]
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          <CircleDashed data-icon="inline-start" />
          Belum dikerjakan
        </Badge>
        <Badge variant="secondary">{phase}</Badge>
        <span className="text-sm text-muted-foreground">Jadwal {week}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border p-4">
          <p className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
            Yang akan ada di halaman ini
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {features.map((f) => (
              <li key={f} className="flex gap-2 text-sm">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {pending?.length ? (
          <div className="rounded-xl border p-4">
            <p className="text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              Masih ditunggu dari LCH
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {pending.map((p) => (
                <li key={p} className="flex gap-2 text-sm">
                  <HelpCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
