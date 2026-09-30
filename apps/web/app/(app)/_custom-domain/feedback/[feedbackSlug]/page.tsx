"use client";

import { use } from "react";
import { PublicFeedbackDetailPage } from "@/features/feedback/components/public-feedback-detail/public-feedback-detail-page";
import { PublicOrgNotFound } from "@/features/public-org/components/public-org-states";
import { useCustomDomainOrg } from "@/features/public-org/hooks/use-custom-domain-org";

export default function CustomDomainFeedbackDetailPage({
  params,
}: {
  params: Promise<{ feedbackSlug: string }>;
}) {
  const { feedbackSlug } = use(params);
  const org = useCustomDomainOrg();

  return (
    <PublicFeedbackDetailPage
      feedbackId={feedbackSlug}
      notFound={
        <PublicOrgNotFound
          description="No organization is set up for this domain yet."
          homeHref="https://www.reflet.app"
          homeLabel="Go to Reflet"
          title="Site not found"
        />
      }
      org={org}
    />
  );
}
