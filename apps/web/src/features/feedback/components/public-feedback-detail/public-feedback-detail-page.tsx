"use client";

import { PageBody, PageLayout } from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import type { ReactNode } from "react";
import { PublicFeedbackDetailContent } from "@/features/feedback/components/public-feedback-detail/public-feedback-detail-content";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/branding";
import { toId } from "@/lib/convex-helpers";

interface PublicFeedbackOrg {
  _id: Id<"organizations">;
  primaryColor?: string;
}

export function PublicFeedbackDetailPage({
  feedbackId,
  notFound,
  org,
}: {
  feedbackId: string;
  notFound: ReactNode;
  org: PublicFeedbackOrg | null | undefined;
}) {
  if (org === null) {
    return notFound;
  }

  return (
    <PageLayout scroll="page" width="content">
      <PageBody>
        {org === undefined ? (
          <div aria-busy="true" className="flex items-start gap-4 p-6">
            <Skeleton className="h-16 w-12" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ) : (
          <OrgFeedbackDetail feedbackId={feedbackId} org={org} />
        )}
      </PageBody>
    </PageLayout>
  );
}

function OrgFeedbackDetail({
  feedbackId,
  org,
}: {
  feedbackId: string;
  org: PublicFeedbackOrg;
}) {
  const membership = useQuery(api.organizations.members.getMembership, {
    organizationId: org._id,
  });

  return (
    <PublicFeedbackDetailContent
      feedbackId={toId("feedback", feedbackId)}
      isAdmin={membership?.role === "admin" || membership?.role === "owner"}
      isMember={Boolean(membership)}
      organizationId={org._id}
      primaryColor={org.primaryColor ?? DEFAULT_PRIMARY_COLOR}
    />
  );
}
