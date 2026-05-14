"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";

import { H2, Muted } from "@/components/ui/typography";
import { TasksLoadingSkeleton } from "@/features/autopilot/components/tasks/list/view";
import { TasksPageBody } from "@/features/autopilot/components/tasks/page/body";

export default function TasksPageClient() {
  const params = useParams();
  const orgSlug = typeof params?.orgSlug === "string" ? params.orgSlug : "";
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });
  const membership = useQuery(
    api.organizations.members.getMembership,
    org?._id ? { organizationId: org._id } : "skip"
  );
  const isAdmin = membership?.role === "admin" || membership?.role === "owner";

  if (org === undefined) {
    return <TasksLoadingSkeleton />;
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

  return (
    <TasksPageBody
      isAdmin={isAdmin}
      organizationId={org._id}
      orgSlug={orgSlug}
    />
  );
}
