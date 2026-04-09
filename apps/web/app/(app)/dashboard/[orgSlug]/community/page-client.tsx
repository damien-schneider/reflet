"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { H2, Muted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import { CompetitorsTab } from "./competitors-tab";
import { ContentTab } from "./content-tab";

const TABS = [
  { id: "content", label: "Content" },
  { id: "competitors", label: "Competitors" },
] as const;

export default function CommunityPageClient({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  const [activeTab, setActiveTab] = useState<string>("content");

  if (org === undefined) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-64" />
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton
              className="h-16 w-full rounded-lg"
              key={`s-${String(i)}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <H2 variant="card">Organization not found</H2>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist.
          </Muted>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <H2 variant="card">Community</H2>

      <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
        {TABS.map((tab) => (
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-sm transition-colors",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "content" && <ContentTab organizationId={org._id} />}
      {activeTab === "competitors" && (
        <CompetitorsTab organizationId={org._id} />
      )}
    </div>
  );
}
