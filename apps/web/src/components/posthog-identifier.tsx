"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth-client";

export function PostHogIdentifier() {
  const posthog = usePostHog();
  const { data: session } = authClient.useSession();
  const params = useParams();
  const rawOrgSlug = params?.orgSlug;
  const orgSlug = typeof rawOrgSlug === "string" ? rawOrgSlug : undefined;

  const org = useQuery(
    api.organizations.getBySlug,
    orgSlug ? { slug: orgSlug } : "skip"
  );

  const lastIdentifiedUserId = useRef<string | null>(null);
  const lastGroupedOrgId = useRef<string | null>(null);

  // Identify user when session changes
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || userId === lastIdentifiedUserId.current) {
      return;
    }

    posthog.identify(userId, {
      email: session.user.email,
      name: session.user.name,
    });
    lastIdentifiedUserId.current = userId;
  }, [posthog, session?.user?.id, session?.user?.email, session?.user?.name]);

  // Set organization group when org context changes
  useEffect(() => {
    const orgId = org?._id;
    if (!orgId || orgId === lastGroupedOrgId.current) {
      return;
    }

    posthog.group("organization", orgId, {
      name: org.name,
      slug: org.slug,
      subscription_tier: org.subscriptionTier,
    });
    lastGroupedOrgId.current = orgId;
  }, [posthog, org?._id, org?.name, org?.slug, org?.subscriptionTier]);

  // Clear refs when user logs out (reset handled in sign-out handlers)
  useEffect(() => {
    if (!session?.user?.id) {
      lastIdentifiedUserId.current = null;
      lastGroupedOrgId.current = null;
    }
  }, [session?.user?.id]);

  return null;
}
