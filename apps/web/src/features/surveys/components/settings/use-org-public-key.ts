import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";

export type OrgPublicKey =
  | { status: "loading" }
  | { publicKey: string; status: "ready" }
  | { canManageKeys: boolean; orgSlug: string | null; status: "missing" };

/** The organization's public key for install snippets; admins get one created on first use. */
export function useOrgPublicKey(
  organizationId: Id<"organizations">
): OrgPublicKey {
  const organization = useQuery(api.organizations.queries.get, {
    id: organizationId,
  });
  const apiKeys = useQuery(api.feedback.api_admin.getApiKeys, {
    organizationId,
  });
  const ensurePublicKey = useMutation(api.feedback.api_admin.ensurePublicKey);
  const [keyCreationFailed, setKeyCreationFailed] = useState(false);

  const publicKey =
    apiKeys?.find((apiKey) => apiKey.isActive)?.publicKey ??
    apiKeys?.[0]?.publicKey;
  const canManageKeys =
    organization?.role === "admin" || organization?.role === "owner";
  const shouldCreateKey =
    canManageKeys && apiKeys?.length === 0 && !keyCreationFailed;

  useEffect(() => {
    if (!shouldCreateKey) {
      return;
    }
    ensurePublicKey({ organizationId }).catch(() => setKeyCreationFailed(true));
  }, [ensurePublicKey, organizationId, shouldCreateKey]);

  if (publicKey) {
    return { publicKey, status: "ready" };
  }
  if (organization === undefined || apiKeys === undefined || shouldCreateKey) {
    return { status: "loading" };
  }
  return {
    canManageKeys,
    orgSlug: organization?.slug ?? null,
    status: "missing",
  };
}
