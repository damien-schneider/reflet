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
import { EmailAnalyticsDashboard } from "@/features/changelog/components/email-analytics-dashboard";

export default function EmailAnalyticsPage({
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {["a", "b", "c", "d"].map((id) => (
              <Skeleton className="h-24" key={id} />
            ))}
          </div>
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
        <PageTitle>Email Analytics</PageTitle>
      </PageHeader>
      <PageBody contentClassName="space-y-6">
        <EmailAnalyticsDashboard organizationId={org._id} />
      </PageBody>
    </PageLayout>
  );
}
