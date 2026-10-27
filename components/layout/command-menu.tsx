"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { FilePlus2, Search, TriangleAlert, UserPlus } from "lucide-react"

import { usePermission } from "@/components/auth/permission-provider"
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

export function CommandMenu() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const { canAccess, canManage } = usePermission()

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

  const allowedActions = [
    canManage("/underwriting")
      ? {
          title: "Buat Placing Slip baru",
          href: "/underwriting/new",
          icon: FilePlus2,
        }
      : null,
    canManage("/marketing")
      ? { title: "Tambah klien baru", href: "/marketing", icon: UserPlus }
      : null,
    canManage("/claims")
      ? { title: "Input klaim baru", href: "/claims", icon: TriangleAlert }
      : null,
  ].filter((a): a is { title: string; href: string; icon: typeof FilePlus2 } => a !== null)

  const allowedPages = NAV_GROUPS.flatMap((g) => g.items).filter((item) =>
    canAccess(item.href)
  )

  const canAccessUnderwriting = canAccess("/underwriting")
  const canManageUnderwriting = canManage("/underwriting")

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
          {allowedActions.length > 0 ? (
            <>
              <CommandGroup heading="Aksi cepat">
                {allowedActions.map((a) => (
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
            </>
          ) : null}
          {allowedPages.length > 0 ? (
            <>
              <CommandGroup heading="Halaman">
                {allowedPages.map((item) => (
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
            </>
          ) : null}
          {canAccessUnderwriting ? (
            <CommandGroup heading="Placing Slip">
              {SLIPS.slice(0, 6).map((s) => (
                <CommandItem
                  key={s.id}
                  value={`${s.slipNo ?? "draft"} ${s.insuredName}`}
                  onSelect={() =>
                    go(
                      canManageUnderwriting
                        ? `/underwriting/edit/${s.id}`
                        : `/underwriting/slip/${s.id}`
                    )
                  }
                >
                  <FilePlus2 />
                  <span className="truncate">{s.insuredName}</span>
                  <CommandShortcut>{s.slipNo ?? "Draft"}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  )
}
