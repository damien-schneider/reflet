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
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";
import { IntelligenceSettings } from "@/features/intelligence/components/intelligence-settings";
import { CommunityTab } from "./community-tab";
import { CompetitorsTab } from "./competitors-tab";
import { InsightsTab } from "./insights-tab";

const TAB_TITLES = {
  community: "Community",
  competitors: "Competitors",
  insights: "Insights",
  settings: "Intelligence settings",
} as const;

type IntelligenceTab = keyof typeof TAB_TITLES;

const isIntelligenceTab = (
  value: string | undefined
): value is IntelligenceTab => value !== undefined && value in TAB_TITLES;

export default function IntelligencePage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { orgSlug } = use(params);
  const { tab } = use(searchParams);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const config = useQuery(
    api.intelligence.config.get,
    org ? { organizationId: org._id } : "skip"
  );
  const activeTab = isIntelligenceTab(tab) ? tab : "insights";

  if (org === null) {
    return <OrgNotFound />;
  }
  if (org === undefined) {
    return (
      <PageLayout width="content">
        <PageHeader>
          <Skeleton className="h-9 w-44" />
        </PageHeader>
        <PageBody>
          <Skeleton className="h-64 w-full rounded-lg" />
        </PageBody>
      </PageLayout>
    );
  }
  if (config === undefined) {
    return (
      <PageLayout width="content">
        <PageHeader>
          <PageTitle>Intelligence</PageTitle>
        </PageHeader>
        <PageBody contentClassName="space-y-8">
          <Skeleton className="h-64 w-full" />
        </PageBody>
      </PageLayout>
    );
  }

  if (config === null) {
    return (
      <PageLayout width="content">
        <PageHeader>
          <PageTitle>Intelligence</PageTitle>
        </PageHeader>
        <PageBody>
          <IntelligenceSettings organizationId={org._id} />
        </PageBody>
      </PageLayout>
    );
  }

  return (
    <PageLayout width="content">
      <PageHeader>
        <PageTitle>{TAB_TITLES[activeTab]}</PageTitle>
      </PageHeader>
      <PageBody>
        {
          {
            community: <CommunityTab organizationId={org._id} />,
            competitors: (
              <CompetitorsTab organizationId={org._id} orgSlug={orgSlug} />
            ),
            insights: (
              <InsightsTab organizationId={org._id} orgSlug={orgSlug} />
            ),
            settings: <IntelligenceSettings organizationId={org._id} />,
          }[activeTab]
        }
      </PageBody>
    </PageLayout>
  );
}
