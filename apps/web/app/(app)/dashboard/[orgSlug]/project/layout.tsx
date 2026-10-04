"use client";

import {
  PageBody,
  PageHeader,
  PageLayout,
} from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";
import { ProjectContext } from "@/features/project/components/project-context";

function ProjectLoading() {
  return (
    <PageLayout aria-busy="true" width="content">
      <PageHeader>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-80 max-w-full" />
      </PageHeader>
      <PageBody contentClassName="flex flex-col gap-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </PageBody>
    </PageLayout>
  );
}

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  const currentMember = useQuery(
    api.organizations.members.getCurrentMember,
    org ? { organizationId: org._id } : "skip"
  );

  if (org === undefined) {
    return <ProjectLoading />;
  }

  if (org === null) {
    return <OrgNotFound />;
  }

  if (currentMember === undefined) {
    return <ProjectLoading />;
  }

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  return (
    <ProjectContext value={{ isAdmin, organizationId: org._id, orgSlug }}>
      {children}
    </ProjectContext>
  );
}
