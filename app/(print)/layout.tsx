export default function PrintLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-svh bg-muted/50">{children}</div>
}
