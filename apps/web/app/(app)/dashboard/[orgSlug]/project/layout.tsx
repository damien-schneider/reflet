"use client";

import { PageBody, PageLayout } from "@ctrl-ui/react/ui/page-layout";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";
import { H2, Muted } from "@/components/ui/typography";
import { ProjectContext } from "@/features/project/components/project-context";

function ProjectShell({
  children,
  contentClassName,
}: {
  children: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <PageLayout scroll="page" width="wide">
      <PageBody contentClassName={contentClassName}>{children}</PageBody>
    </PageLayout>
  );
}

function OrganizationNotFound() {
  return (
    <ProjectShell contentClassName="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <H2 variant="card">Organization not found</H2>
        <Muted className="mt-2">
          The organization you&apos;re looking for doesn&apos;t exist.
        </Muted>
      </div>
    </ProjectShell>
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
    return (
      <ProjectShell contentClassName="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </ProjectShell>
    );
  }

  if (!org) {
    return <OrganizationNotFound />;
  }

  if (currentMember === undefined) {
    return (
      <ProjectShell contentClassName="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </ProjectShell>
    );
  }

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";

  return (
    <ProjectContext value={{ isAdmin, organizationId: org._id, orgSlug }}>
      <ProjectShell>{children}</ProjectShell>
    </ProjectContext>
  );
}
