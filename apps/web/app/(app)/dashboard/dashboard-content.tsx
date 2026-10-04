"use client";

import { DashboardPageBoundary } from "@app/(app)/dashboard/shell/dashboard-error-boundary";
import {
  DashboardMobileHeader,
  DashboardWorkspace,
  isSurveyDetailRoute,
} from "@app/(app)/dashboard/shell/dashboard-workspace";
import { AppShellContent } from "@ctrl-ui/react/ui/app-shell";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CommandPalette } from "@/features/command-palette/components/command-palette";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import { useOrgSections } from "@/features/dashboard/components/navigation/org-navigation";
import { isSectionActive } from "@/features/dashboard/components/navigation/org-sections";
import { OrgNotFound } from "@/features/dashboard/components/org-not-found";
import { SectionNavPanel } from "@/features/dashboard/components/section-panel";
import { FeedbackSectionPanel } from "@/features/feedback/components/feedback-section-panel";
import { useActiveOrganization } from "@/features/organizations/hooks/use-active-organization";
import { useMemberOrganization } from "@/features/organizations/hooks/use-member-organization";
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
  surveys: "Surveys",
  tags: "Tags",
  trash: "Trash",
};

const ACCOUNT_ROUTE = "account";

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
  if (firstSegment === ACCOUNT_ROUTE) {
    items.push({
      href: `/dashboard/${ACCOUNT_ROUTE}`,
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
  const org = useMemberOrganization(orgSlug);

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

function useReplaceRoute(target: string | null) {
  const router = useRouter();
  useEffect(() => {
    if (target) {
      router.replace(target);
    }
  }, [router, target]);
}

function useDashboardNavigation() {
  const params = useParams();
  const rawOrgSlug = params?.orgSlug;
  const orgSlug = typeof rawOrgSlug === "string" ? rawOrgSlug : undefined;
  const pathname = usePathname() ?? "";
  const { activeOrganization, organizations } = useActiveOrganization(orgSlug);
  const org = useQuery(
    api.organizations.queries.getBySlug,
    orgSlug ? { slug: orgSlug } : "skip"
  );

  const isAdmin =
    activeOrganization?.role === "admin" ||
    activeOrganization?.role === "owner";
  const activeOrgSlug = activeOrganization?.slug;

  const relevantSegments = getRelevantPathSegments(pathname);
  const isNonOrgRoute = relevantSegments[0] === ACCOUNT_ROUTE;

  const { redirectTo, orgNotAccessible, hasOrganizations } =
    computeDashboardNavigation({ activeOrgSlug, org, organizations, orgSlug });

  useReplaceRoute(redirectTo && !isNonOrgRoute ? redirectTo : null);

  return {
    activeOrgSlug,
    hasOrganizations,
    isAdmin,
    isNonOrgRoute,
    organizations,
    orgNotAccessible,
    orgSlug,
    pathname,
    redirectTo,
  };
}

function DashboardHeader({
  orgSlug,
  pathname,
}: {
  orgSlug?: string;
  pathname: string;
}) {
  return (
    <DashboardMobileHeader>
      <DashboardBreadcrumb orgSlug={orgSlug} pathname={pathname} />
    </DashboardMobileHeader>
  );
}

interface OrganizationPageState {
  children: React.ReactNode;
  hasOrganizations: boolean;
  organizations:
    | FunctionReturnType<typeof api.organizations.queries.list>
    | undefined;
  orgNotAccessible: boolean;
  orgSlug: string | undefined;
  redirectTo: string | null;
}

function renderOrganizationPage({
  children,
  hasOrganizations,
  organizations,
  orgNotAccessible,
  orgSlug,
  redirectTo,
}: OrganizationPageState) {
  if (orgSlug) {
    return orgNotAccessible ? <OrgNotFound /> : children;
  }
  if (organizations === undefined || redirectTo) {
    return <OrgPickerSkeleton />;
  }
  return hasOrganizations ? (
    <OrgPicker organizations={organizations} />
  ) : (
    <WelcomeState />
  );
}

function ActiveSectionPanel({
  isAdmin,
  orgSlug,
  pathname,
}: {
  isAdmin: boolean;
  orgSlug: string;
  pathname: string;
}) {
  const org = useMemberOrganization(orgSlug);
  const sections = useOrgSections({ id: org?._id, isAdmin, slug: orgSlug });
  const section = sections.find((candidate) =>
    isSectionActive(candidate, pathname)
  );
  if (!section?.items || isSurveyDetailRoute(pathname)) {
    return null;
  }
  if (section.href === `/dashboard/${orgSlug}`) {
    return (
      <FeedbackSectionPanel
        organizationId={org?._id}
        pathname={pathname}
        section={{ ...section, items: section.items }}
      />
    );
  }
  return (
    <SectionNavPanel
      groups={[{ items: section.items }]}
      pathname={pathname}
      title={section.label}
    />
  );
}

export function DashboardContent({ children }: { children: React.ReactNode }) {
  const navigation = useDashboardNavigation();
  const content = navigation.isNonOrgRoute
    ? children
    : renderOrganizationPage({ children, ...navigation });

  return (
    <>
      <CommandPalette
        isAdmin={navigation.isAdmin}
        orgSlug={navigation.activeOrgSlug}
      />
      <DashboardSidebar
        orgSlug={navigation.activeOrgSlug}
        pathname={navigation.pathname}
      />
      <AppShellContent>
        <DashboardHeader
          orgSlug={navigation.orgSlug}
          pathname={navigation.pathname}
        />
        <DashboardWorkspace
          panel={
            navigation.activeOrgSlug ? (
              <ActiveSectionPanel
                isAdmin={navigation.isAdmin}
                orgSlug={navigation.activeOrgSlug}
                pathname={navigation.pathname}
              />
            ) : null
          }
        >
          <DashboardPageBoundary>{content}</DashboardPageBoundary>
        </DashboardWorkspace>
      </AppShellContent>
    </>
  );
}
