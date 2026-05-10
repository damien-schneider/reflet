import {
  CaretUpDown,
  Chat,
  ChatCircle,
  ClipboardText,
  Code,
  Cube,
  FileText,
  Heartbeat,
  ListChecks,
  Robot,
  ShieldStar,
  SignOut,
  Trash,
  User,
  UsersThree,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import posthog from "posthog-js";
import type { ComponentType } from "react";
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarList,
  SidebarListButton,
  SidebarListItem,
} from "@/components/ui/sidebar";
import { CommandPaletteTrigger } from "@/features/command-palette/components/command-palette-trigger";
import { OrganizationSwitcher } from "@/features/organizations/components/organization-switcher";
import { capture } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { GoProBanner } from "./go-pro-banner";
import { MakePublicBanner } from "./make-public-banner";
import { SidebarFooterContent } from "./sidebar-footer-content";

interface DashboardSidebarProps {
  orgSlug?: string;
  pathname: string;
}

interface DashboardNavItem {
  badge?: number;
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}

interface DashboardNavListProps {
  buildHref: (path: string) => string;
  isActive: (path: string) => boolean;
  items: DashboardNavItem[];
}

interface IsDashboardNavItemActiveOptions {
  itemPath: string;
  navItemPaths: string[];
  pathname: string;
}

const isDashboardNavItemActive = ({
  itemPath,
  navItemPaths,
  pathname,
}: IsDashboardNavItemActiveOptions) => {
  if (!itemPath) {
    return false;
  }

  if (pathname === itemPath) {
    return true;
  }

  if (!pathname.startsWith(`${itemPath}/`)) {
    return false;
  }

  const hasMoreSpecificMatch = navItemPaths.some(
    (path) =>
      path.length > itemPath.length &&
      (pathname === path || pathname.startsWith(`${path}/`))
  );

  return !hasMoreSpecificMatch;
};

const getWorkspaceNavItems = ({
  adminUnreadCount,
  orgSlug,
}: {
  adminUnreadCount?: number;
  orgSlug?: string;
}): DashboardNavItem[] => {
  if (!orgSlug) {
    return [];
  }

  return [
    {
      href: "/dashboard/$orgSlug/project",
      icon: Cube,
      label: "Project",
      badge: undefined,
    },
    {
      href: "/dashboard/$orgSlug",
      icon: Chat,
      label: "Feedback",
      badge: undefined,
    },
    {
      href: "/dashboard/$orgSlug/tasks",
      icon: ListChecks,
      label: "Tasks",
      badge: undefined,
    },
    {
      href: "/dashboard/$orgSlug/changelog",
      icon: FileText,
      label: "Changelog",
      badge: undefined,
    },
    {
      href: "/dashboard/$orgSlug/inbox",
      icon: ChatCircle,
      label: "Inbox",
      badge:
        adminUnreadCount && adminUnreadCount > 0 ? adminUnreadCount : undefined,
    },
  ];
};

const getAdminNavItems = ({
  deletedCount,
  orgSlug,
}: {
  deletedCount?: number;
  orgSlug?: string;
}): DashboardNavItem[] => {
  if (!orgSlug) {
    return [];
  }

  return [
    {
      href: "/dashboard/$orgSlug/community",
      icon: UsersThree,
      label: "Community",
      badge: undefined,
    },
    {
      href: "/dashboard/$orgSlug/status",
      icon: Heartbeat,
      label: "Status",
      badge: undefined,
    },
    {
      href: "/dashboard/$orgSlug/in-app",
      icon: Code,
      label: "In-App",
      badge: undefined,
    },
    {
      href: "/dashboard/$orgSlug/surveys",
      icon: ClipboardText,
      label: "Surveys",
      badge: undefined,
    },
    {
      href: "/dashboard/$orgSlug/autopilot",
      icon: Robot,
      label: "Autopilot",
      badge: undefined,
    },
    {
      href: "/dashboard/$orgSlug/trash",
      icon: Trash,
      label: "Trash",
      badge: deletedCount && deletedCount > 0 ? deletedCount : undefined,
    },
  ];
};

function DashboardNavList({
  buildHref,
  isActive,
  items,
}: DashboardNavListProps) {
  return (
    <SidebarList>
      {items.map((item) => (
        <SidebarListItem key={item.href}>
          <SidebarListButton
            isActive={isActive(item.href)}
            render={<Link href={buildHref(item.href)} />}
          >
            <item.icon className="size-4" />
            <span className="flex-1">{item.label}</span>
            {item.badge !== undefined && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-olive-500 px-1.5 font-medium text-[10px] text-white">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </SidebarListButton>
        </SidebarListItem>
      ))}
    </SidebarList>
  );
}

export function DashboardSidebar({ orgSlug, pathname }: DashboardSidebarProps) {
  const currentUser = useQuery(api.auth.queries.getCurrentUser);
  const org = useQuery(
    api.organizations.queries.getBySlug,
    orgSlug ? { slug: orgSlug } : "skip"
  );

  const adminUnreadCount = useQuery(
    api.support.conversation_queries.getUnreadCountForAdmin,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const deletedCount = useQuery(
    api.feedback.trash.getDeletedCount,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const isAdmin = org?.role === "admin" || org?.role === "owner";

  const isSuperAdmin = useQuery(
    api.organizations.super_admin_queries.isSuperAdmin
  );

  const subscription = useQuery(
    api.billing.queries.getStatus,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const buildPath = (path: string) =>
    orgSlug ? path.replace("$orgSlug", orgSlug) : "";

  const buildHref = (path: string) => {
    if (!orgSlug) {
      return "#";
    }
    return path.replace("$orgSlug", orgSlug);
  };

  const workspaceNavItems = getWorkspaceNavItems({
    adminUnreadCount,
    orgSlug,
  });

  const adminNavItems = getAdminNavItems({
    deletedCount,
    orgSlug,
  });

  const allNavItemPaths = [...workspaceNavItems, ...adminNavItems].map((item) =>
    buildPath(item.href)
  );

  const isActive = (path: string) => {
    return isDashboardNavItemActive({
      itemPath: buildPath(path),
      navItemPaths: allNavItemPaths,
      pathname,
    });
  };

  const handleSignOut = () => {
    capture("sign_out");
    posthog.reset();
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* User menu */}
        <SidebarList>
          <SidebarListItem>
            <DropdownList>
              <DropdownListTrigger render={<SidebarListButton size="lg" />}>
                <div className="flex size-8 min-w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <User className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0">
                  <span className="truncate font-medium">
                    {currentUser?.name ?? "Account"}
                  </span>
                  <span className="truncate text-muted-foreground text-xs">
                    {currentUser?.email ?? ""}
                  </span>
                </div>
                <CaretUpDown className="ml-auto size-4 transition-opacity duration-200 ease-in-out group-data-[collapsible=icon]:opacity-0" />
              </DropdownListTrigger>
              <DropdownListContent
                align="start"
                className="min-w-56 rounded-lg"
                side="bottom"
                sideOffset={4}
              >
                <DropdownListItem render={<Link href="/dashboard/account" />}>
                  <User className="mr-2 size-4" />
                  <span>My Account</span>
                </DropdownListItem>
                <DropdownListItem onClick={handleSignOut}>
                  <SignOut className="mr-2 size-4" />
                  <span>Sign out</span>
                </DropdownListItem>
              </DropdownListContent>
            </DropdownList>
          </SidebarListItem>
        </SidebarList>

        <OrganizationSwitcher currentOrgSlug={orgSlug} />
        <CommandPaletteTrigger />
      </SidebarHeader>

      <SidebarContent>
        {orgSlug ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <DashboardNavList
                  buildHref={buildHref}
                  isActive={isActive}
                  items={workspaceNavItems}
                />
              </SidebarGroupContent>
            </SidebarGroup>

            {isAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel>Admin</SidebarGroupLabel>
                <SidebarGroupContent>
                  <DashboardNavList
                    buildHref={buildHref}
                    isActive={isActive}
                    items={adminNavItems}
                  />
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="px-2 py-4 text-muted-foreground text-sm group-data-[collapsible=icon]:hidden">
                Select an organization to get started.
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarList>
                <SidebarListItem>
                  <SidebarListButton
                    isActive={
                      pathname === "/dashboard/super-admin" ||
                      pathname.startsWith("/dashboard/super-admin/")
                    }
                    render={<Link href="/dashboard/super-admin" />}
                  >
                    <ShieldStar className="size-4" />
                    <span>Super Admin</span>
                  </SidebarListButton>
                </SidebarListItem>
              </SidebarList>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {orgSlug && org && !org.isPublic && isAdmin && (
        <MakePublicBanner orgId={org._id} />
      )}

      {orgSlug && isAdmin && subscription?.tier === "free" && (
        <GoProBanner orgSlug={orgSlug} />
      )}

      <SidebarFooter>
        <SidebarList>
          <SidebarFooterContent isPublic={org?.isPublic} orgSlug={orgSlug} />
        </SidebarList>
      </SidebarFooter>
    </Sidebar>
  );
}
