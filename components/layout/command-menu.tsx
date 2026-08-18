"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { FilePlus2, Search, TriangleAlert, UserPlus } from "lucide-react"

import { NAV_GROUPS } from "@/components/layout/nav-items"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { SLIPS } from "@/lib/data"

const ACTIONS = [
  {
    title: "Buat Placing Slip baru",
    href: "/underwriting/new",
    icon: FilePlus2,
  },
  { title: "Tambah klien baru", href: "/marketing", icon: UserPlus },
  { title: "Input klaim baru", href: "/claims", icon: TriangleAlert },
]

export function CommandMenu() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  function go(href: string) {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-56 justify-start font-normal text-muted-foreground max-lg:w-9 max-lg:justify-center max-lg:px-0"
        onClick={() => setOpen(true)}
      >
        <Search data-icon="inline-start" />
        <span className="max-lg:hidden">Cari apa saja…</span>
        <CommandShortcut className="ml-auto max-lg:hidden">⌘K</CommandShortcut>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Pencarian"
        description="Cari halaman, slip, atau aksi cepat"
      >
        <CommandInput placeholder="Ketik untuk mencari…" />
        <CommandList>
          <CommandEmpty>Tidak ada hasil.</CommandEmpty>
          <CommandGroup heading="Aksi cepat">
            {ACTIONS.map((a) => (
              <CommandItem
                key={a.title}
                value={a.title}
                onSelect={() => go(a.href)}
              >
                <a.icon />
                {a.title}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Halaman">
            {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
              <CommandItem
                key={item.href}
                value={item.title}
                onSelect={() => go(item.href)}
              >
                <item.icon />
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Placing Slip">
            {SLIPS.slice(0, 6).map((s) => (
              <CommandItem
                key={s.id}
                value={`${s.slipNo ?? "draft"} ${s.insuredName}`}
                onSelect={() => go(`/underwriting/edit/${s.id}`)}
              >
                <FilePlus2 />
                <span className="truncate">{s.insuredName}</span>
                <CommandShortcut>{s.slipNo ?? "Draft"}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
