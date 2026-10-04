import { useSidebar } from "@ctrl-ui/react/ui/sidebar";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { NavGroup } from "@/features/dashboard/components/navigation/nav-group";
import {
  isSectionActive,
  type NavSection,
  orgSections,
} from "@/features/dashboard/components/navigation/org-sections";

interface OrgNavigationProps {
  organization: {
    id: Id<"organizations"> | undefined;
    slug: string;
    isAdmin: boolean;
  };
  pathname: string;
}

export function useOrgSections({
  id,
  slug,
  isAdmin,
}: OrgNavigationProps["organization"]) {
  const adminArgs = id && isAdmin ? { organizationId: id } : "skip";
  const unread = useQuery(api.support.admin.getUnreadCount, adminArgs);
  const deleted = useQuery(api.feedback.trash.getDeletedCount, adminArgs);
  return orgSections({ counts: { deleted, unread }, isAdmin, slug });
}

export function OrgNavigation({ organization, pathname }: OrgNavigationProps) {
  return (
    <OrgNavigationMenu
      pathname={pathname}
      sections={useOrgSections(organization)}
    />
  );
}

export function OrgNavigationMenu({
  pathname,
  sections,
}: {
  pathname: string;
  sections: NavSection[];
}) {
  const { isMobile } = useSidebar();
  const workspace = sections.filter((section) => !section.manage);
  const manage = sections.filter((section) => section.manage);
  const activeWorkspaceSection = workspace.find(
    (section) => section.items && isSectionActive(section, pathname)
  );

  if (!isMobile) {
    return (
      <>
        <NavGroup items={workspace} label="Workspace" pathname={pathname} />
        <NavGroup items={manage} label="Manage" pathname={pathname} />
      </>
    );
  }

  return (
    <>
      <NavGroup items={workspace} label="Workspace" pathname={pathname} />
      {[activeWorkspaceSection, ...manage].map((section) =>
        section?.items ? (
          <NavGroup
            items={section.items}
            key={section.label}
            label={section.label}
            pathname={pathname}
          />
        ) : null
      )}
    </>
  );
}
