"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CommandPalette } from "@/components/layout/command-palette";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { NewTaskDialog } from "@/components/tasks/new-task-dialog";
import { DashboardThemeProvider, useDashboardTheme } from "@/lib/dashboard-theme";
import { QuickCreateProvider, useQuickCreate } from "@/lib/quick-create-context";
import { CommandPaletteProvider } from "@/lib/command-palette-context";

function AppShell({ children }: { children: React.ReactNode }) {
  const { accent } = useDashboardTheme();
  const quickCreate = useQuickCreate();
  return (
    <div className="dashboard-shell flex min-h-screen flex-1 bg-background" data-accent={accent}>
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-4 pb-20 pt-6 md:px-6 md:pb-6">{children}</main>
      </div>
      <MobileNav />
      <CommandPalette />
      <NewClientDialog hideTrigger open={quickCreate.newClientOpen} onOpenChange={quickCreate.setNewClientOpen} />
      <NewTaskDialog hideTrigger open={quickCreate.newTaskOpen} onOpenChange={quickCreate.setNewTaskOpen} />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex flex-1 items-center justify-center bg-background">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <DashboardThemeProvider>
      <QuickCreateProvider>
        <CommandPaletteProvider>
          <AppShell>{children}</AppShell>
        </CommandPaletteProvider>
      </QuickCreateProvider>
    </DashboardThemeProvider>
  );
}
