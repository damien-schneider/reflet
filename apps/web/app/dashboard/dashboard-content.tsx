"use client";

import { CaretRight } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useAtom } from "jotai";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { H2, Muted } from "@/components/ui/typography";
import { CommandPalette } from "@/features/command-palette/components/command-palette";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import { OrganizationSwitcher } from "@/features/organizations/components/organization-switcher";
import { sidebarOpenAtom } from "@/store/dashboard-atoms";

const routeLabels: Record<string, string> = {
  feedback: "Feedback",
  settings: "Settings",
  tags: "Tags",
  changelog: "Changelog",
  general: "General",
  billing: "Billing",
  members: "Members",
  inbox: "Inbox",
};

function getRelevantPathSegments(pathname: string): string[] {
  const pathSegments = pathname.split("/").filter(Boolean);
  const dashboardIndex = pathSegments.indexOf("dashboard");
  return dashboardIndex >= 0
    ? pathSegments.slice(dashboardIndex + 1)
    : pathSegments;
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

  if (routeSegment === "settings") {
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

  const relevantSegments = getRelevantPathSegments(pathname);
  const breadcrumbItems = buildBreadcrumbItems(orgSlug, org, relevantSegments);

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
  const org = useQuery(
    api.organizations.getBySlug,
    orgSlug ? { slug: orgSlug } : "skip"
  );
  const ensurePersonalOrganization = useMutation(
    api.organizations_personal.ensurePersonalOrganization
  );
  const [ensureAttempted, setEnsureAttempted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);

  const hasOrganizations = !!organizations && organizations.length > 0;
  const isAdmin = org?.role === "admin" || org?.role === "owner";

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
      <CommandPalette isAdmin={isAdmin} orgSlug={orgSlug} />
      <DashboardSidebar orgSlug={orgSlug} pathname={pathname ?? ""} />
      <SidebarInset className="relative">
        <header className="absolute top-0 right-0 left-0 z-10 flex h-14 items-center gap-2 px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="bg-background/20 backdrop-blur-sm hover:bg-background/30" />
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-background/50 bg-background/20 px-4 py-1 backdrop-blur-xs">
              <DashboardBreadcrumb
                orgSlug={orgSlug}
                pathname={pathname ?? ""}
              />
            </div>
          </div>
        </header>

        <ScrollArea
          className="-mr-2 -mb-2 h-full bg-background"
          classNameViewport="pt-14"
        >
          {!orgSlug && hasOrganizations ? (
            <main className="flex h-full items-center justify-center p-6">
              <div className="max-w-md text-center">
                <H2 variant="section">Select an organization</H2>
                <Muted className="mt-2">
                  Choose an organization from the sidebar or select one below.
                </Muted>
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
                <H2 variant="section">Welcome to Reflet!</H2>
                <Muted className="mt-2">
                  Create your first organization to start collecting feedback.
                </Muted>
                <div className="mt-8">
                  <OrganizationSwitcher currentOrgSlug={undefined} />
                </div>
              </div>
            </main>
          ) : null}

          {orgSlug ? children : null}
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  );
}
