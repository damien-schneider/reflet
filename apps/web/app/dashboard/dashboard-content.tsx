"use client";

import { CaretRight } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useAtom } from "jotai";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { OrganizationSwitcher } from "@/components/organization-switcher";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import { sidebarOpenAtom } from "@/store/dashboard-atoms";

const routeLabels: Record<string, string> = {
  boards: "Boards",
  settings: "Settings",
  tags: "Tags",
  changelog: "Changelog",
  general: "General",
  billing: "Billing",
  members: "Members",
};

function getRelevantPathSegments(pathname: string): string[] {
  const pathSegments = pathname.split("/").filter(Boolean);
  const dashboardIndex = pathSegments.indexOf("dashboard");
  return dashboardIndex >= 0
    ? pathSegments.slice(dashboardIndex + 1)
    : pathSegments;
}

function buildBreadcrumbItemsForBoards(
  orgSlug: string,
  boardSlug: string | undefined,
  board: { name: string } | undefined,
  relevantSegments: string[]
): Array<{ label: string; href: string; isActive: boolean }> {
  const items: Array<{ label: string; href: string; isActive: boolean }> = [
    {
      label: "Boards",
      href: `/dashboard/${orgSlug}/boards`,
      isActive: relevantSegments.length === 2,
    },
  ];

  if (boardSlug && board && relevantSegments.length > 2) {
    items.push({
      label: board.name,
      href: `/${orgSlug}/boards/${boardSlug}`,
      isActive: relevantSegments.length === 3,
    });
  }

  return items;
}

function buildBreadcrumbItemsForSettings(
  orgSlug: string,
  relevantSegments: string[]
): Array<{ label: string; href: string; isActive: boolean }> {
  const items: Array<{ label: string; href: string; isActive: boolean }> = [
    {
      label: "Settings",
      href: `/dashboard/${orgSlug}/settings`,
      isActive: relevantSegments.length === 2,
    },
  ];

  if (relevantSegments.length > 2) {
    const settingsSegment = relevantSegments[2];
    const settingsLabel = routeLabels[settingsSegment] ?? settingsSegment;
    items.push({
      label: settingsLabel,
      href: `/dashboard/${orgSlug}/settings/${settingsSegment}`,
      isActive: true,
    });
  }

  return items;
}

function buildBreadcrumbItems(
  orgSlug: string | undefined,
  org: { name: string } | null | undefined,
  boardSlug: string | undefined,
  board: { name: string } | null | undefined,
  relevantSegments: string[]
): Array<{ label: string; href: string; isActive: boolean }> {
  const items: Array<{ label: string; href: string; isActive: boolean }> = [
    {
      label: "Dashboard",
      href: "/dashboard",
      isActive: relevantSegments.length === 0,
    },
  ];

  if (relevantSegments.length === 0 || !orgSlug) {
    return items;
  }

  items.push({
    label: org?.name ?? orgSlug,
    href: `/dashboard/${orgSlug}`,
    isActive: relevantSegments.length === 1,
  });

  if (relevantSegments.length <= 1) {
    return items;
  }

  const routeSegment = relevantSegments[1];
  const routeLabel = routeLabels[routeSegment] ?? routeSegment;

  if (routeSegment === "boards" && boardSlug && board) {
    items.push(
      ...buildBreadcrumbItemsForBoards(
        orgSlug,
        boardSlug,
        board,
        relevantSegments
      )
    );
  } else if (routeSegment === "settings") {
    items.push(...buildBreadcrumbItemsForSettings(orgSlug, relevantSegments));
  } else {
    items.push({
      label: routeLabel,
      href: `/dashboard/${orgSlug}/${routeSegment}`,
      isActive: true,
    });
  }

  return items;
}

function DashboardBreadcrumb({
  orgSlug,
  pathname,
}: {
  orgSlug?: string;
  pathname: string;
}) {
  const org = useQuery(
    api.organizations.getBySlug,
    orgSlug ? { slug: orgSlug } : "skip"
  );
  const params = useParams();
  const boardSlug = params?.boardSlug as string | undefined;
  const board = useQuery(
    api.boards.getBySlug,
    org?._id && boardSlug
      ? {
          organizationId: org._id as Id<"organizations">,
          slug: boardSlug,
        }
      : "skip"
  );

  const relevantSegments = getRelevantPathSegments(pathname);
  const breadcrumbItems = buildBreadcrumbItems(
    orgSlug,
    org,
    boardSlug,
    board ?? undefined,
    relevantSegments
  );

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbItems.flatMap((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const elements: React.ReactNode[] = [];

          if (index > 0) {
            elements.push(
              <BreadcrumbSeparator key={`separator-${item.href}`} />
            );
          }

          elements.push(
            <BreadcrumbItem key={item.href}>
              {isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  href={item.href}
                  render={(props) => <Link href={item.href} {...props} />}
                >
                  {item.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          );

          return elements;
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function DashboardContent({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const orgSlug = params?.orgSlug as string | undefined;
  const router = useRouter();
  const pathname = usePathname();
  const organizations = useQuery(api.organizations.list);
  const ensurePersonalOrganization = useMutation(
    api.organizations_personal.ensurePersonalOrganization
  );
  const [ensureAttempted, setEnsureAttempted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);

  const hasOrganizations = !!organizations && organizations.length > 0;

  useEffect(() => {
    if (organizations?.length === 0 && !ensureAttempted) {
      setEnsureAttempted(true);
      ensurePersonalOrganization({}).catch(() => {
        // Silent fail - user can create manually
      });
    }
  }, [organizations, ensureAttempted, ensurePersonalOrganization]);

  useEffect(() => {
    if (!orgSlug && organizations?.length === 1) {
      const org = organizations[0];
      if (org) {
        router.replace(`/dashboard/${org.slug}`);
      }
    }
  }, [router, orgSlug, organizations]);

  return (
    <SidebarProvider onOpenChange={setSidebarOpen} open={sidebarOpen}>
      <DashboardSidebar orgSlug={orgSlug} pathname={pathname ?? ""} />
      <SidebarInset className="flex max-h-svh flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="flex flex-1 items-center gap-2">
            <DashboardBreadcrumb orgSlug={orgSlug} pathname={pathname ?? ""} />
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          {!orgSlug && hasOrganizations ? (
            <main className="flex h-full items-center justify-center p-6">
              <div className="max-w-md text-center">
                <h2 className="font-bold text-2xl">Select an organization</h2>
                <p className="mt-2 text-muted-foreground">
                  Choose an organization from the sidebar or select one below.
                </p>
                <div className="mt-8 flex flex-col gap-3">
                  {organizations.map((org) =>
                    org ? (
                      <Link href={`/dashboard/${org.slug}`} key={org._id}>
                        <Button
                          className="w-full justify-between rounded-lg px-4"
                          variant="outline"
                        >
                          {org.name}
                          <CaretRight className="h-4 w-4 opacity-50" />
                        </Button>
                      </Link>
                    ) : null
                  )}
                </div>
              </div>
            </main>
          ) : null}

          {!orgSlug && organizations?.length === 0 ? (
            <main className="flex h-full items-center justify-center p-6">
              <div className="max-w-md text-center">
                <h2 className="font-bold text-2xl">Welcome to Reflet!</h2>
                <p className="mt-2 text-muted-foreground">
                  Create your first organization to start collecting feedback.
                </p>
                <div className="mt-8">
                  <OrganizationSwitcher currentOrgSlug={undefined} />
                </div>
              </div>
            </main>
          ) : null}

          {orgSlug ? children : null}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
