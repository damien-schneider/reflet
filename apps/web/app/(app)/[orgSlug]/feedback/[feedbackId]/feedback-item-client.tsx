"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";
import { PublicFeedbackDetailPage } from "@/features/feedback/components/public-feedback-detail/public-feedback-detail-page";
import { PublicOrgNotFound } from "@/features/public-org/components/public-org-states";

export default function FeedbackItemClient({
  params,
}: {
  params: Promise<{ orgSlug: string; feedbackId: string }>;
}) {
  const { orgSlug, feedbackId } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  return (
    <PublicFeedbackDetailPage
      feedbackId={feedbackId}
      notFound={
        <PublicOrgNotFound
          description="Check the link, or ask the team that shared it for the right address."
          homeHref="/"
          homeLabel="Go to homepage"
          title="Organization not found"
        />
      }
      org={org}
    />
  );
}
