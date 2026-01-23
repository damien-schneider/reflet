"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { env } from "@reflet-v2/env/web";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useEffect, useMemo, useRef } from "react";

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

  const hasConnectedRef = useRef(false);

  useEffect(() => {
    if (!hasConnectedRef.current) {
      convexQueryClient.connect(queryClient);
      hasConnectedRef.current = true;
    }

    if (initialToken) {
      convexQueryClient.serverHttpClient?.setAuth(initialToken);
    }

    return () => {
      hasConnectedRef.current = false;
    };
  }, [convexQueryClient, queryClient, initialToken]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <ConvexBetterAuthProvider
        authClient={authClient}
        client={convexQueryClient.convexClient}
        initialToken={initialToken}
      >
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ConvexBetterAuthProvider>
    </ThemeProvider>
  );
}
