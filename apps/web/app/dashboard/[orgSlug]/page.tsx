"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { use } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { H2, Muted } from "@/components/ui/typography";
import type { BoardView as BoardViewType } from "@/features/feedback/components/board-view-toggle";
import { FeedbackBoard } from "@/features/feedback/components/feedback-board";

export default function OrgDashboard({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });

  // Check if user is a member
  const membership = useQuery(
    api.members.getMembership,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );
  const isMember = !!membership;
  const isAdmin = membership?.role === "admin" || membership?.role === "owner";

  // Loading state
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
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <H2 variant="card">Organization not found</H2>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access.
          </Muted>
        </div>
      </div>
    );
  }

  /** When undefined, FeedbackBoard uses theme primary (olive brand) */
  const primaryColor = org.primaryColor;
  const defaultView =
    (org.feedbackSettings?.defaultView as BoardViewType) ?? "feed";

  return (
    <FeedbackBoard
      defaultView={defaultView}
      isAdmin={isAdmin}
      isMember={isMember}
      isPublic={org.isPublic ?? false}
      organizationId={org._id as Id<"organizations">}
      orgSlug={orgSlug}
      primaryColor={primaryColor}
    />
  );
}
