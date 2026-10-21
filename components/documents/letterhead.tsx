export const LCH_ADDRESS = {
  line1: "Springhill Office Tower 11th Floor Unit H",
  line2: "Jl. Benyamin Suaeb Block D6, Kemayoran, Jakarta Utara 14410",
  phone: "Phone : +62 21 - 2605 1071, +62 21 - 2605 1072",
  skojk: "SKOJK Nomor : KEP - 46/NB.1/2016",
}

export function Letterhead({ withAddress = false }: { withAddress?: boolean }) {
  return (
    <header className="mb-8 border-b-2 border-primary pb-3">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          L
        </span>
        <div>
          <p className="text-xl leading-tight font-bold text-primary">
            PT. LCH{" "}
            <span className="font-semibold text-foreground">
              Insurance Brokers
            </span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            {LCH_ADDRESS.skojk}
          </p>
          {withAddress ? (
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
              {LCH_ADDRESS.line1} · {LCH_ADDRESS.line2} · {LCH_ADDRESS.phone}
            </p>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export function DocumentFooter({ printedAt }: { printedAt: string }) {
  return (
    <footer className="mt-10 border-t pt-4 text-center text-[10px] leading-relaxed text-muted-foreground">
      {LCH_ADDRESS.line1}
      <br />
      {LCH_ADDRESS.line2}
      <br />
      {LCH_ADDRESS.phone}
      <p className="mt-2">Dicetak: {printedAt}</p>
    </footer>
  )
}
