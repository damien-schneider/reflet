"use client";

import { Spinner } from "@phosphor-icons/react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import Homepage from "@/components/homepage/homepage";

/**
 * Root index route
 * - If logged in → redirect to /dashboard (which handles org selection)
 * - If not logged in → show homepage
 */
export default function Index() {
  const router = useRouter();

  return (
    <>
      <Authenticated>
        <RedirectToDashboard router={router} />
      </Authenticated>
      <Unauthenticated>
        <Homepage />
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Spinner className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AuthLoading>
    </>
  );
}

function RedirectToDashboard({
  router,
}: {
  router: ReturnType<typeof useRouter>;
}) {
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}
