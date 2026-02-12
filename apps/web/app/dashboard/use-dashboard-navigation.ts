interface OrgFromList {
  slug: string;
  [key: string]: unknown;
}

type OrgFromQuery = {
  role: string | null;
  [key: string]: unknown;
} | null;

export interface DashboardNavigationState {
  orgSlug: string | undefined;
  org: OrgFromQuery | undefined;
  organizations: OrgFromList[] | undefined;
}

export interface DashboardNavigationResult {
  /** If set, the user should be redirected to this path */
  redirectTo: string | null;
  /** Whether the current org is not accessible to the user */
  orgNotAccessible: boolean;
  /** Whether the user has any organizations */
  hasOrganizations: boolean;
}

/**
 * Pure function that computes dashboard navigation decisions.
 *
 * Rules:
 * 1. Never redirect when data is still loading (org or organizations undefined)
 * 2. When on /dashboard (no orgSlug) with exactly 1 org, auto-select it
 * 3. When on an org page, never redirect — show inline error if inaccessible
 * 4. Org is inaccessible only when both queries loaded, org list is non-empty,
 *    the org has no role, AND the org slug isn't in the user's org list
 */
export function computeDashboardNavigation(
  state: DashboardNavigationState
): DashboardNavigationResult {
  const { orgSlug, org, organizations } = state;

  const hasOrganizations = !!organizations && organizations.length > 0;

  // Auto-select when user has exactly one org and is on /dashboard (no orgSlug)
  const shouldAutoSelect =
    !orgSlug && organizations?.length === 1 && !!organizations[0];

  const redirectTo = shouldAutoSelect
    ? `/dashboard/${organizations?.[0]?.slug}`
    : null;

  // Determine if org is not accessible — NEVER triggers a redirect
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
    redirectTo,
    orgNotAccessible,
    hasOrganizations,
  };
}
