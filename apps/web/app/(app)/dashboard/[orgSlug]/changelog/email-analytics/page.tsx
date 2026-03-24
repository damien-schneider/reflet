"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { H1, Muted } from "@/components/ui/typography";
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
      <div className="container mx-auto space-y-6 px-4 py-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {["a", "b", "c", "d"].map((id) => (
            <Skeleton className="h-24" key={id} />
          ))}
        </div>
      </div>
    );
  }

  if (org === null) {
    return (
      <div className="container mx-auto px-4 py-8">
        <H1>Organization not found</H1>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div>
        <H1>Email Analytics</H1>
        <Muted>
          Monitor delivery rates, opens, and engagement for changelog
          notifications.
        </Muted>
      </div>

      <EmailAnalyticsDashboard organizationId={org._id} />
    </div>
  );
}
