"use client";

import { AppShell } from "@ctrl-ui/react/ui/app-shell";
import { useConvexAuth } from "convex/react";
import { useAtom } from "jotai";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import UnifiedAuthForm from "@/features/auth/components/unified-auth/unified-auth-form";
import { sidebarOpenAtom } from "@/store/dashboard-atoms";
import { DashboardContent } from "./dashboard-content";
import { DashboardLoading } from "./shell/dashboard-loading";

const subscribeToNothing = () => () => undefined;

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);
  const pathname = usePathname();
  const isClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
  const loading = !isClient || isLoading;
  const scroll = pathname?.split("/")[3] === "inbox" ? "none" : "page";

  if (!(loading || isAuthenticated)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background pb-[10vh]">
        <UnifiedAuthForm />
      </div>
    );
  }

  return (
    <AppShell onOpenChange={setSidebarOpen} open={sidebarOpen} scroll={scroll}>
      {loading ? (
        <DashboardLoading />
      ) : (
        <DashboardContent>{children}</DashboardContent>
      )}
    </AppShell>
  );
}
