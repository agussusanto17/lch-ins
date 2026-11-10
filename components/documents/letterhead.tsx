import Image from "next/image"

import logoLch from "@/public/images/logo-lch.jpg"
import regulatoryBadges from "@/public/images/regulatory-badges.png"

export const LCH_ADDRESS = {
  line1: "Springhill Office Tower 11th Floor Unit H",
  line2: "Jl. Benyamin Suaeb Block D6, Kemayoran, Jakarta Utara 14410",
  // 1071/1072 nomor PT. LCH Insurance Brokers. 1671/1672 nomor Lestari Cipta
  // Hokindo, nama lama; jangan dipakai lagi (pernah balik sendiri di PR #29).
  phone: "Phone : +62 21 - 2605 1071, +62 21 - 2605 1072",
}

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

export function Letterhead({ withAddress = false }: { withAddress?: boolean }) {
  return (
    <header className="mb-6 print:hidden">
      <LchLogo className="h-14 w-auto" />
      {withAddress ? (
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          {LCH_ADDRESS.line1} · {LCH_ADDRESS.line2} · {LCH_ADDRESS.phone}
        </p>
      ) : null}
    </header>
  )
}

export function DocumentFooter({
  printedAt,
  isPrintFixed = false,
}: {
  printedAt?: string
  isPrintFixed?: boolean
}) {
  if (isPrintFixed) {
    return (
      <footer className="w-full bg-[#2e243e] px-[18mm] py-2.5 text-white [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
        <div className="flex items-center justify-between gap-4">
          <div className="text-[10px] sm:text-[10.5px] leading-snug font-normal text-white">
            <p className="font-medium text-white/95">
              Springhill Office Tower 11<sup>th</sup> Floor Unit H
            </p>
            <p className="text-white/85">
              Jl. Benyamin Suaeb Block D6, Kemayoran, Jakarta Utara 14410
            </p>
            <p className="text-white/85">
              Phone : +62 21 - 2605 1071, +62 21 - 2605 1072
            </p>
          </div>
          <div className="shrink-0 flex items-center">
            <Image
              src={regulatoryBadges}
              alt="Terdaftar & diawasi oleh OJK. Anggota APPARINDO"
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
      </footer>
    )
  }

  return (
    <footer className="avoid-break mt-12 -mx-8 -mb-8 md:-mx-12 md:-mb-12 w-[calc(100%+4rem)] md:w-[calc(100%+6rem)] rounded-b-2xl rounded-t-none bg-[#2e243e] px-8 py-4 md:px-12 text-white shadow-sm print:hidden">
      <div className="flex items-center justify-between gap-4">
        <div className="text-[10px] sm:text-[10.5px] leading-snug font-normal text-white">
          <p className="font-medium text-white/95">
            Springhill Office Tower 11<sup>th</sup> Floor Unit H
          </p>
          <p className="text-white/85">
            Jl. Benyamin Suaeb Block D6, Kemayoran, Jakarta Utara 14410
          </p>
          <p className="text-white/85">
            Phone : +62 21 - 2605 1071, +62 21 - 2605 1072
          </p>
        </div>
        <div className="shrink-0 flex items-center">
          <Image
            src={regulatoryBadges}
            alt="Terdaftar & diawasi oleh OJK. Anggota APPARINDO"
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
    </footer>
  )
}
