"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { env } from "@reflet/env/web";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
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
        {isPostHogEnabled && <PostHogIdentifier />}
        {children}
      </ConvexBetterAuthProvider>
    </ThemeProvider>
  );

  if (!isPostHogEnabled) {
    return inner;
  }

  return <PostHogProvider client={posthog}>{inner}</PostHogProvider>;
}
