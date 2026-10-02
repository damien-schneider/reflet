"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";
import { FeedbackBoard } from "@/features/feedback/components/feedback-board";
import { LoadingState } from "@/features/feedback/components/feedback-board/board-states";

export default function OrgDashboard({
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

  if (org === undefined) {
    return <LoadingState />;
  }

  if (org === null) {
    return <OrgNotFound />;
  }

  const primaryColor = org.primaryColor;
  const defaultView = org.feedbackSettings?.defaultView ?? "feed";

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
