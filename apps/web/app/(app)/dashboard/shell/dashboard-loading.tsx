import { AppShellContent, AppShellHeader } from "@ctrl-ui/react/ui/app-shell";
import {
  PageBody,
  PageHeader,
  PageLayout,
} from "@ctrl-ui/react/ui/page-layout";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@ctrl-ui/react/ui/sidebar";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";

const navigationRows = [
  "feedback",
  "changelog",
  "inbox",
  "surveys",
  "intelligence",
  "status",
] as const;

export function DashboardLoading() {
  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-full" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navigationRows.map((row) => (
              <SidebarMenuItem key={row}>
                <SidebarMenuButton aria-hidden disabled tabIndex={-1}>
                  <Skeleton className="size-4 shrink-0" />
                  <Skeleton className="h-4 flex-1 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <AppShellContent aria-busy="true">
        <AppShellHeader>
          <SidebarTrigger />
          <Skeleton className="h-4 w-40" />
        </AppShellHeader>
        <PageLayout width="wide">
          <PageHeader>
            <Skeleton className="h-9 w-48" />
          </PageHeader>
          <PageBody contentClassName="space-y-4">
            <p className="sr-only" role="status">
              Loading dashboard…
            </p>
            <Skeleton className="h-8 w-64 max-w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </PageBody>
        </PageLayout>
      </AppShellContent>
    </>
  );
}
