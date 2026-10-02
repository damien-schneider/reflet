interface OrgFromList {
  slug: string;
}

type OrgFromQuery = {
  role: string | null;
} | null;

export interface DashboardNavigationState {
  activeOrgSlug?: string;
  org: OrgFromQuery | undefined;
  organizations: (OrgFromList | null)[] | undefined;
  orgSlug: string | undefined;
}

export interface DashboardNavigationResult {
  hasOrganizations: boolean;
  orgNotAccessible: boolean;
  redirectTo: string | null;
}

export function computeDashboardNavigation(
  state: DashboardNavigationState
): DashboardNavigationResult {
  const { activeOrgSlug, orgSlug, org, organizations } = state;

  const hasOrganizations = !!organizations && organizations.length > 0;

  const redirectTo =
    !orgSlug && activeOrgSlug ? `/dashboard/${activeOrgSlug}` : null;

  const isOrgInUserList =
    organizations?.some((o) => o?.slug === orgSlug) ?? false;

  const orgNotAccessible = Boolean(
    orgSlug &&
      org !== undefined &&
      organizations !== undefined &&
      organizations.length > 0 &&
      (org === null || !org.role) &&
      !isOrgInUserList
  );

  return {
    hasOrganizations,
    orgNotAccessible,
    redirectTo,
  };
}
