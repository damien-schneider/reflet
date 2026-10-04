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
import { DuplicateReviewPanel } from "@/features/feedback/components/duplicate-review-panel";
import { ReviewQueueSkeleton } from "@/features/feedback/components/review-queue-parts";

export default function DuplicateReviewPage({
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
        <PageTitle>Duplicates</PageTitle>
        <PageDescription>
          Merge posts that ask for the same thing so votes add up in one place.
        </PageDescription>
      </PageHeader>
      <PageBody contentClassName="space-y-6">
        {org === undefined ? (
          <ReviewQueueSkeleton />
        ) : (
          <DuplicateReviewPanel
            canMerge={org.role === "admin" || org.role === "owner"}
            organizationId={org._id}
          />
        )}
      </PageBody>
    </PageLayout>
  );
}
