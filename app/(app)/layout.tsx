import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppTopbar } from "@/components/layout/app-topbar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <AppTopbar />
        <div className="flex-1 overflow-x-hidden bg-muted/40">{children}</div>
      </SidebarInset>
      <Toaster position="top-center" />
    </SidebarProvider>
  )
}
