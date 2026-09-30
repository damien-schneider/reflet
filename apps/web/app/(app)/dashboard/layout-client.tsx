"use client";

import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useSyncExternalStore } from "react";
import UnifiedAuthForm from "@/features/auth/components/unified-auth/unified-auth-form";
import { DashboardContent } from "./dashboard-content";

const SIDEBAR_SKELETON_ROWS = ["a", "b", "c", "d", "e", "f"] as const;
const subscribeToNothing = () => () => undefined;

function DashboardShellSkeleton() {
  return (
    <div aria-busy="true" className="flex min-h-svh">
      <span className="sr-only">Loading dashboard…</span>
      <div className="hidden w-64 shrink-0 flex-col gap-2 border-border/60 border-r p-2 lg:flex">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-8 w-full" />
        <div className="mt-4 flex flex-col gap-1">
          {SIDEBAR_SKELETON_ROWS.map((row) => (
            <Skeleton className="h-8 w-full" key={row} />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center gap-2 border-border/60 border-b px-4">
          <Skeleton className="size-8" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const isClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  );

  return (
    <div className="min-h-svh bg-background">
      <Authenticated>
        {isClient ? (
          <DashboardContent>{children}</DashboardContent>
        ) : (
          <DashboardShellSkeleton />
        )}
      </Authenticated>
      <Unauthenticated>
        <div className="flex min-h-svh items-center justify-center pb-[10vh]">
          <UnifiedAuthForm />
        </div>
      </Unauthenticated>
      <AuthLoading>
        <DashboardShellSkeleton />
      </AuthLoading>
    </div>
  );
}
