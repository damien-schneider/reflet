import {
  ArrowUpRight,
  Bell,
  Brain,
  CaretUpDown,
  Chat,
  ChatCircle,
  Check,
  CircleHalf,
  Code,
  CreditCard,
  FileText,
  Gear,
  Globe,
  SignOut,
  Spinner,
  User,
  Users,
} from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import type * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownList,
  DropdownListContent,
  DropdownListItem,
  DropdownListTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsPopover } from "@/components/ui/notifications-popover";
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
import {
  type Theme,
  themeIcons,
  themeLabels,
  themes as themeOptions,
  useThemeToggle,
} from "@/components/ui/theme-toggle";
import { CommandPaletteTrigger } from "@/features/command-palette/components/command-palette-trigger";
import { OrganizationSwitcher } from "@/features/organizations/components/organization-switcher";
import { authClient } from "@/lib/auth-client";

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
  const updateOrg = useMutation(api.organizations.update);
  const [isMakingPublic, setIsMakingPublic] = useState(false);

  const adminUnreadCount = useQuery(
    api.support_conversations.getUnreadCountForAdmin,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const isAdmin = org?.role === "admin" || org?.role === "owner";
  const { mounted: themeMounted, setTheme, currentTheme } = useThemeToggle();

  const buildPath = (path: string) =>
    orgSlug ? path.replace("$orgSlug", orgSlug) : "";

  const buildHref = (path: string) => {
    if (!orgSlug) {
      return "#";
    }
    return path.replace("$orgSlug", orgSlug);
  };

  const mainNavItems = orgSlug
    ? [
        {
          href: "/dashboard/$orgSlug",
          icon: Chat,
          label: "Feedback",
          badge: undefined,
        },
        {
          href: "/dashboard/$orgSlug/settings",
          icon: Gear,
          label: "Settings",
          badge: undefined,
        },
      ]
    : [];

  const adminNavItems = orgSlug
    ? [
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
        {
          href: "/dashboard/$orgSlug/widgets",
          icon: Code,
          label: "Widgets",
          badge: undefined,
        },
        {
          href: "/dashboard/$orgSlug/ai",
          icon: Brain,
          label: "AI",
          badge: undefined,
        },
        {
          href: "/dashboard/$orgSlug/settings/members",
          icon: Users,
          label: "Members",
          badge: undefined,
        },
        {
          href: "/dashboard/$orgSlug/settings/billing",
          icon: CreditCard,
          label: "Billing",
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
    const allNavItems = [...mainNavItems, ...adminNavItems];
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
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          location.reload();
        },
      },
    });
  };

  const handleMakePublic = async () => {
    if (!(org?._id && isAdmin)) {
      return;
    }

    setIsMakingPublic(true);
    try {
      await updateOrg({
        id: org._id as Id<"organizations">,
        isPublic: true,
      });
    } finally {
      setIsMakingPublic(false);
    }
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
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarList>
                  {mainNavItems.map((item) => (
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
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="px-2 py-4 text-muted-foreground text-sm">
                Select an organization to get started.
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {orgSlug && org && !org.isPublic && isAdmin && (
        <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
          <div className="space-y-2 rounded-lg border border-olive-600/20 bg-olive-600/5 p-3">
            <div className="flex items-center gap-2">
              <Globe className="size-4 shrink-0 text-olive-600" />
              <h3 className="font-medium text-olive-600 text-sm">
                Rendre l&apos;organisation publique
              </h3>
            </div>
            <p className="text-muted-foreground text-xs">
              Partagez votre roadmap et votre changelog avec le monde entier.
            </p>
            <Button
              className="h-7 w-full text-xs"
              disabled={isMakingPublic}
              onClick={handleMakePublic}
              size="sm"
              variant="default"
            >
              {isMakingPublic ? (
                <>
                  <Spinner className="mr-2 h-3 w-3 animate-spin" />
                  En cours...
                </>
              ) : (
                "Rendre publique"
              )}
            </Button>
          </div>
        </div>
      )}

      <SidebarFooter>
        <SidebarList>
          <SidebarListItem>
            <NotificationsPopover
              render={(props: React.ComponentProps<"button">) => (
                <SidebarListButton {...props}>
                  <Bell className="h-4 w-4" />
                  <span className="flex-1">Notifications</span>
                </SidebarListButton>
              )}
            />
          </SidebarListItem>
          <SidebarListItem>
            <DropdownList>
              <DropdownListTrigger
                render={(props: React.ComponentProps<"button">) => (
                  <SidebarListButton {...props} disabled={!themeMounted}>
                    <CircleHalf className="h-4 w-4" />
                    <span className="flex-1">Theme</span>
                  </SidebarListButton>
                )}
              />
              <DropdownListContent
                align="start"
                className="min-w-36"
                side="top"
                sideOffset={4}
              >
                {themeOptions.map((t: Theme) => {
                  const Icon = themeIcons[t];
                  return (
                    <DropdownListItem key={t} onClick={() => setTheme(t)}>
                      <Icon className="mr-2 h-4 w-4" />
                      <span className="flex-1">{themeLabels[t]}</span>
                      {currentTheme === t && (
                        <Check className="ml-auto h-4 w-4" />
                      )}
                    </DropdownListItem>
                  );
                })}
              </DropdownListContent>
            </DropdownList>
          </SidebarListItem>
          {orgSlug && org?.isPublic && (
            <SidebarListItem>
              <SidebarListButton
                render={(props) => (
                  <Link
                    href={`/${orgSlug}`}
                    rel="noopener"
                    target="_blank"
                    {...props}
                  >
                    <Globe className="h-4 w-4" />
                    <span className="flex-1">Go to public page</span>
                    <ArrowUpRight className="ml-auto size-4" />
                  </Link>
                )}
              />
            </SidebarListItem>
          )}
        </SidebarList>
      </SidebarFooter>
    </Sidebar>
  );
}
