"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";
import type { BoardView as BoardViewType } from "@/features/feedback/components/board-view-toggle";
import { FeedbackBoard } from "@/features/feedback/components/feedback-board";
import { LoadingState } from "@/features/feedback/components/feedback-board/board-states";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/branding";

export default function PublicOrgPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  const membership = useQuery(
    api.organizations.members.getMembership,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const isMember = !!membership;
  const isAdmin = membership?.role === "admin" || membership?.role === "owner";

  if (org === undefined || (org && membership === undefined)) {
    return <LoadingState />;
  }

  if (!org) {
    return null;
  }

  const primaryColor = org.primaryColor ?? DEFAULT_PRIMARY_COLOR;
  const rawDefaultView = org.feedbackSettings?.defaultView;
  const defaultView: BoardViewType =
    rawDefaultView === "roadmap" ||
    rawDefaultView === "feed" ||
    rawDefaultView === "milestones"
      ? rawDefaultView
      : "feed";

  return (
    <FeedbackBoard
      defaultView={defaultView}
      isAdmin={isAdmin}
      isMember={isMember}
      isPublic={org.isPublic ?? false}
      organizationId={org._id}
      orgSlug={orgSlug}
      primaryColor={primaryColor}
    />
  );
}
