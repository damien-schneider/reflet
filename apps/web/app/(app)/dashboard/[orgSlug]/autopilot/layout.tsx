"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { H2, Muted } from "@/components/ui/typography";
import { AutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { AutopilotNav } from "@/features/autopilot/components/autopilot-nav";
import { EmergencyStopButton } from "@/features/autopilot/components/emergency-stop-button";

export default function AutopilotLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, {
    slug: orgSlug,
  });

  const currentMember = useQuery(
    api.organizations.members.getCurrentMember,
    org ? { organizationId: org._id } : "skip"
  );

  const config = useQuery(
    api.autopilot.queries.getConfig,
    org?._id ? { organizationId: org._id } : "skip"
  );

  if (org === undefined) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-12 pb-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
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
      <div className="mx-auto max-w-6xl px-4 pt-12 pb-8">
        <div className="flex flex-col md:flex-row md:gap-8">
          <div className="hidden w-56 shrink-0 md:block">
            <div className="space-y-2">
              {Array.from({ length: 7 }, (_, i) => (
                <Skeleton
                  className="h-10 w-full rounded-lg"
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
  const baseUrl = `/dashboard/${orgSlug}/autopilot`;

  return (
    <AutopilotContext value={{ organizationId: org._id, isAdmin, orgSlug }}>
      <div className="mx-auto max-w-6xl px-4 pt-12 pb-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-2xl">Autopilot</h1>
            <p className="text-muted-foreground text-sm">
              AI-powered product team for your codebase
            </p>
          </div>
          <div className="flex items-center gap-3">
            {config?.enabled && <EmergencyStopButton />}
            <div className="flex items-center gap-2">
              <div
                className={
                  config?.enabled
                    ? "size-2 rounded-full bg-green-500"
                    : "size-2 rounded-full bg-muted-foreground/30"
                }
              />
              <span className="text-muted-foreground text-sm">
                {config?.enabled ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:gap-8">
          <ScrollArea className="-mx-4 mb-6 md:hidden" direction="horizontal">
            <div className="px-4">
              <AutopilotNav baseUrl={baseUrl} variant="tabs" />
            </div>
          </ScrollArea>

          <div className="sticky top-12 hidden w-56 shrink-0 self-start md:block">
            <AutopilotNav baseUrl={baseUrl} variant="sidebar" />
          </div>

          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </AutopilotContext>
  );
}
