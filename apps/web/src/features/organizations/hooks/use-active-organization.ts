import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { organizationSelectionAtom } from "@/features/organizations/lib/organization-selection";

export function useRememberOrganization() {
  const user = useQuery(api.auth.queries.getCurrentUser);
  const setSelection = useSetAtom(organizationSelectionAtom);

  if (!user) {
    return;
  }

  return (organizationId: Id<"organizations">) => {
    setSelection({ organizationId, userId: user._id });
  };
}

export function useActiveOrganization(routeOrgSlug: string | undefined) {
  const organizations = useQuery(api.organizations.queries.list);
  const user = useQuery(api.auth.queries.getCurrentUser);
  const selection = useAtomValue(organizationSelectionAtom);
  const setSelection = useSetAtom(organizationSelectionAtom);
  const routeOrganization = organizations?.find(
    (organization) => organization?.slug === routeOrgSlug
  );
  const rememberedOrganization =
    user && selection?.userId === user._id
      ? organizations?.find(
          (organization) => organization?._id === selection.organizationId
        )
      : undefined;
  const onlyOrganization =
    organizations?.length === 1 ? organizations[0] : undefined;
  const activeOrganization = routeOrgSlug
    ? routeOrganization
    : (rememberedOrganization ?? onlyOrganization);
  const userId = user?._id;
  const routeOrganizationId = routeOrganization?._id;

  useEffect(() => {
    if (userId && routeOrganizationId) {
      setSelection({ organizationId: routeOrganizationId, userId });
    }
  }, [routeOrganizationId, setSelection, userId]);

  return { activeOrganization, organizations };
}
