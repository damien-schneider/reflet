"use client";

import {
  PageBody,
  PageDescription,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";
import { EmailAnalyticsDashboard } from "@/features/changelog/components/email-analytics-dashboard";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";

export default function EmailAnalyticsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  if (org === undefined) {
    return (
      <PageLayout width="wide">
        <PageHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </PageHeader>
        <PageBody contentClassName="space-y-6">
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
    return <OrgNotFound />;
  }

  return (
    <PageLayout width="wide">
      <PageHeader>
        <PageTitle>Email analytics</PageTitle>
        <PageDescription>
          Delivery, opens, and clicks for your notification emails.
        </PageDescription>
      </PageHeader>
      <PageBody contentClassName="space-y-6">
        <EmailAnalyticsDashboard organizationId={org._id} />
      </PageBody>
    </PageLayout>
  );
}
