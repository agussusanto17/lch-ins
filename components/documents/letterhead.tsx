import Image from "next/image"

import badgesLestari from "@/public/images/badges-lestari.png"
import logoLch from "@/public/images/logo-lch.jpg"
import logoLestari from "@/public/images/logo-lestari.png"
import regulatoryBadges from "@/public/images/regulatory-badges.png"
import { LETTERHEAD_COMPANY, type LetterheadVariant } from "@/lib/document-dates"
import { cn } from "@/lib/utils"

export const LCH_ADDRESS = {
  line1: "Springhill Office Tower 11th Floor Unit H",
  line2: "Jl. Benyamin Suaeb Block D6, Kemayoran, Jakarta Utara 14410",
  // 1071/1072 nomor PT. LCH Insurance Brokers. 1671/1672 nomor Lestari Cipta
  // Hokindo, nama lama; hanya untuk kop Lestari (pernah balik sendiri di PR #29).
  phone: "Phone : +62 21 - 2605 1071, +62 21 - 2605 1072",
}

/**
 * Kop per nama perusahaan; kop Lestari Cipta Hokindo untuk slip sebelum 1 September 2025.
 * Kedua kop beda di nama, warna, telepon, dan lencana MARI Berasuransi (scan LCH 21 Oktober 2026).
 */
const LETTERHEADS = {
  lch: {
    logo: logoLch,
    logoClass: "h-14 w-auto",
    phone: LCH_ADDRESS.phone,
    band: "bg-[#2e243e]",
    badges: regulatoryBadges,
    badgesAlt: "Terdaftar & diawasi oleh OJK. Anggota APPARINDO",
  },
  lestari: {
    logo: logoLestari,
    logoClass: "h-[72px] w-auto",
    phone: "Phone : +62 21 - 2605 1671, +62 21 - 2605 1672",
    band: "bg-[#384c80]",
    badges: badgesLestari,
    badgesAlt: "Terdaftar & diawasi oleh OJK. Anggota APPARINDO. MARI Berasuransi",
  },
} as const

/** Logo resmi; nama perusahaan dan nomor SKOJK sudah ada di dalam gambar. */
export function LchLogo({
  className,
  alt = "PT. LCH Insurance Brokers",
}: {
  className?: string
  /** Isi `""` kalau nama perusahaan sudah ada sebagai teks di dekatnya. */
  alt?: string
}) {
  // unoptimized: dokumen dicetak, jadi pakai file asli 1600px supaya tetap tajam.
  return (
    <Image
      src={logoLch}
      alt={alt}
      loading="eager"
      unoptimized
      className={className}
    />
  )
}

/** Logo kop sesuai nama perusahaan pada tanggal dokumen. */
export function CompanyLogo({ variant = "lch" }: { variant?: LetterheadVariant }) {
  const kop = LETTERHEADS[variant]
  return (
    <Image
      src={kop.logo}
      alt={LETTERHEAD_COMPANY[variant]}
      loading="eager"
      unoptimized
      className={kop.logoClass}
    />
  )
}

export function Letterhead({
  withAddress = false,
  variant = "lch",
}: {
  withAddress?: boolean
  variant?: LetterheadVariant
}) {
  return (
    <header className="mb-6 print:hidden">
      <CompanyLogo variant={variant} />
      {withAddress ? (
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          {LCH_ADDRESS.line1} · {LCH_ADDRESS.line2} · {LETTERHEADS[variant].phone}
        </p>
      ) : null}
    </header>
  )
}

function FooterContent({
  variant,
  printedAt,
}: {
  variant: LetterheadVariant
  printedAt?: string
}) {
  const kop = LETTERHEADS[variant]
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="text-[10px] sm:text-[10.5px] leading-snug font-normal text-white">
          <p className="font-medium text-white/95">
            Springhill Office Tower 11<sup>th</sup> Floor Unit H
          </p>
          <p className="text-white/85">
            Jl. Benyamin Suaeb Block D6, Kemayoran, Jakarta Utara 14410
          </p>
          <p className="text-white/85">{kop.phone}</p>
        </div>
        <div className="shrink-0 flex items-center">
          <Image
            src={kop.badges}
            alt={kop.badgesAlt}
            className="h-10 sm:h-12 w-auto object-contain"
            unoptimized
          />
        </div>
      </div>
      {printedAt ? (
        <div className="mt-1 text-right text-[8.5px] text-white/50">
          Dicetak: {printedAt}
        </div>
      ) : null}
    </>
  )
}

export function DocumentFooter({
  printedAt,
  isPrintFixed = false,
  variant = "lch",
  compact = false,
}: {
  printedAt?: string
  isPrintFixed?: boolean
  variant?: LetterheadVariant
  /** Kartu dokumen berpadding lebih kecil (dokumen slip); margin footer layar ikut. */
  compact?: boolean
}) {
  const band = LETTERHEADS[variant].band

  if (isPrintFixed) {
    // Padding mengikuti margin isi cetak (--print-x dari .doc-slip, default 18mm).
    return (
      <footer className={cn("w-full px-[var(--print-x,18mm)] py-2.5 text-white", band)}>
        <FooterContent variant={variant} printedAt={printedAt} />
      </footer>
    )
  }

  return (
    <footer
      className={cn(
        "avoid-break mt-12 rounded-b-2xl rounded-t-none py-4 text-white shadow-sm print:hidden",
        // Negative margin harus sama dengan padding kartu di DocumentShell.
        compact
          ? "-mx-6 -mb-6 md:-mx-8 md:-mb-8 w-[calc(100%+3rem)] md:w-[calc(100%+4rem)] px-6 md:px-8"
          : "-mx-8 -mb-8 md:-mx-12 md:-mb-12 w-[calc(100%+4rem)] md:w-[calc(100%+6rem)] px-8 md:px-12",
        band
      )}
    >
      <FooterContent variant={variant} printedAt={printedAt} />
    </footer>
  )
}
