"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { H1, Text } from "@/components/ui/typography";
import { IntelligenceSettings } from "@/features/intelligence/components/intelligence-settings";

export default function IntelligenceSettingsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

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
        <H1>Intelligence Settings</H1>
        <Text variant="bodySmall">
          Configure your competitive intelligence scanning frequency and data
          sources
        </Text>
      </div>

      <IntelligenceSettings organizationId={org._id} />
    </div>
  );
}
