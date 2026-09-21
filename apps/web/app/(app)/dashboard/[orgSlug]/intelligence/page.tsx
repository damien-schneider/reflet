"use client";

import {
  PageBody,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ctrl-ui/react/ui/tabs";
import { GearSix, Hash, Lightbulb, Users } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use, useState } from "react";
import { IntelligenceSettings } from "@/features/intelligence/components/intelligence-settings";
import { CommunityTab } from "./community-tab";
import { CompetitorsTab } from "./competitors-tab";
import { InsightsTab } from "./insights-tab";

export default function IntelligencePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const config = useQuery(
    api.intelligence.config.get,
    org ? { organizationId: org._id } : "skip"
  );
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const activeTab = selectedTab ?? "insights";

  if (!org) {
    return (
      <PageLayout scroll="page" width="content">
        <PageBody>
          <Skeleton className="h-8 w-48" />
        </PageBody>
      </PageLayout>
    );
  }
  if (config === undefined) {
    return (
      <PageLayout scroll="page" width="content">
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
      <PageLayout scroll="page" width="content">
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
    <PageLayout scroll="page" width="content">
      <PageHeader>
        <PageTitle>Intelligence</PageTitle>
      </PageHeader>
      <PageBody>
        <Tabs onValueChange={setSelectedTab} value={activeTab}>
          <TabsList>
            <TabsTab value="insights">
              <Lightbulb className="mr-1.5 h-4 w-4" />
              Insights
            </TabsTab>
            <TabsTab value="community">
              <Hash className="mr-1.5 h-4 w-4" />
              Community
            </TabsTab>
            <TabsTab value="competitors">
              <Users className="mr-1.5 h-4 w-4" />
              Competitors
            </TabsTab>
            <TabsTab value="settings">
              <GearSix className="mr-1.5 h-4 w-4" />
              Settings
            </TabsTab>
          </TabsList>

          <TabsPanel className="mt-6" value="insights">
            <InsightsTab organizationId={org._id} orgSlug={orgSlug} />
          </TabsPanel>

          <TabsPanel className="mt-6" value="community">
            <CommunityTab organizationId={org._id} />
          </TabsPanel>

          <TabsPanel className="mt-6" value="competitors">
            <CompetitorsTab organizationId={org._id} orgSlug={orgSlug} />
          </TabsPanel>

          <TabsPanel className="mt-6" value="settings">
            <IntelligenceSettings organizationId={org._id} />
          </TabsPanel>
        </Tabs>
      </PageBody>
    </PageLayout>
  );
}
