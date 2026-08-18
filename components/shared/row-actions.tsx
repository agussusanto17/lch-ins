"use client"

import type { LucideIcon } from "lucide-react"
import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface RowAction {
  label: string
  icon: LucideIcon
  href?: string
  onSelect?: () => void
  destructive?: boolean
  render?: React.ReactElement
}

/**
 * Kolom aksi baris. Ditempatkan di kolom paling kiri setiap tabel supaya
 * posisinya konsisten dan tidak ikut terdorong saat tabel melebar.
 */
export function RowActions({
  actions,
  label = "Aksi baris",
}: {
  actions: RowAction[]
  label?: string
}) {
  const primary = actions.filter((a) => !a.destructive)
  const destructive = actions.filter((a) => a.destructive)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            className="text-muted-foreground hover:text-foreground"
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuGroup>
          {primary.map((a) => (
            <DropdownMenuItem
              key={a.label}
              render={a.render}
              onClick={a.onSelect}
            >
              <a.icon />
              {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {destructive.length ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {destructive.map((a) => (
                <DropdownMenuItem
                  key={a.label}
                  variant="destructive"
                  onClick={a.onSelect}
                >
                  <a.icon />
                  {a.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Header sel untuk kolom aksi — lebar tetap, label disembunyikan secara visual. */
export const ACTION_COL_CLASS = "w-11 pl-4 pr-0"
