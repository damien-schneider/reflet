"use client";

import { DashboardShellBoundary } from "@app/(app)/dashboard/shell/dashboard-error-boundary";
import { AppShell } from "@ctrl-ui/react/ui/app-shell";
import { useConvexAuth } from "convex/react";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import UnifiedAuthForm from "@/features/auth/components/unified-auth/unified-auth-form";
import { DashboardContent } from "./dashboard-content";
import { DashboardLoading } from "./shell/dashboard-loading";
import { isInboxRoute } from "./shell/dashboard-workspace";

const subscribeToNothing = () => () => undefined;

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const pathname = usePathname();
  const isClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );
  const loading = !isClient || isLoading;
  const scroll = isInboxRoute(pathname ?? "") ? "none" : "inset";

  if (!(loading || isAuthenticated)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background pb-[10vh]">
        <UnifiedAuthForm />
      </div>
    );
  }

  return (
    <AppShell
      defaultWidth={288}
      open={false}
      persistOpen={false}
      scroll={scroll}
      style={{ "--sidebar-width-icon": "3.5rem" }}
    >
      {loading ? (
        <DashboardLoading pathname={pathname ?? ""} />
      ) : (
        <DashboardShellBoundary pathname={pathname ?? "/dashboard"}>
          <DashboardContent>{children}</DashboardContent>
        </DashboardShellBoundary>
      )}
    </AppShell>
  );
}
