"use client";

import { Kbd, KbdGroup } from "@ctrl-ui/react/ui/kbd";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@ctrl-ui/react/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useAtom } from "jotai";
import Link from "next/link";
import {
  RedirectType,
  redirect,
  useParams,
  usePathname,
} from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { CommandPalette } from "@/features/command-palette/components/command-palette";
import { useModifierKeyLabel } from "@/features/command-palette/hooks/use-modifier-key-label";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";
import { PushNotificationPrompt } from "@/features/dashboard/components/push-notification-prompt";
import { sidebarOpenAtom } from "@/store/dashboard-atoms";
import { OrgPicker, OrgPickerSkeleton, WelcomeState } from "./dashboard-states";
import { computeDashboardNavigation } from "./use-dashboard-navigation";

const routeLabels: Record<string, string> = {
  account: "Account",
  agents: "Agents & CLI",
  "api-keys": "API keys",
  billing: "Billing",
  changelog: "Changelog",
  domains: "Domains",
  feedback: "Feedback",
  general: "Organization",
  github: "GitHub",
  "in-app": "In-app",
  inbox: "Inbox",
  intelligence: "Intelligence",
  members: "Members",
  milestones: "Milestones",
  project: "Project",
  roadmap: "Roadmap",
  setup: "Setup",
  status: "Status",
  "super-admin": "Super admin",
  surveys: "Surveys",
  tags: "Tags",
  trash: "Trash",
};

const NON_ORG_ROUTES = ["super-admin", "account"] as const;

function getRelevantPathSegments(pathname: string): string[] {
  const pathSegments = pathname.split("/").filter(Boolean);
  const dashboardIndex = pathSegments.indexOf("dashboard");
  return dashboardIndex >= 0
    ? pathSegments.slice(dashboardIndex + 1)
    : pathSegments;
}

function buildBreadcrumbItemsForProject(
  orgSlug: string,
  relevantSegments: string[]
): Array<{ label: string; href: string; isActive: boolean }> {
  const items: Array<{ label: string; href: string; isActive: boolean }> = [
    {
      href: `/dashboard/${orgSlug}/project`,
      isActive: relevantSegments.length === 2,
      label: "Project",
    },
  ];

  if (relevantSegments.length > 2) {
    const projectSegment = relevantSegments[2];
    items.push({
      href: `/dashboard/${orgSlug}/project/${projectSegment}`,
      isActive: true,
      label: routeLabels[projectSegment] ?? projectSegment,
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
      href: "/dashboard",
      isActive: relevantSegments.length === 0,
      label: "Dashboard",
    },
  ];

  const firstSegment = relevantSegments[0];
  if (firstSegment && NON_ORG_ROUTES.some((route) => route === firstSegment)) {
    items.push({
      href: `/dashboard/${firstSegment}`,
      isActive: true,
      label: routeLabels[firstSegment] ?? firstSegment,
    });
    return items;
  }

  if (relevantSegments.length === 0 || !orgSlug) {
    return items;
  }

  items.push({
    href: `/dashboard/${orgSlug}`,
    isActive: relevantSegments.length === 1,
    label: org?.name ?? orgSlug,
  });

  if (relevantSegments.length <= 1) {
    return items;
  }

  const routeSegment = relevantSegments[1];
  const routeLabel = routeLabels[routeSegment] ?? routeSegment;

  if (routeSegment === "project") {
    items.push(...buildBreadcrumbItemsForProject(orgSlug, relevantSegments));
  } else {
    items.push({
      href: `/dashboard/${orgSlug}/${routeSegment}`,
      isActive: true,
      label: routeLabel,
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
    api.organizations.queries.getBySlug,
    orgSlug ? { slug: orgSlug } : "skip"
  );

  const relevantSegments = getRelevantPathSegments(pathname);
  const breadcrumbItems = buildBreadcrumbItems(orgSlug, org, relevantSegments);

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {breadcrumbItems.flatMap((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const elements: React.ReactNode[] = [];

          if (index > 0) {
            elements.push(
              <BreadcrumbSeparator
                className="hidden sm:inline-flex"
                key={`separator-${item.href}`}
              />
            );
          }

          elements.push(
            <BreadcrumbItem
              className={isLast ? "min-w-0" : "hidden min-w-0 sm:inline-flex"}
              key={item.href}
            >
              {isLast ? (
                <BreadcrumbPage className="truncate" title={item.label}>
                  {item.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  className="max-w-48 truncate"
                  href={item.href}
                  render={(props) => <Link href={item.href} {...props} />}
                  title={item.label}
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
  const rawOrgSlug = params?.orgSlug;
  const orgSlug = typeof rawOrgSlug === "string" ? rawOrgSlug : undefined;
  const pathname = usePathname();
  const organizations = useQuery(api.organizations.queries.list);
  const org = useQuery(
    api.organizations.queries.getBySlug,
    orgSlug ? { slug: orgSlug } : "skip"
  );
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);
  const modifierKey = useModifierKeyLabel();

  const isAdmin = org?.role === "admin" || org?.role === "owner";

  const relevantSegments = getRelevantPathSegments(pathname ?? "");
  const isNonOrgRoute = NON_ORG_ROUTES.some(
    (route) => route === relevantSegments[0]
  );

  const { redirectTo, orgNotAccessible, hasOrganizations } =
    computeDashboardNavigation({ org, organizations, orgSlug });

  if (redirectTo && !isNonOrgRoute) {
    redirect(redirectTo, RedirectType.replace);
  }

  const renderOrgRoute = () => {
    if (orgSlug) {
      return orgNotAccessible ? (
        <OrgNotFound />
      ) : (
        <>
          <PushNotificationPrompt />
          {children}
        </>
      );
    }
    if (organizations === undefined || redirectTo) {
      return <OrgPickerSkeleton />;
    }
    return hasOrganizations ? (
      <OrgPicker organizations={organizations} />
    ) : (
      <WelcomeState />
    );
  };

  return (
    <SidebarProvider onOpenChange={setSidebarOpen} open={sidebarOpen}>
      <CommandPalette isAdmin={isAdmin} orgSlug={orgSlug} />
      <DashboardSidebar orgSlug={orgSlug} pathname={pathname ?? ""} />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-border/60 border-b bg-background/80 px-4 backdrop-blur-md">
          <Tooltip>
            <TooltipTrigger render={<SidebarTrigger />} />
            <TooltipContent>
              <span className="flex items-center gap-2">
                Toggle sidebar
                <KbdGroup>
                  <Kbd>{modifierKey}</Kbd>
                  <Kbd>B</Kbd>
                </KbdGroup>
              </span>
            </TooltipContent>
          </Tooltip>
          <div className="flex min-w-0 flex-1 items-center">
            <DashboardBreadcrumb orgSlug={orgSlug} pathname={pathname ?? ""} />
          </div>
          <ThemeToggle className="shrink-0" />
        </header>

        {isNonOrgRoute ? children : renderOrgRoute()}
      </SidebarInset>
    </SidebarProvider>
  );
}
