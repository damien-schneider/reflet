"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { H1 } from "@/components/ui/typography";
import { DuplicateReviewPanel } from "@/features/feedback/components/duplicate-review-panel";

export default function DuplicateReviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  if (org === undefined) {
    return (
      <div className="container mx-auto space-y-6 px-4 py-8">
        <Skeleton className="h-10 w-48" />
        {["a", "b", "c"].map((id) => (
          <Skeleton className="h-32" key={id} />
        ))}
      </div>
    );
  }

  if (org === null) {
    return (
      <div className="container mx-auto px-4 py-8">
        <H1>Organization not found</H1>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <DuplicateReviewPanel organizationId={org._id} />
    </div>
  );
}
