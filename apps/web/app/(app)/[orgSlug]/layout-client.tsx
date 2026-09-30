"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { use } from "react";
import { PublicOrgShell } from "@/features/public-org/components/public-org-shell";
import {
  PublicOrgNotFound,
  PublicOrgShellSkeleton,
} from "@/features/public-org/components/public-org-states";

export default function PublicOrgLayoutClient({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.queries.getBySlug, { slug: orgSlug });

  if (org === undefined) {
    return <PublicOrgShellSkeleton />;
  }

  if (org === null) {
    return (
      <PublicOrgNotFound
        description="Check the link, or ask the team that shared it for the right address."
        homeHref="/"
        homeLabel="Go to homepage"
        title="Organization not found"
      />
    );
  }

  return (
    <PublicOrgShell basePath={`/${orgSlug}`} org={org} orgSlug={orgSlug}>
      {children}
    </PublicOrgShell>
  );
}
