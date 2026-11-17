/**
 * Ringkasan hasil upload Excel: berapa baris dibaca, berhasil, gagal, dan dilewati, lalu daftar
 * baris yang gagal beserta alasannya. Dipakai upload deklarasi MOP dan impor peserta PA supaya
 * baris yang terlewat atau gagal selalu terlihat (Agus, 17 November 2026).
 */
import { cn } from "@/lib/utils"

const count = (n: number) => n.toLocaleString("id-ID")

function Stat({
  label,
  value,
  className,
}: {
  label: string
  value: number
  className?: string
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-semibold tabular-nums", className)}>
        {count(value)}
      </dd>
    </div>
  )
}

export function UploadSummary({
  title,
  read,
  ok,
  okLabel,
  failed,
  skipped,
  errors,
  hint,
  note,
}: {
  title: string
  /** Baris berisi yang dibaca dari file. */
  read: number
  ok: number
  /** Label baris yang berhasil, misalnya "Siap disimpan" atau "Tersimpan". */
  okLabel: string
  failed: number
  /** Baris yang dilewati, misalnya sudah tercatat. Kosongkan bila tidak relevan. */
  skipped?: number
  /** Kesalahan per baris ("Baris N: ..."). */
  errors: string[]
  /** Petunjuk di atas daftar kesalahan. */
  hint?: string
  /** Kalimat tambahan di bawah angka. */
  note?: string
}) {
  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm"
    >
      <p className="font-medium">{title}</p>
      <dl className="flex flex-wrap gap-x-5 gap-y-1">
        <Stat label="Dibaca" value={read} />
        <Stat label={okLabel} value={ok} />
        <Stat
          label="Gagal"
          value={failed}
          className={failed ? "text-destructive" : undefined}
        />
        {skipped != null ? <Stat label="Dilewati" value={skipped} /> : null}
      </dl>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      {errors.length ? (
        <div className="flex flex-col gap-1 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {hint ? <p className="font-medium">{hint}</p> : null}
          <ul className="max-h-48 list-disc overflow-y-auto pl-4">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
