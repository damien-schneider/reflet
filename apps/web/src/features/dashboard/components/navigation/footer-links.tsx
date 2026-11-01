import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@ctrl-ui/react/ui/sidebar";
import {
  ArrowUpRight,
  BookOpen,
  Crown,
  Globe,
  type Icon,
} from "@phosphor-icons/react";
import type { MemberOrganization } from "@reflet/backend/convex/organizations/queries";
import Link from "next/link";
import { MakePublicItem } from "@/features/dashboard/components/make-public-item";

function NewTabLink({
  href,
  icon: LinkIcon,
  label,
}: {
  href: string;
  icon: Icon;
  label: string;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={<Link href={href} rel="noopener" target="_blank" />}
        tooltip={label}
      >
        <LinkIcon aria-hidden="true" />
        <span className="flex-1 group-data-[collapsible=icon]:sr-only">
          {label}
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="group-data-[collapsible=icon]:hidden"
        />
        <span className="sr-only">(opens in a new tab)</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function UpgradeLink({ orgSlug }: { orgSlug: string }) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        render={
          <Link
            href={`/dashboard/${orgSlug}/project/billing`}
            onNavigate={() => setOpenMobile(false)}
          />
        }
        tooltip="Upgrade to Pro"
      >
        <Crown aria-hidden="true" />
        <span className="group-data-[collapsible=icon]:sr-only">
          Upgrade to Pro
        </span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function PublicPageItem({
  isAdmin,
  org,
}: {
  isAdmin: boolean;
  org: MemberOrganization;
}) {
  if (org.isPublic) {
    return (
      <NewTabLink href={`/${org.slug}`} icon={Globe} label="Open public page" />
    );
  }
  return isAdmin ? <MakePublicItem orgId={org._id} /> : null;
}

export function FooterLinks({
  className,
  org,
}: {
  className?: string;
  org: MemberOrganization | undefined;
}) {
  const isAdmin = org?.role === "admin" || org?.role === "owner";
  return (
    <SidebarMenu className={className}>
      <NewTabLink href="/docs" icon={BookOpen} label="Docs" />
      {org ? <PublicPageItem isAdmin={isAdmin} org={org} /> : null}
      {org && isAdmin && org.subscriptionTier === "free" ? (
        <UpgradeLink orgSlug={org.slug} />
      ) : null}
    </SidebarMenu>
  );
}
