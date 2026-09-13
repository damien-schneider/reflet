import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@ctrl-ui/react/ui/sidebar";
import {
  Binoculars,
  CaretUpDown,
  Chat,
  ChatCircle,
  ClipboardText,
  Code,
  Cube,
  FileText,
  Heartbeat,
  ShieldStar,
  SignOut,
  Trash,
  User,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import posthog from "posthog-js";
import type * as React from "react";
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

export function DashboardSidebar({ orgSlug, pathname }: DashboardSidebarProps) {
  const currentUser = useQuery(api.auth.queries.getCurrentUser);
  const org = useQuery(
    api.organizations.queries.getBySlug,
    orgSlug ? { slug: orgSlug } : "skip"
  );

  const adminUnreadCount = useQuery(
    api.support.admin.getUnreadCount,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const deletedCount = useQuery(
    api.feedback.trash.getDeletedCount,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const isAdmin = org?.role === "admin" || org?.role === "owner";

  const isSuperAdmin = useQuery(api.organizations.super_admin.isSuperAdmin);

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

  const workspaceNavItems = orgSlug
    ? [
        {
          badge: undefined,
          href: "/dashboard/$orgSlug/project",
          icon: Cube,
          label: "Project",
        },
        {
          badge: undefined,
          href: "/dashboard/$orgSlug",
          icon: Chat,
          label: "Feedback",
        },
        {
          badge: undefined,
          href: "/dashboard/$orgSlug/changelog",
          icon: FileText,
          label: "Changelog",
        },
        {
          badge:
            adminUnreadCount && adminUnreadCount > 0
              ? adminUnreadCount
              : undefined,
          href: "/dashboard/$orgSlug/inbox",
          icon: ChatCircle,
          label: "Inbox",
        },
      ]
    : [];

  const adminNavItems = orgSlug
    ? [
        {
          badge: undefined,
          href: "/dashboard/$orgSlug/status",
          icon: Heartbeat,
          label: "Status",
        },
        {
          badge: undefined,
          href: "/dashboard/$orgSlug/in-app",
          icon: Code,
          label: "In-app",
        },
        {
          badge: undefined,
          href: "/dashboard/$orgSlug/surveys",
          icon: ClipboardText,
          label: "Surveys",
        },
        {
          badge: undefined,
          href: "/dashboard/$orgSlug/intelligence",
          icon: Binoculars,
          label: "Intelligence",
        },
        {
          badge: deletedCount && deletedCount > 0 ? deletedCount : undefined,
          href: "/dashboard/$orgSlug/trash",
          icon: Trash,
          label: "Trash",
        },
      ]
    : [];

  const orgNavItems: typeof adminNavItems = [];

  const isActive = (path: string) => {
    const fullPath = buildPath(path);
    if (!fullPath) {
      return false;
    }

    if (pathname === fullPath) {
      return true;
    }

    if (!pathname.startsWith(`${fullPath}/`)) {
      return false;
    }

    // Don't highlight if a more specific nav item also matches the current path
    const allNavItems = [
      ...workspaceNavItems,
      ...adminNavItems,
      ...orgNavItems,
    ];
    const hasMoreSpecificMatch = allNavItems.some((item) => {
      const itemPath = buildPath(item.href);
      return (
        itemPath.length > fullPath.length &&
        (pathname === itemPath || pathname.startsWith(`${itemPath}/`))
      );
    });

    return !hasMoreSpecificMatch;
  };

  // navigating before signOut resolves can abort the request and keep the session
  const handleSignOut = async () => {
    capture("sign_out");
    posthog.reset();
    await authClient.signOut();
    window.location.href = "/";
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* User menu */}
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={(props: React.ComponentProps<"button">) => (
                  <SidebarMenuButton {...props} size="lg">
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
                  </SidebarMenuButton>
                )}
              />
              <DropdownMenuContent
                align="start"
                className="min-w-56 rounded-lg"
                side="bottom"
                sideOffset={4}
              >
                <DropdownMenuItem
                  render={(props) => (
                    <Link href="/dashboard/account" {...props}>
                      <User className="mr-2 size-4" />
                      <span>My Account</span>
                    </Link>
                  )}
                />
                <DropdownMenuItem onClick={handleSignOut}>
                  <SignOut className="mr-2 size-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>

        <OrganizationSwitcher currentOrgSlug={orgSlug} />
        <CommandPaletteTrigger />
      </SidebarHeader>

      <SidebarContent>
        {orgSlug ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {workspaceNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive(item.href)}
                        render={<Link href={buildHref(item.href)} />}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge !== undefined && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-olive-500 px-1.5 font-medium text-[10px] text-white">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel>Admin</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {adminNavItems.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={isActive(item.href)}
                          render={<Link href={buildHref(item.href)} />}
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="flex-1">{item.label}</span>
                          {item.badge !== undefined && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-olive-500 px-1.5 font-medium text-[10px] text-white">
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
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
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={
                      pathname === "/dashboard/super-admin" ||
                      pathname.startsWith("/dashboard/super-admin/")
                    }
                    render={<Link href="/dashboard/super-admin" />}
                  >
                    <ShieldStar className="h-4 w-4" />
                    <span>Super Admin</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
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
        <SidebarMenu>
          <SidebarFooterContent isPublic={org?.isPublic} orgSlug={orgSlug} />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
