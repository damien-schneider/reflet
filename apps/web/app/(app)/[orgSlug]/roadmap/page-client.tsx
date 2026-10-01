"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";
import { FeedbackBoard } from "@/features/feedback/components/feedback-board";
import {
  LoadingState,
  PrivateOrgMessage,
} from "@/features/feedback/components/feedback-board/board-states";

export default function PublicRoadmapPageClient({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const organization = useQuery(api.organizations.queries.getBySlug, {
    slug: orgSlug,
  });
  if (organization === undefined) {
    return <LoadingState />;
  }
  if (!organization) {
    return <PrivateOrgMessage />;
  }
  return (
    <FeedbackBoard
      defaultView="roadmap"
      isAdmin={organization.role === "admin" || organization.role === "owner"}
      isMember={organization.role !== null}
      isPublic={organization.isPublic}
      organizationId={organization._id}
      orgSlug={orgSlug}
      primaryColor={organization.primaryColor}
    />
  );
}
