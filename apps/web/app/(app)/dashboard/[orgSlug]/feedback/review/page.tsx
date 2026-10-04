"use client";

import {
  PageBody,
  PageDescription,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";
import { PendingReviewPanel } from "@/features/feedback/components/pending-review-panel";
import { ReviewQueueSkeleton } from "@/features/feedback/components/review-queue-parts";

export default function PendingReviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  if (org === null) {
    return <OrgNotFound />;
  }

  return (
    <PageLayout width="wide">
      <PageHeader>
        <PageTitle>Review</PageTitle>
        <PageDescription>
          Approve or dismiss feedback the AI held back before it reaches your
          board.
        </PageDescription>
      </PageHeader>
      <PageBody contentClassName="space-y-6">
        {org === undefined ? (
          <ReviewQueueSkeleton />
        ) : (
          <PendingReviewPanel organizationId={org._id} orgSlug={orgSlug} />
        )}
      </PageBody>
    </PageLayout>
  );
}
