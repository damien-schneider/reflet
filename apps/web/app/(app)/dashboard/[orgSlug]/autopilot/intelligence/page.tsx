"use client";

import { CommunityTab } from "@app/(app)/dashboard/[orgSlug]/autopilot/intelligence/_components/community-tab";
import { CompetitorsTab } from "@app/(app)/dashboard/[orgSlug]/autopilot/intelligence/_components/competitors-tab";
import { InsightsTab } from "@app/(app)/dashboard/[orgSlug]/autopilot/intelligence/_components/insights-tab";
import { GearSix, Hash, Lightbulb, Users } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { H1, Text } from "@/components/ui/typography";
import { IntelligenceSettings } from "@/features/intelligence/components/intelligence-settings";

export default function IntelligencePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const [activeTab, setActiveTab] = useState("insights");

  if (!org) {
    return (
      <div className="admin-container">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="mb-8">
        <H1>Intelligence</H1>
        <Text variant="bodySmall">
          AI-powered competitive intelligence and market insights
        </Text>
      </div>

      <Tabs onValueChange={setActiveTab} value={activeTab}>
        <TabsList>
          <TabsTrigger value="insights">
            <Lightbulb className="mr-1.5 h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="community">
            <Hash className="mr-1.5 h-4 w-4" />
            Community
          </TabsTrigger>
          <TabsTrigger value="competitors">
            <Users className="mr-1.5 h-4 w-4" />
            Competitors
          </TabsTrigger>
          <TabsTrigger value="settings">
            <GearSix className="mr-1.5 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent className="mt-6" value="insights">
          <InsightsTab organizationId={org._id} orgSlug={orgSlug} />
        </TabsContent>

        <TabsContent className="mt-6" value="community">
          <CommunityTab organizationId={org._id} />
        </TabsContent>

        <TabsContent className="mt-6" value="competitors">
          <CompetitorsTab organizationId={org._id} orgSlug={orgSlug} />
        </TabsContent>

        <TabsContent className="mt-6" value="settings">
          <IntelligenceSettings organizationId={org._id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
