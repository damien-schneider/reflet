"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { use } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { PublicFeedbackDetailContent } from "@/features/feedback/components/public-feedback-detail/public-feedback-detail-content";
import { useCustomDomainOrg } from "@/features/public-org/hooks/use-custom-domain-org";

export default function CustomDomainFeedbackDetailPage({
  params,
}: {
  params: Promise<{ feedbackSlug: string }>;
}) {
  const { feedbackSlug } = use(params);
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
        <Skeleton className="mx-auto h-10 w-64" />
        <Skeleton className="mx-auto mt-4 h-64 w-full max-w-3xl" />
      </div>
    );
  }

  if (!org) {
    return null;
  }

  const primaryColor = org.primaryColor ?? "#3b82f6";

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <PublicFeedbackDetailContent
        feedbackId={feedbackSlug as Id<"feedback">}
        isAdmin={isAdmin}
        isMember={isMember}
        organizationId={org._id}
        primaryColor={primaryColor}
      />
    </div>
  );
}
