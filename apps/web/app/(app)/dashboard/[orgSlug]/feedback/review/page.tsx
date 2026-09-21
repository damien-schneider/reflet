"use client";

import {
  PageBody,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";
import { PendingReviewPanel } from "@/features/feedback/components/pending-review-panel";

export default function PendingReviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  if (org === undefined) {
    return (
      <PageLayout scroll="page" width="wide">
        <PageBody contentClassName="space-y-6">
          <Skeleton className="h-10 w-48" />
          {["a", "b", "c"].map((id) => (
            <Skeleton className="h-32" key={id} />
          ))}
        </PageBody>
      </PageLayout>
    );
  }

  if (org === null) {
    return (
      <PageLayout scroll="page" width="wide">
        <PageHeader>
          <PageTitle>Organization not found</PageTitle>
        </PageHeader>
      </PageLayout>
    );
  }

  return (
    <PageLayout scroll="page" width="wide">
      <PageHeader>
        <PageTitle>Review</PageTitle>
      </PageHeader>
      <PageBody contentClassName="space-y-6">
        <PendingReviewPanel organizationId={org._id} orgSlug={orgSlug} />
      </PageBody>
    </PageLayout>
  );
}
