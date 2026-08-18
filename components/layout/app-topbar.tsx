"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell } from "lucide-react"

import { CommandMenu } from "@/components/layout/command-menu"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const SEGMENT_LABELS: Record<string, string> = {
  marketing: "Marketing",
  underwriting: "Underwriting",
  policies: "Policy Database",
  claims: "Klaim",
  reports: "Report",
  "master-clauses": "Master Clauses",
  new: "Baru",
  edit: "Edit",
  quotation: "Quotation Slip",
  "cover-note": "Cover Note",
  closing: "Closing Instruction",
  slip: "Placing Slip",
}

function buildCrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  const crumbs: { label: string; href: string }[] = []
  let href = ""
  for (const segment of segments) {
    href += `/${segment}`
    const label = SEGMENT_LABELS[segment]
    if (!label) continue
    crumbs.push({ label, href })
  }
  return crumbs
}

export function AppTopbar() {
  const pathname = usePathname()
  const crumbs = buildCrumbs(pathname)

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-sm md:rounded-t-2xl">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />

      <Breadcrumb className="min-w-0">
        <BreadcrumbList>
          <BreadcrumbItem>
            {crumbs.length === 0 ? (
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            ) : (
              <BreadcrumbLink render={<Link href="/" />}>
                Dashboard
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {crumbs.map((crumb, i) => (
            <span key={crumb.href} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem className="max-md:hidden">
                {i === crumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={crumb.href} />}>
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <CommandMenu />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Notifikasi"
          className="relative"
        >
          <Bell />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
        </Button>
        <ThemeToggle />
        <Separator orientation="vertical" className="mx-1 h-4" />
        <Avatar className="size-7 rounded-md">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            AS
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
