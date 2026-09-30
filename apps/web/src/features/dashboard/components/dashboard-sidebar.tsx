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
  useSidebar,
} from "@ctrl-ui/react/ui/sidebar";
import {
  Binoculars,
  CaretUpDown,
  Chat,
  ChatCircle,
  ClipboardText,
  Code,
  FileText,
  Heartbeat,
  type Icon,
  ShieldStar,
  SignOut,
  Trash,
  User,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import Link from "next/link";
import posthog from "posthog-js";
import type * as React from "react";
import { CommandPaletteTrigger } from "@/features/command-palette/components/command-palette-trigger";
import { OrganizationSwitcher } from "@/features/organizations/components/organization-switcher";
import { ProjectNav } from "@/features/project/components/project-nav";
import { capture } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { GoProBanner } from "./go-pro-banner";
import { MakePublicBanner } from "./make-public-banner";
import { NavBadge } from "./nav-badge";
import { SidebarFooterContent } from "./sidebar-footer-content";

interface DashboardSidebarProps {
  orgSlug?: string;
  pathname: string;
}

interface NavItem {
  badge?: { count: number; tone: "attention" | "neutral"; label: string };
  href: string;
  icon: Icon;
  label: string;
}

function isPathActive(pathname: string, href: string, allHrefs: string[]) {
  if (pathname === href) {
    return true;
  }
  if (!pathname.startsWith(`${href}/`)) {
    return false;
  }
  return !allHrefs.some(
    (other) =>
      other.length > href.length &&
      (pathname === other || pathname.startsWith(`${other}/`))
  );
}

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const name = item.badge
    ? `${item.label}, ${item.badge.count} ${item.badge.label}`
    : item.label;
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        aria-current={isActive ? "page" : undefined}
        aria-label={item.badge ? name : undefined}
        isActive={isActive}
        render={
          <Link href={item.href} onNavigate={() => setOpenMobile(false)} />
        }
        tooltip={name}
      >
        <item.icon aria-hidden="true" />
        <span className="flex-1">{item.label}</span>
        {item.badge ? (
          <NavBadge count={item.badge.count} tone={item.badge.tone} />
        ) : null}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function AccountMenu() {
  const currentUser = useQuery(api.auth.queries.getCurrentUser);

  const handleSignOut = async () => {
    capture("sign_out");
    posthog.reset();
    await authClient.signOut();
    window.location.href = "/";
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={(props: React.ComponentProps<"button">) => (
              <SidebarMenuButton
                {...props}
                size="lg"
                tooltip={currentUser?.name ?? "Account"}
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 min-w-8 items-center justify-center rounded-md bg-muted text-muted-foreground"
                >
                  <User className="size-4" />
                </span>
                <span className="grid flex-1 text-start text-sm leading-tight group-data-[collapsible=icon]:sr-only">
                  <span className="truncate font-medium">
                    {currentUser?.name ?? "Account"}
                  </span>
                  {currentUser?.email ? (
                    <span className="truncate text-muted-foreground text-xs">
                      {currentUser.email}
                    </span>
                  ) : null}
                </span>
                <CaretUpDown
                  aria-hidden="true"
                  className="ml-auto group-data-[collapsible=icon]:hidden"
                />
              </SidebarMenuButton>
            )}
          />
          <DropdownMenuContent
            align="start"
            className="min-w-56"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuItem
              render={(props) => (
                <Link href="/dashboard/account" {...props}>
                  <User aria-hidden="true" className="size-4" />
                  <span>Account settings</span>
                </Link>
              )}
            />
            <DropdownMenuItem onClick={handleSignOut}>
              <SignOut aria-hidden="true" className="size-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function NavGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>{children}</SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

interface OrgNavProps {
  isAdmin: boolean;
  organizationId: Id<"organizations"> | undefined;
  orgSlug: string;
  pathname: string;
}

function buildAdminNavItems(base: string, deleted: number | undefined) {
  const items: NavItem[] = [
    { href: `${base}/status`, icon: Heartbeat, label: "Status" },
    { href: `${base}/in-app`, icon: Code, label: "In-app" },
    { href: `${base}/surveys`, icon: ClipboardText, label: "Surveys" },
    { href: `${base}/intelligence`, icon: Binoculars, label: "Intelligence" },
    {
      badge: deleted
        ? { count: deleted, label: "in trash", tone: "neutral" }
        : undefined,
      href: `${base}/trash`,
      icon: Trash,
      label: "Trash",
    },
  ];
  return items;
}

function OrgNav({ isAdmin, organizationId, orgSlug, pathname }: OrgNavProps) {
  const orgQueryArgs = organizationId ? { organizationId } : "skip";
  const adminUnreadCount = useQuery(
    api.support.admin.getUnreadCount,
    orgQueryArgs
  );
  const deletedCount = useQuery(
    api.feedback.trash.getDeletedCount,
    orgQueryArgs
  );

  const base = `/dashboard/${orgSlug}`;
  const unread = adminUnreadCount || undefined;
  const projectHref = `${base}/project`;

  const inboxNavItem: NavItem = {
    badge: unread
      ? { count: unread, label: "unread", tone: "attention" }
      : undefined,
    href: `${base}/inbox`,
    icon: ChatCircle,
    label: "Inbox",
  };

  const workspaceNavItems: NavItem[] = [
    { href: base, icon: Chat, label: "Feedback" },
    { href: `${base}/changelog`, icon: FileText, label: "Changelog" },
    ...(isAdmin ? [inboxNavItem] : []),
  ];
  const adminNavItems = buildAdminNavItems(base, deletedCount || undefined);

  const allHrefs = [
    projectHref,
    ...workspaceNavItems.map((item) => item.href),
    ...adminNavItems.map((item) => item.href),
  ];
  const isActive = (href: string) => isPathActive(pathname, href, allHrefs);

  return (
    <>
      <NavGroup label="Workspace">
        <ProjectNav
          baseUrl={projectHref}
          key={`${projectHref}:${isActive(projectHref)}`}
        />
        <NavLinks isActive={isActive} items={workspaceNavItems} />
      </NavGroup>

      {isAdmin ? (
        <NavGroup label="Admin">
          <NavLinks isActive={isActive} items={adminNavItems} />
        </NavGroup>
      ) : null}
    </>
  );
}

function NavLinks({
  isActive,
  items,
}: {
  isActive: (href: string) => boolean;
  items: NavItem[];
}) {
  return items.map((item) => (
    <NavLink isActive={isActive(item.href)} item={item} key={item.href} />
  ));
}

function PlatformNav({ pathname }: { pathname: string }) {
  const isSuperAdmin = useQuery(api.organizations.super_admin.isSuperAdmin);
  if (!isSuperAdmin) {
    return null;
  }
  return (
    <NavGroup label="Platform">
      <NavLink
        isActive={isPathActive(pathname, "/dashboard/super-admin", [])}
        item={{
          href: "/dashboard/super-admin",
          icon: ShieldStar,
          label: "Super admin",
        }}
      />
    </NavGroup>
  );
}

function AdminBanners({
  isPublic,
  organizationId,
  orgSlug,
}: {
  isPublic: boolean | undefined;
  organizationId: Id<"organizations">;
  orgSlug: string;
}) {
  const subscription = useQuery(api.billing.queries.getStatus, {
    organizationId,
  });
  return (
    <>
      {isPublic ? null : <MakePublicBanner orgId={organizationId} />}
      {subscription?.tier === "free" ? <GoProBanner orgSlug={orgSlug} /> : null}
    </>
  );
}

export function DashboardSidebar({ orgSlug, pathname }: DashboardSidebarProps) {
  const org = useQuery(
    api.organizations.queries.getBySlug,
    orgSlug ? { slug: orgSlug } : "skip"
  );
  const isAdmin = org?.role === "admin" || org?.role === "owner";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <AccountMenu />
        <OrganizationSwitcher currentOrgSlug={orgSlug} />
        <CommandPaletteTrigger />
      </SidebarHeader>

      <SidebarContent>
        {orgSlug ? (
          <OrgNav
            isAdmin={isAdmin}
            organizationId={org?._id}
            orgSlug={orgSlug}
            pathname={pathname}
          />
        ) : (
          <p className="px-4 py-4 text-muted-foreground text-sm group-data-[collapsible=icon]:hidden">
            Select an organization to get started.
          </p>
        )}
        <PlatformNav pathname={pathname} />
      </SidebarContent>

      {orgSlug && org && isAdmin ? (
        <AdminBanners
          isPublic={org.isPublic}
          organizationId={org._id}
          orgSlug={orgSlug}
        />
      ) : null}

      <SidebarFooter>
        <SidebarMenu>
          <SidebarFooterContent isPublic={org?.isPublic} orgSlug={orgSlug} />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
