"use client";

import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";
import { FeedbackBoard } from "@/features/feedback/components/feedback-board";

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
    return (
      <div aria-busy="true" className="container mx-auto px-4 py-8">
        <span className="sr-only">Loading feedback…</span>
        <div className="mb-8 flex flex-col items-center gap-2">
          <Skeleton className="h-10 w-64 max-w-full" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <div className="space-y-4">
          {["a", "b", "c"].map((id) => (
            <Skeleton className="h-32 w-full" key={id} />
          ))}
        </div>
      </div>
    );
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
