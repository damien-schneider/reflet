import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
} from "@ctrl-ui/react/ui/sidebar";
import { ShieldStar } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { CommandPaletteTrigger } from "@/features/command-palette/components/command-palette-trigger";
import { MakePublicBanner } from "@/features/dashboard/components/make-public-banner";
import { AccountMenu } from "@/features/dashboard/components/navigation/account-menu";
import { NavGroup } from "@/features/dashboard/components/navigation/nav-group";
import { OrgNavigation } from "@/features/dashboard/components/navigation/org-navigation";
import { UpgradeLink } from "@/features/dashboard/components/navigation/upgrade-link";
import { SidebarFooterContent } from "@/features/dashboard/components/sidebar-footer-content";
import { OrganizationSwitcher } from "@/features/organizations/components/organization-switcher";

function PlatformNav({ pathname }: { pathname: string }) {
  const isSuperAdmin = useQuery(api.organizations.super_admin.isSuperAdmin);
  if (!isSuperAdmin) {
    return null;
  }
  return (
    <NavGroup
      items={[
        {
          href: "/dashboard/super-admin",
          icon: ShieldStar,
          label: "Super admin",
        },
      ]}
      label="Platform"
      pathname={pathname}
    />
  );
}

function AdminActions({
  organizationId,
  orgSlug,
  isPublic,
}: {
  organizationId: Id<"organizations">;
  orgSlug: string;
  isPublic: boolean | undefined;
}) {
  const subscription = useQuery(api.billing.queries.getStatus, {
    organizationId,
  });
  return (
    <>
      {isPublic ? null : <MakePublicBanner orgId={organizationId} />}
      {subscription?.tier === "free" ? <UpgradeLink orgSlug={orgSlug} /> : null}
    </>
  );
}

function DashboardFooter({
  org,
  isAdmin,
}: {
  org:
    | FunctionReturnType<typeof api.organizations.queries.getBySlug>
    | undefined;
  isAdmin: boolean;
}) {
  return (
    <SidebarFooter>
      {org && isAdmin ? (
        <AdminActions
          isPublic={org.isPublic}
          organizationId={org._id}
          orgSlug={org.slug}
        />
      ) : null}
      <SidebarMenu>
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
  const org = useQuery(
    api.organizations.queries.getBySlug,
    orgSlug ? { slug: orgSlug } : "skip"
  );
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
        <PlatformNav pathname={pathname} />
      </SidebarContent>
      <DashboardFooter isAdmin={isAdmin} org={org} />
      <SidebarRail resizable />
    </Sidebar>
  );
}
