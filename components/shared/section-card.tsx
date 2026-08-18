import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <Card className={cn("gap-0", className)}>
      {title ? (
        <CardHeader className="flex-wrap items-center gap-x-4 gap-y-2 border-b pb-4">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {action ? (
            <CardAction className="self-center">{action}</CardAction>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn("pt-5", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}
