import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
} from "@ctrl-ui/react/ui/sidebar";
import type { MemberOrganization } from "@reflet/backend/convex/organizations/queries";
import { CommandPaletteTrigger } from "@/features/command-palette/components/command-palette-trigger";
import { AccountMenu } from "@/features/dashboard/components/navigation/account-menu";
import { FooterLinks } from "@/features/dashboard/components/navigation/footer-links";
import { OrgNavigation } from "@/features/dashboard/components/navigation/org-navigation";
import { SidebarFooterContent } from "@/features/dashboard/components/sidebar-footer-content";
import { OrganizationSwitcher } from "@/features/organizations/components/organization-switcher";
import { useMemberOrganization } from "@/features/organizations/hooks/use-member-organization";

function DashboardFooter({ org }: { org: MemberOrganization | undefined }) {
  return (
    <SidebarFooter>
      <FooterLinks
        className="lg:[:root:has([data-section-panel])_&]:hidden"
        org={org}
      />
      <SidebarMenu>
        <SidebarFooterContent />
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
      <DashboardFooter org={org} />
    </Sidebar>
  );
}
