import {
  DashboardMobileHeader,
  DashboardWorkspace,
  isInboxRoute,
} from "@app/(app)/dashboard/shell/dashboard-workspace";
import { AppShellContent } from "@ctrl-ui/react/ui/app-shell";
import {
  PageBody,
  PageHeader,
  PageLayout,
} from "@ctrl-ui/react/ui/page-layout";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@ctrl-ui/react/ui/sidebar";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { useParams } from "next/navigation";
import type { NavItem } from "@/features/dashboard/components/navigation/nav-group";
import {
  isSectionActive,
  orgSections,
} from "@/features/dashboard/components/navigation/org-sections";
import { SectionPanel } from "@/features/dashboard/components/section-panel";
import { InboxPanelSkeleton } from "@/features/inbox/components/list/inbox-panel-skeleton";

const FOOTER_ROWS = ["support", "feedback", "notifications"] as const;

function MenuRowSkeleton() {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton aria-hidden disabled tabIndex={-1}>
        <Skeleton className="size-4 shrink-0" />
        <Skeleton className="h-3.5 flex-1 group-data-[collapsible=icon]:hidden" />
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function MenuSkeleton({ items }: { items: NavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <MenuRowSkeleton key={item.href} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function RailSkeleton({ sections }: { sections: NavItem[] }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="items-center">
        <Skeleton className="size-8 rounded-lg" />
        <Skeleton className="size-control" />
      </SidebarHeader>
      <SidebarContent>
        <MenuSkeleton items={sections} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {FOOTER_ROWS.map((row) => (
            <MenuRowSkeleton key={row} />
          ))}
        </SidebarMenu>
        <Skeleton className="mx-auto size-8 rounded-full" />
      </SidebarFooter>
    </Sidebar>
  );
}

function PanelSkeleton({
  pathname,
  sections,
}: {
  pathname: string;
  sections: ReturnType<typeof orgSections>;
}) {
  if (isInboxRoute(pathname)) {
    return <InboxPanelSkeleton />;
  }
  const section = sections.find((candidate) =>
    isSectionActive(candidate, pathname)
  );
  if (!section?.items) {
    return null;
  }
  return (
    <SectionPanel title={section.label}>
      <SidebarContent>
        <MenuSkeleton items={section.items} />
      </SidebarContent>
    </SectionPanel>
  );
}

function PageSkeleton() {
  return (
    <PageLayout width="content">
      <PageHeader>
        <Skeleton className="h-9 w-44" />
      </PageHeader>
      <PageBody contentClassName="space-y-4">
        <Skeleton className="h-6 w-72 max-w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </PageBody>
    </PageLayout>
  );
}

export function DashboardLoading({ pathname }: { pathname: string }) {
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const sections = orgSlug ? orgSections({ isAdmin: true, slug: orgSlug }) : [];
  return (
    <>
      <RailSkeleton sections={sections} />
      <AppShellContent aria-busy="true">
        <DashboardMobileHeader>
          <Skeleton className="h-4 w-40" />
        </DashboardMobileHeader>
        <DashboardWorkspace
          panel={<PanelSkeleton pathname={pathname} sections={sections} />}
        >
          <p className="sr-only" role="status">
            Loading dashboard…
          </p>
          {isInboxRoute(pathname) ? null : <PageSkeleton />}
        </DashboardWorkspace>
      </AppShellContent>
    </>
  );
}
