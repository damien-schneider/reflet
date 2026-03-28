"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { H2, Muted } from "@/components/ui/typography";
import { ProjectPage } from "@/features/project/components/project-page";

export default function ProjectRoutePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  if (org === undefined) {
    return (
      <div className="admin-container space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
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

  return <ProjectPage organizationId={org._id} orgSlug={orgSlug} />;
}
