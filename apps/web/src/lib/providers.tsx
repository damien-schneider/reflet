"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { env } from "@reflet/env/web";
import { ConvexReactClient } from "convex/react";
import dynamic from "next/dynamic";
import type { PostHog } from "posthog-js";
import { useEffect, useState } from "react";
import { hasAnalyticsConsent } from "@/components/cookie-consent-banner";
import { authClient } from "./auth-client";

const PostHogIdentifier = dynamic(
  () =>
    import("@/components/posthog-identifier").then((m) => ({
      default: m.PostHogIdentifier,
    })),
  { ssr: false }
);

const convexUrl = env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
}

const convex = new ConvexReactClient(convexUrl);

const isPostHogConfigured =
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
  const [PostHogProviderComp, setPostHogProviderComp] =
    useState<React.ComponentType<{
      client: PostHog;
      children: React.ReactNode;
    }> | null>(null);

  useEffect(function initPostHogAnalytics() {
    if (isPostHogConfigured && hasAnalyticsConsent()) {
      Promise.all([import("posthog-js"), import("posthog-js/react")]).then(
        ([posthogModule, reactModule]) => {
          setPosthogClient(posthogModule.default);
          setPostHogProviderComp(() => reactModule.PostHogProvider);
        }
      );
    }
  }, []);

  const isPostHogEnabled = isPostHogConfigured && hasAnalyticsConsent();

  const inner = (
    <ConvexBetterAuthProvider
      authClient={authClient}
      client={convex}
      initialToken={initialToken}
    >
      {isPostHogEnabled && posthogClient && <PostHogIdentifier />}
      {children}
    </ConvexBetterAuthProvider>
  );

  if (!(PostHogProviderComp && posthogClient)) {
    return inner;
  }

  return (
    <PostHogProviderComp client={posthogClient}>{inner}</PostHogProviderComp>
  );
}
