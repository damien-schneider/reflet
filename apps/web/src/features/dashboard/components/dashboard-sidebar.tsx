import {
  ArrowUpRight,
  CaretUpDown,
  Chat,
  CreditCard,
  FileText,
  Gear,
  Globe,
  SignOut,
  Spinner,
  Tag,
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
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
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

  const isAdmin = org?.role === "admin" || org?.role === "owner";

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
          href: "/dashboard/$orgSlug/boards",
          icon: Chat,
          label: "Boards",
        },
        {
          href: "/dashboard/$orgSlug/settings",
          icon: Gear,
          label: "Gear",
        },
      ]
    : [];

  const adminNavItems = orgSlug
    ? [
        {
          href: "/dashboard/$orgSlug/tags",
          icon: Tag,
          label: "Tags",
        },
        {
          href: "/dashboard/$orgSlug/changelog",
          icon: FileText,
          label: "Changelog",
        },
        {
          href: "/dashboard/$orgSlug/settings/members",
          icon: Users,
          label: "Members",
        },
        {
          href: "/dashboard/$orgSlug/settings/billing",
          icon: CreditCard,
          label: "Billing",
        },
      ]
    : [];

  const isActive = (path: string) => {
    const fullPath = buildPath(path);
    return fullPath ? pathname.startsWith(fullPath) : false;
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
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <OrganizationSwitcher currentOrgSlug={orgSlug} />
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
                            <span>{item.label}</span>
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
                            <span>{item.label}</span>
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

      {orgSlug && org ? (
        <div className="px-2 pb-2 group-data-[collapsible=icon]:hidden">
          {org.isPublic && (
            <Link
              className="group/linkPublic"
              href={`/${orgSlug}`}
              rel="noopener"
              target="_blank"
            >
              <Button className="w-full justify-start" variant="ghost">
                <Globe className="mr-2 size-4" />
                <span>Voir la page publique</span>
                <ArrowUpRight className="ml-auto size-4 translate-y-2 opacity-0 transition group-hover/linkPublic:translate-y-0 group-hover/linkPublic:opacity-100" />
              </Button>
            </Link>
          )}
          {!org.isPublic && isAdmin && (
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
          )}
        </div>
      ) : null}

      <SidebarFooter>
        <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />

        {/* Quick actions row */}
        <div className="flex items-center justify-end gap-1 px-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <NotificationsPopover />
          <ThemeToggle />
        </div>

        {/* User menu */}
        <SidebarList>
          <SidebarListItem>
            <DropdownList>
              <DropdownListTrigger
                render={(props: React.ComponentProps<"button">) => (
                  <SidebarListButton {...props} size="lg">
                    <div className="flex size-8 items-center justify-center rounded-none bg-muted text-muted-foreground">
                      <User className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                      <span className="truncate font-medium">
                        {currentUser?.name ?? "Account"}
                      </span>
                      <span className="truncate text-muted-foreground text-xs">
                        {currentUser?.email ?? ""}
                      </span>
                    </div>
                    <CaretUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                  </SidebarListButton>
                )}
              />
              <DropdownListContent
                align="end"
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="top"
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
      </SidebarFooter>
    </Sidebar>
  );
}
