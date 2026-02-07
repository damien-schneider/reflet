"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import UnifiedAuthForm from "@/features/auth/components/unified-auth/unified-auth-form";
import { DashboardContent } from "./dashboard-content";

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="min-h-svh bg-background">
      <Authenticated>
        {isClient ? (
          <DashboardContent>{children}</DashboardContent>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Spinner className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </Authenticated>
      <Unauthenticated>
        <div className="flex h-full items-center justify-center pb-[10vh]">
          <UnifiedAuthForm />
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex h-full items-center justify-center">
          <Spinner />
        </div>
      </AuthLoading>
    </div>
  );
}
