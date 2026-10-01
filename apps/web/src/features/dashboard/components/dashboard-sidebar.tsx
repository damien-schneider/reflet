import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@ctrl-ui/react/ui/sidebar";
import { ShieldStar } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { MemberOrganization } from "@reflet/backend/convex/organizations/queries";
import { useQuery } from "convex/react";
import Link from "next/link";
import { CommandPaletteTrigger } from "@/features/command-palette/components/command-palette-trigger";
import { MakePublicBanner } from "@/features/dashboard/components/make-public-banner";
import { AccountMenu } from "@/features/dashboard/components/navigation/account-menu";
import { OrgNavigation } from "@/features/dashboard/components/navigation/org-navigation";
import { UpgradeLink } from "@/features/dashboard/components/navigation/upgrade-link";
import { SidebarFooterContent } from "@/features/dashboard/components/sidebar-footer-content";
import { OrganizationSwitcher } from "@/features/organizations/components/organization-switcher";
import { useMemberOrganization } from "@/features/organizations/hooks/use-member-organization";

const SUPER_ADMIN_PATH = "/dashboard/super-admin";

function SuperAdminItem({ pathname }: { pathname: string }) {
  const isSuperAdmin = useQuery(api.organizations.super_admin.isSuperAdmin);
  const isActive = pathname.startsWith(SUPER_ADMIN_PATH);
  if (!isSuperAdmin) {
    return null;
  }
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        aria-current={isActive ? "page" : undefined}
        className="group-data-[collapsible=icon]:justify-center"
        isActive={isActive}
        render={<Link href={SUPER_ADMIN_PATH} />}
        tooltip="Super admin"
      >
        <ShieldStar aria-hidden="true" />
        <span className="flex-1 group-data-[collapsible=icon]:sr-only">
          Super admin
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function AdminActions({ org }: { org: MemberOrganization }) {
  return (
    <>
      {org.isPublic ? null : <MakePublicBanner orgId={org._id} />}
      {org.subscriptionTier === "free" ? (
        <UpgradeLink orgSlug={org.slug} />
      ) : null}
    </>
  );
}

function DashboardFooter({
  org,
  isAdmin,
  pathname,
}: {
  org: MemberOrganization | undefined;
  isAdmin: boolean;
  pathname: string;
}) {
  return (
    <SidebarFooter>
      {org && isAdmin ? <AdminActions org={org} /> : null}
      <SidebarMenu>
        <SuperAdminItem pathname={pathname} />
        <SidebarFooterContent isPublic={org?.isPublic} orgSlug={org?.slug} />
        <AccountMenu />
      </SidebarMenu>
    </SidebarFooter>
  );
}

export function DashboardSidebar({
  orgSlug,
  pathname,
}: {
  orgSlug?: string;
  pathname: string;
}) {
  const org = useMemberOrganization(orgSlug);
  const isAdmin = org?.role === "admin" || org?.role === "owner";
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <OrganizationSwitcher currentOrgSlug={orgSlug} />
        <CommandPaletteTrigger />
      </SidebarHeader>
      <SidebarContent>
        {orgSlug ? (
          <OrgNavigation
            organization={{ id: org?._id, isAdmin, slug: orgSlug }}
            pathname={pathname}
          />
        ) : (
          <p className="px-4 py-4 text-muted-foreground text-sm group-data-[collapsible=icon]:hidden">
            Select an organization to get started.
          </p>
        )}
      </SidebarContent>
      <DashboardFooter isAdmin={isAdmin} org={org} pathname={pathname} />
      <SidebarRail resizable />
    </Sidebar>
  );
}
