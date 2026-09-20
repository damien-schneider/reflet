"use client";

import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";
import { PublicFeedbackDetailContent } from "@/features/feedback/components/public-feedback-detail/public-feedback-detail-content";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/branding";
import { toId } from "@/lib/convex-helpers";

export default function FeedbackItemClient({
  params,
}: {
  params: Promise<{ orgSlug: string; feedbackId: string }>;
}) {
  const { orgSlug, feedbackId } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  const membership = useQuery(
    api.organizations.members.getMembership,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const isMember = !!membership;
  const isAdmin = membership?.role === "admin" || membership?.role === "owner";

  if (org === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="mx-auto h-10 w-64" />
        <Skeleton className="mx-auto mt-4 h-64 w-full max-w-3xl" />
      </div>
    );
  }

  if (!org) {
    return null;
  }

  const primaryColor = org.primaryColor ?? DEFAULT_PRIMARY_COLOR;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <PublicFeedbackDetailContent
        feedbackId={toId("feedback", feedbackId)}
        isAdmin={isAdmin}
        isMember={isMember}
        organizationId={org._id}
        primaryColor={primaryColor}
      />
    </div>
  );
}
