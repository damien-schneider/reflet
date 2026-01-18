"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { env } from "@reflet-v2/env/web";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { authClient } from "./auth-client";

const convexUrl = env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
}

export function Providers({
  children,
  initialToken,
}: {
  children: React.ReactNode;
  initialToken?: string;
}) {
  const convexQueryClient = useMemo(() => new ConvexQueryClient(convexUrl), []);

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            queryKeyHashFn: convexQueryClient.hashFn(),
            queryFn: convexQueryClient.queryFn(),
          },
        },
      }),
    [convexQueryClient]
  );

  useEffect(() => {
    convexQueryClient.connect(queryClient);
    if (initialToken) {
      convexQueryClient.serverHttpClient?.setAuth(initialToken);
    }
  }, [convexQueryClient, queryClient, initialToken]);

  return (
    <ConvexBetterAuthProvider
      authClient={authClient}
      client={convexQueryClient.convexClient}
      initialToken={initialToken}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ConvexBetterAuthProvider>
  );
}
