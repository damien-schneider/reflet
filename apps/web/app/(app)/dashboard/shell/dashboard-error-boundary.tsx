"use client";

import DashboardError from "@app/(app)/dashboard/error";
import { AppShellContent, AppShellHeader } from "@ctrl-ui/react/ui/app-shell";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from "@ctrl-ui/react/ui/sidebar";
import { catchError, type ErrorInfo } from "next/error";
import Link from "next/link";
import { OrgNavigationMenu } from "@/features/dashboard/components/navigation/org-navigation";

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
              organization={{ isAdmin: false, slug: orgSlug }}
              pathname={pathname}
            />
          )}
        </SidebarContent>
        <SidebarRail resizable />
      </Sidebar>
      <AppShellContent>
        <AppShellHeader>
          <SidebarTrigger />
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
