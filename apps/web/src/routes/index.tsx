import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Loader2 } from "lucide-react";

import Homepage from "@/components/homepage/homepage";

export const Route = createFileRoute("/")({
  component: Index,
});

/**
 * Root index route
 * - If logged in → redirect to /dashboard (which handles org selection)
 * - If not logged in → show homepage
 */
function Index() {
  return (
    <>
      <Authenticated>
        <Navigate replace to="/dashboard" />
      </Authenticated>
      <Unauthenticated>
        <Homepage />
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AuthLoading>
    </>
  );
}
