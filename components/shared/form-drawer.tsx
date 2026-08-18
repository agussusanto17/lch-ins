"use client"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

/**
 * Drawer samping untuk semua form entri data. Menggantikan modal dialog —
 * konteks tabel di belakang tetap terlihat dan form panjang tidak perlu
 * scroll di dalam kotak sempit.
 */
export function FormDrawer({
  trigger,
  title,
  description,
  children,
  onSubmit,
  submitLabel = "Simpan",
  open,
  onOpenChange,
  className,
}: {
  trigger: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
  onSubmit: () => void
  submitLabel?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger render={trigger as React.ReactElement} />
      <SheetContent
        className={cn("flex w-full flex-col gap-0 p-0 sm:max-w-xl", className)}
      >
        <SheetHeader className="border-b px-6 py-5">
          <SheetTitle className="text-base">{title}</SheetTitle>
          {description ? (
            <SheetDescription>{description}</SheetDescription>
          ) : null}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>

        <SheetFooter className="flex-row justify-end gap-2 border-t px-6 py-4">
          <SheetClose render={<Button variant="outline" />}>Batal</SheetClose>
          <Button onClick={onSubmit}>{submitLabel}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
