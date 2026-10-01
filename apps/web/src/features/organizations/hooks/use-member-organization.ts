import { api } from "@reflet/backend/convex/_generated/api";
import type { MemberOrganization } from "@reflet/backend/convex/organizations/queries";
import { useQuery } from "convex/react";

export function useMemberOrganization(
  orgSlug: string | undefined
): MemberOrganization | undefined {
  const organizations = useQuery(api.organizations.queries.list);
  return organizations?.find((org) => org?.slug === orgSlug) ?? undefined;
}
