"use client";

import DashboardError from "@app/(app)/dashboard/error";
import { AppShellContent, AppShellHeader } from "@ctrl-ui/react/ui/app-shell";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
} from "@ctrl-ui/react/ui/sidebar";
import { catchError, type ErrorInfo } from "next/error";
import Link from "next/link";
import { OrgNavigationMenu } from "@/features/dashboard/components/navigation/org-navigation";
import { orgSections } from "@/features/dashboard/components/navigation/org-sections";

function DashboardErrorShell(
  { pathname }: { pathname: string },
  { error, retry }: ErrorInfo
) {
  const segment = pathname.split("/")[2];
  const orgSlug = segment && segment !== "account" ? segment : undefined;

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link className="truncate px-2 py-3 font-semibold" href="/dashboard">
            Reflet
          </Link>
        </SidebarHeader>
        <SidebarContent>
          {orgSlug && (
            <OrgNavigationMenu
              pathname={pathname}
              sections={orgSections({ isAdmin: false, slug: orgSlug })}
            />
          )}
        </SidebarContent>
      </Sidebar>
      <AppShellContent>
        <AppShellHeader className="lg:hidden">
          <SidebarTrigger label="Open navigation" />
          <span className="truncate text-muted-foreground">Dashboard</span>
        </AppShellHeader>
        <DashboardError error={error} retry={retry} />
      </AppShellContent>
    </>
  );
}

export const DashboardShellBoundary = catchError(DashboardErrorShell);

export const DashboardPageBoundary = catchError(
  (_props: object, { error, retry }: ErrorInfo) => (
    <DashboardError error={error} retry={retry} />
  )
);
