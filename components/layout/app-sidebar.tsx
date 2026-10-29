"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, LogOut } from "lucide-react"

import logoMark from "@/public/images/logo-lch-mark.png"
import { NAV_GROUPS, type NavItem } from "@/components/layout/nav-items"
import { canAccess } from "@/lib/access"
import { signOut } from "@/lib/auth-client"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  if (href === "/underwriting") {
    return (
      pathname.startsWith("/underwriting") &&
      !pathname.startsWith("/underwriting/master-clauses")
    )
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavButton({
  item,
  active,
}: {
  item: NavItem
  active: boolean
}) {
  return (
    <SidebarMenuButton
      render={<Link href={item.href} />}
      isActive={active}
      tooltip={item.title}
    >
      <item.icon />
      <span className="truncate">{item.title}</span>
      {item.soon ? (
        <span
          title="Modul belum dikerjakan"
          className="ml-auto shrink-0 rounded-full border px-1.5 py-px text-[9px] font-medium tracking-wide text-muted-foreground"
        >
          SOON
        </span>
      ) : null}
    </SidebarMenuButton>
  )
}

/**
 * Menu yang punya submenu.
 *
 * Judulnya tetap tautan — menuju halaman induk, yang mengalihkan ke bagian
 * pertama — dan tanda panah di sebelahnya yang membuka tutup daftarnya. Dua
 * sasaran klik yang terpisah, supaya membuka submenu tidak memaksa pindah
 * halaman dan sebaliknya.
 */
function NavItemWithSub({
  item,
  pathname,
}: {
  item: NavItem
  pathname: string
}) {
  const active = isActive(pathname, item.href)

  // Terbuka sendiri begitu salah satu anaknya aktif, termasuk saat pindah ke
  // sana dari tempat lain — tautan di dalam halaman, misalnya. Disetel saat
  // render, bukan di dalam efek, supaya tidak memicu render bertingkat.
  const [open, setOpen] = React.useState(active)
  const [prevActive, setPrevActive] = React.useState(active)
  if (prevActive !== active) {
    setPrevActive(active)
    if (active) setOpen(true)
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <SidebarMenuItem>
        <NavButton item={item} active={active} />
        <CollapsibleTrigger
          render={
            <SidebarMenuAction
              aria-label={`${open ? "Tutup" : "Buka"} submenu ${item.title}`}
            />
          }
          className="peer-data-[active=true]/menu-button:text-sidebar-accent-foreground"
        >
          <ChevronRight
            className={cn("transition-transform duration-150", open && "rotate-90")}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.items?.map((sub) => (
              <SidebarMenuSubItem key={sub.href}>
                <SidebarMenuSubButton
                  render={<Link href={sub.href} />}
                  isActive={pathname === sub.href}
                >
                  <span className="truncate">{sub.title}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function AppSidebar({
  roleCode,
  roles,
}: {
  roleCode?: string
  roles?: string[]
}) {
  const userRoles =
    roles && roles.length > 0 ? roles : roleCode ? [roleCode] : []

  // Menu yang tidak boleh dibuka role ini tidak ditampilkan. Ini kenyamanan,
  // bukan pengaman: penjagaan yang sebenarnya ada di lib/server/session.ts.
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccess(userRoles, item.href)),
  })).filter((group) => group.items.length > 0)

  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="h-14 justify-center border-b px-4 group-data-[collapsible=icon]:px-2">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          {/* Tile putih tetap dipakai di tema gelap karena latar emblem putih. */}
          <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-sidebar-border">
            <Image src={logoMark} alt="" className="size-full" loading="eager" />
          </span>
          <span className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-[13px] font-semibold text-sidebar-accent-foreground">
              PT. LCH
            </span>
            <span className="truncate text-[10px] tracking-[0.12em]">
              INSURANCE BROKERS
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2 py-3">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="gap-1 px-0 py-1.5">
            <SidebarGroupLabel className="h-6 px-3 text-[10px] font-semibold tracking-[0.09em] uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) =>
                  item.items?.length ? (
                    <NavItemWithSub
                      key={item.href}
                      item={item}
                      pathname={pathname}
                    />
                  ) : (
                    <SidebarMenuItem key={item.href}>
                      <NavButton
                        item={item}
                        active={isActive(pathname, item.href)}
                      />
                    </SidebarMenuItem>
                  )
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Keluar"
              onClick={async () => {
                try {
                  await signOut()
                } finally {
                  window.location.replace("/login")
                }
              }}
            >
              <LogOut />
              <span>Keluar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
