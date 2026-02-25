"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { env } from "@reflet/env/web";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import type { PostHog } from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect, useState } from "react";
import { PostHogIdentifier } from "@/components/posthog-identifier";
import { authClient } from "./auth-client";

const convexUrl = env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
}

const convex = new ConvexReactClient(convexUrl);

const isPostHogEnabled =
  Boolean(env.NEXT_PUBLIC_POSTHOG_KEY) &&
  process.env.NODE_ENV !== "development";

export function Providers({
  children,
  initialToken,
}: {
  children: React.ReactNode;
  initialToken?: string;
}) {
  const [posthogClient, setPosthogClient] = useState<PostHog | null>(null);

  useEffect(() => {
    if (isPostHogEnabled) {
      import("posthog-js").then(({ default: ph }) => {
        setPosthogClient(ph);
      });
    }
  }, []);

  const inner = (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <ConvexBetterAuthProvider
        authClient={authClient}
        client={convex}
        initialToken={initialToken}
      >
        {isPostHogEnabled && posthogClient && <PostHogIdentifier />}
        {children}
      </ConvexBetterAuthProvider>
    </ThemeProvider>
  );

  if (!(isPostHogEnabled && posthogClient)) {
    return inner;
  }

  return <PostHogProvider client={posthogClient}>{inner}</PostHogProvider>;
}
