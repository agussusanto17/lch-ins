import { Inbox } from "lucide-react"

import { TableCell, TableRow } from "@/components/ui/table"

export function TableEmpty({
  colSpan,
  message = "Tidak ada data",
}: {
  colSpan: number
  message?: string
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="py-14 text-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Inbox className="size-6 opacity-60" />
          <span className="text-sm">{message}</span>
        </div>
      </TableCell>
    </TableRow>
  )
}
