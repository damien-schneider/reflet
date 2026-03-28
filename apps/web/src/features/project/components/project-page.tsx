"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AiMcpSection } from "./ai-mcp-section";
import { BillingSection } from "./billing-section";
import { GitHubSection } from "./github-section";
import { MembersSection } from "./members-section";
import { OrganizationSection } from "./organization-section";
import { ProjectNav, type ProjectTab } from "./project-nav";

interface ProjectPageProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function ProjectPage({ organizationId, orgSlug }: ProjectPageProps) {
  const [activeTab, setActiveTab] = useState<ProjectTab>("github");

  const currentMember = useQuery(api.organizations.members.getCurrentMember, {
    organizationId,
  });

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  if (currentMember === undefined) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-12 pb-8">
        <div className="flex flex-col md:flex-row md:gap-8">
          <div className="hidden w-56 shrink-0 md:block">
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton
                  className="h-12 w-full rounded-lg"
                  key={`skeleton-${String(i)}`}
                />
              ))}
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pt-12 pb-8">
      <div className="flex flex-col md:flex-row md:gap-8">
        {/* Mobile: horizontal scroll nav */}
        <ScrollArea className="-mx-4 mb-6 md:hidden" direction="horizontal">
          <nav className="flex gap-1 px-4">
            <ProjectNav activeTab={activeTab} onTabChange={setActiveTab} />
          </nav>
        </ScrollArea>

        {/* Desktop: sticky vertical nav */}
        <div className="sticky top-12 hidden w-56 shrink-0 self-start md:block">
          <ProjectNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Content area */}
        <div className="min-w-0 flex-1">
          <ProjectTabContent
            activeTab={activeTab}
            isAdmin={isAdmin}
            organizationId={organizationId}
            orgSlug={orgSlug}
          />
        </div>
      </div>
    </div>
  );
}

function ProjectTabContent({
  activeTab,
  isAdmin,
  organizationId,
  orgSlug,
}: {
  activeTab: ProjectTab;
  isAdmin: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
}) {
  switch (activeTab) {
    case "github":
      return (
        <GitHubSection
          isAdmin={isAdmin}
          organizationId={organizationId}
          orgSlug={orgSlug}
        />
      );
    case "ai-mcp":
      return <AiMcpSection organizationId={organizationId} />;
    case "general":
      return (
        <OrganizationSection
          isAdmin={isAdmin}
          organizationId={organizationId}
          orgSlug={orgSlug}
        />
      );
    case "members":
      return (
        <MembersSection isAdmin={isAdmin} organizationId={organizationId} />
      );
    case "billing":
      return (
        <BillingSection organizationId={organizationId} orgSlug={orgSlug} />
      );
    default:
      return null;
  }
}
