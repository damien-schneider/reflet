"use client";

import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { env } from "@reflet/env/web";
import { ConvexReactClient } from "convex/react";
import dynamic from "next/dynamic";
import type { PostHog } from "posthog-js";
import { useEffect, useState } from "react";
import { hasAnalyticsConsent } from "@/lib/cookie-consent";
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

interface PostHogBundle {
  client: PostHog;
  Provider: React.ComponentType<{
    client: PostHog;
    children: React.ReactNode;
  }>;
}

async function loadPostHog(): Promise<PostHogBundle> {
  const [posthogModule, reactModule] = await Promise.all([
    import("posthog-js"),
    import("posthog-js/react"),
  ]);
  return {
    client: posthogModule.default,
    Provider: reactModule.PostHogProvider,
  };
}

export function Providers({
  children,
  initialToken,
}: {
  children: React.ReactNode;
  initialToken?: string;
}) {
  const [posthog, setPosthog] = useState<PostHogBundle | null>(null);

  useEffect(() => {
    if (!(isPostHogConfigured && hasAnalyticsConsent())) {
      return;
    }
    let cancelled = false;
    loadPostHog()
      .then((bundle) => {
        if (!cancelled) {
          setPosthog(bundle);
        }
      })
      .catch(() => {
        setPosthog(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isPostHogEnabled = isPostHogConfigured && hasAnalyticsConsent();

  const inner = (
    <ConvexBetterAuthProvider
      // @ts-expect-error @convex-dev/better-auth 0.12.5 client type rejects its supported 1.6 peer
      authClient={authClient}
      client={convex}
      initialToken={initialToken}
    >
      {isPostHogEnabled && posthog && <PostHogIdentifier />}
      {children}
    </ConvexBetterAuthProvider>
  );

  if (!posthog) {
    return inner;
  }

  return <posthog.Provider client={posthog.client}>{inner}</posthog.Provider>;
}
