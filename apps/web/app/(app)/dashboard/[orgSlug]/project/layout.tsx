"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { H2, Muted } from "@/components/ui/typography";
import { ProjectContext } from "@/features/project/components/project-context";
import { ProjectNav } from "@/features/project/components/project-nav";

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

  if (currentMember === undefined) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-12 pb-8">
        <div className="flex flex-col md:flex-row md:gap-8">
          <div className="hidden w-56 shrink-0 md:block">
            <div className="space-y-2">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton
                  className="h-12 w-full rounded-lg"
                  key={`skeleton-${String(i)}`}
                />
              ))}
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const isAdmin =
    currentMember?.role === "admin" || currentMember?.role === "owner";
  const baseUrl = `/dashboard/${orgSlug}/project`;

  return (
    <ProjectContext value={{ organizationId: org._id, isAdmin, orgSlug }}>
      <div className="mx-auto max-w-5xl px-4 pt-12 pb-8">
        <div className="flex flex-col md:flex-row md:gap-8">
          {/* Mobile: horizontal scroll tabs */}
          <ScrollArea className="-mx-4 mb-6 md:hidden" direction="horizontal">
            <div className="px-4">
              <ProjectNav baseUrl={baseUrl} variant="tabs" />
            </div>
          </ScrollArea>

          {/* Desktop: sticky vertical nav */}
          <div className="sticky top-12 hidden w-56 shrink-0 self-start md:block">
            <ProjectNav baseUrl={baseUrl} />
          </div>

          {/* Content area */}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </ProjectContext>
  );
}
