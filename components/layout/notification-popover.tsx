"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  CheckCheck,
  Clock,
  FileText,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { dateShort } from "@/lib/format"
import type { TopbarData } from "@/lib/topbar-types"

interface NotificationItem {
  id: string
  title: string
  description: string
  time: string
  href: string
  icon: typeof FileText
  tone: "warning" | "info" | "neutral"
}

const STORAGE_KEY = "lch_read_notifications"

// The storage event only fires in other tabs, so same-tab writes notify these.
const readListeners = new Set<() => void>()

function subscribeReadIds(onChange: () => void) {
  readListeners.add(onChange)
  window.addEventListener("storage", onChange)
  return () => {
    readListeners.delete(onChange)
    window.removeEventListener("storage", onChange)
  }
}

function readStoredIds(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage unavailable or blocked
    return null
  }
}

function parseReadIds(stored: string | null): Set<string> {
  if (!stored) return new Set()
  try {
    return new Set(JSON.parse(stored))
  } catch {
    return new Set()
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)))
  } catch {
    // Storage write failed
  }
  readListeners.forEach((notify) => notify())
}

export function NotificationPopover({ data }: { data?: TopbarData }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  // Server snapshot is null so the hydrated markup matches; stored ids apply right after.
  const storedReadIds = React.useSyncExternalStore(
    subscribeReadIds,
    readStoredIds,
    () => null
  )
  const readIds = React.useMemo(
    () => parseReadIds(storedReadIds),
    [storedReadIds]
  )

  const items = React.useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = []

    for (const p of data?.expiringPolicies ?? []) {
      list.push({
        id: `policy-${p.id}`,
        title: `Polis Mendekati Jatuh Tempo`,
        description: `${p.policyNo} · ${p.insuredName} (Berakhir ${dateShort(p.expiryDate)})`,
        time: `Jatuh tempo ${dateShort(p.expiryDate)}`,
        href: `/marketing/renewal`,
        icon: Clock,
        tone: "warning",
      })
    }

    for (const c of data?.openClaims ?? []) {
      list.push({
        id: `claim-${c.id}`,
        title: "Klaim Outstanding",
        description: `${c.claimNo} · ${c.insuredName}`,
        time: dateShort(c.lossDate),
        href: `/claims`,
        icon: TriangleAlert,
        tone: "warning",
      })
    }

    for (const s of data?.draftSlips ?? []) {
      list.push({
        id: `slip-${s.id}`,
        title: "Placing Slip Draft",
        description: `${s.slipNo ?? "Draft"} · ${s.insuredName}`,
        time: s.date ? dateShort(s.date) : "",
        href: `/underwriting/edit/${s.id}`,
        icon: ShieldAlert,
        tone: "info",
      })
    }

    return list
  }, [data])

  const unreadCount = items.filter((item) => !readIds.has(item.id)).length

  function markAllRead() {
    const allIds = items.map((i) => i.id)
    saveReadIds(new Set(allIds))
  }

  function handleSelect(item: NotificationItem) {
    if (!readIds.has(item.id)) {
      const nextSet = new Set(readIds)
      nextSet.add(item.id)
      saveReadIds(nextSet)
    }
    setOpen(false)
    router.push(item.href)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Notifikasi (${unreadCount} belum dibaca)`}
            className="relative"
          />
        }
      >
        <Bell />
        {unreadCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
        ) : null}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-84 max-w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden"
      >
        <PopoverHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <PopoverTitle className="text-sm font-semibold">
              Notifikasi
            </PopoverTitle>
            {unreadCount > 0 ? (
              <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
                {unreadCount} baru
              </Badge>
            ) : null}
          </div>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="h-7 gap-1 px-2 text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="size-3.5" />
              Tandai dibaca
            </Button>
          ) : null}
        </PopoverHeader>

        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
              <Bell className="size-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">Tidak ada notifikasi baru</p>
              <p className="text-xs text-muted-foreground">
                Semua tugas operasional telah terselesaikan.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const Icon = item.icon
              const isUnread = !readIds.has(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={`flex w-full items-start gap-3 p-3.5 text-left text-xs transition-colors hover:bg-muted/50 cursor-pointer ${
                    isUnread ? "bg-muted/20" : ""
                  }`}
                >
                  <div
                    className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg ${
                      item.tone === "warning"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`truncate font-medium text-foreground ${
                          isUnread ? "font-semibold" : ""
                        }`}
                      >
                        {item.title}
                      </p>
                      {isUnread ? (
                        <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                      ) : null}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-muted-foreground">
                      {item.description}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/75">
                      {item.time}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
