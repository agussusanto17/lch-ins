"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { MoreHorizontal } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface RowActionConfirm {
  title: string
  description: string
  actionLabel?: string
}

export interface RowAction {
  label: string
  icon: LucideIcon
  onSelect?: () => void
  destructive?: boolean
  render?: React.ReactElement
  /** Aksi berisiko minta konfirmasi dulu sebelum `onSelect` dijalankan. */
  confirm?: RowActionConfirm
  disabled?: boolean
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
  const [pending, setPending] = React.useState<RowAction | null>(null)
  const primary = actions.filter((a) => !a.destructive)
  const destructive = actions.filter((a) => a.destructive)

  function select(action: RowAction) {
    if (action.confirm) setPending(action)
    else action.onSelect?.()
  }

  return (
    <>
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
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuGroup>
            {primary.map((a) => (
              <DropdownMenuItem
                key={a.label}
                render={a.render}
                disabled={a.disabled}
                onClick={() => select(a)}
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
                    disabled={a.disabled}
                    onClick={() => select(a)}
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

      <AlertDialog
        open={pending != null}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.confirm?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant={pending?.destructive ? "destructive" : "default"}
              onClick={() => {
                pending?.onSelect?.()
                setPending(null)
              }}
            >
              {pending?.confirm?.actionLabel ?? pending?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/** Header sel untuk kolom aksi — lebar tetap, label disembunyikan secara visual. */
export const ACTION_COL_CLASS = "no-print w-11 pl-4 pr-0"
