import {
  Brain,
  CaretUpDown,
  Chat,
  ChatCircle,
  Code,
  FileText,
  Gear,
  ShieldStar,
  SignOut,
  Trash,
  User,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import type * as React from "react";
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
import { authClient } from "@/lib/auth-client";
import { GoProBanner } from "./go-pro-banner";
import { MakePublicBanner } from "./make-public-banner";
import { SidebarFooterContent } from "./sidebar-footer-content";

interface DashboardSidebarProps {
  orgSlug?: string;
  pathname: string;
}

export function DashboardSidebar({ orgSlug, pathname }: DashboardSidebarProps) {
  const currentUser = useQuery(api.auth.getCurrentUser);
  const org = useQuery(
    api.organizations.getBySlug,
    orgSlug ? { slug: orgSlug } : "skip"
  );

  const adminUnreadCount = useQuery(
    api.support_conversations.getUnreadCountForAdmin,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const deletedCount = useQuery(
    api.feedback_trash.getDeletedCount,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const isAdmin = org?.role === "admin" || org?.role === "owner";

  const isSuperAdmin = useQuery(api.super_admin.isSuperAdmin);

  const subscription = useQuery(
    api.subscriptions.getStatus,
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
          href: "/dashboard/$orgSlug",
          icon: Chat,
          label: "Feedback",
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
            adminUnreadCount && adminUnreadCount > 0
              ? adminUnreadCount
              : undefined,
        },
      ]
    : [];

  const adminNavItems = orgSlug
    ? [
        {
          href: "/dashboard/$orgSlug/in-app",
          icon: Code,
          label: "In-App",
          badge: undefined,
        },
        {
          href: "/dashboard/$orgSlug/ai",
          icon: Brain,
          label: "AI",
          badge: undefined,
        },
        {
          href: "/dashboard/$orgSlug/trash",
          icon: Trash,
          label: "Trash",
          badge: deletedCount && deletedCount > 0 ? deletedCount : undefined,
        },
      ]
    : [];

  const orgNavItems = orgSlug
    ? [
        {
          href: "/dashboard/$orgSlug/settings",
          icon: Gear,
          label: "Settings",
          badge: undefined,
        },
      ]
    : [];

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

  const handleSignOut = () => {
    authClient.signOut();
    window.location.href = "/";
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        {/* User menu */}
        <SidebarList>
          <SidebarListItem>
            <DropdownList>
              <DropdownListTrigger
                render={(props: React.ComponentProps<"button">) => (
                  <SidebarListButton {...props} size="lg">
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
                  </SidebarListButton>
                )}
              />
              <DropdownListContent
                align="start"
                className="min-w-56 rounded-lg"
                side="bottom"
                sideOffset={4}
              >
                <DropdownListItem
                  render={(props) => (
                    <Link href="/dashboard/account" {...props}>
                      <User className="mr-2 size-4" />
                      <span>My Account</span>
                    </Link>
                  )}
                />
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
                <SidebarList>
                  {workspaceNavItems.map((item) => (
                    <SidebarListItem key={item.href}>
                      <SidebarListButton
                        isActive={isActive(item.href)}
                        render={(props) => (
                          <Link href={buildHref(item.href)} {...props}>
                            <item.icon className="h-4 w-4" />
                            <span className="flex-1">{item.label}</span>
                            {item.badge !== undefined && (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-olive-500 px-1.5 font-medium text-[10px] text-white">
                                {item.badge > 99 ? "99+" : item.badge}
                              </span>
                            )}
                          </Link>
                        )}
                      />
                    </SidebarListItem>
                  ))}
                </SidebarList>
              </SidebarGroupContent>
            </SidebarGroup>

            {isAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel>Admin</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarList>
                    {adminNavItems.map((item) => (
                      <SidebarListItem key={item.href}>
                        <SidebarListButton
                          isActive={isActive(item.href)}
                          render={(props) => (
                            <Link href={buildHref(item.href)} {...props}>
                              <item.icon className="h-4 w-4" />
                              <span className="flex-1">{item.label}</span>
                              {item.badge !== undefined && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-olive-500 px-1.5 font-medium text-[10px] text-white">
                                  {item.badge > 99 ? "99+" : item.badge}
                                </span>
                              )}
                            </Link>
                          )}
                        />
                      </SidebarListItem>
                    ))}
                  </SidebarList>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            <SidebarGroup>
              <SidebarGroupLabel>Organization</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarList>
                  {orgNavItems.map((item) => (
                    <SidebarListItem key={item.href}>
                      <SidebarListButton
                        isActive={isActive(item.href)}
                        render={(props) => (
                          <Link href={buildHref(item.href)} {...props}>
                            <item.icon className="h-4 w-4" />
                            <span className="flex-1">{item.label}</span>
                          </Link>
                        )}
                      />
                    </SidebarListItem>
                  ))}
                </SidebarList>
              </SidebarGroupContent>
            </SidebarGroup>
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
                    render={(props) => (
                      <Link href="/dashboard/super-admin" {...props}>
                        <ShieldStar className="h-4 w-4" />
                        <span>Super Admin</span>
                      </Link>
                    )}
                  />
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
