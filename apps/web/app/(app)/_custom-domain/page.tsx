"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";

import { Skeleton } from "@/components/ui/skeleton";
import type { BoardView as BoardViewType } from "@/features/feedback/components/board-view-toggle";
import { FeedbackBoard } from "@/features/feedback/components/feedback-board";
import { useCustomDomainOrg } from "@/features/public-org/hooks/use-custom-domain-org";

export default function CustomDomainPage() {
  const org = useCustomDomainOrg();

  const membership = useQuery(
    api.organizations.members.getMembership,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const isMember = !!membership;
  const isAdmin = membership?.role === "admin" || membership?.role === "owner";

  if (org === undefined) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <Skeleton className="mx-auto h-10 w-64" />
          <Skeleton className="mx-auto mt-2 h-5 w-96" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton className="h-32 w-full" key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!org) {
    return null;
  }

  const primaryColor = org.primaryColor ?? "#3b82f6";
  const rawDefaultView = org.feedbackSettings?.defaultView;
  const defaultView: BoardViewType =
    rawDefaultView === "roadmap" ||
    rawDefaultView === "feed" ||
    rawDefaultView === "milestones"
      ? rawDefaultView
      : "feed";
  const milestoneViewStyle = org.feedbackSettings?.milestoneStyle ?? "track";

  return (
    <FeedbackBoard
      defaultView={defaultView}
      isAdmin={isAdmin}
      isMember={isMember}
      isPublic={org.isPublic ?? false}
      milestoneViewStyle={milestoneViewStyle}
      organizationId={org._id}
      orgSlug={org.slug}
      primaryColor={primaryColor}
    />
  );
}
