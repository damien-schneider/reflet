"use client";

import { Spinner } from "@phosphor-icons/react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useEffect, useState } from "react";

import { UnifiedAuthForm } from "@/features/auth/components/unified-auth-form";
import { DashboardContent } from "./dashboard-content";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="h-svh bg-background">
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
        <div className="flex h-full items-center justify-center">
          <UnifiedAuthForm />
        </div>
      </Unauthenticated>
      <AuthLoading>
        <div className="flex h-full items-center justify-center">
          <Spinner className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AuthLoading>
    </div>
  );
}
