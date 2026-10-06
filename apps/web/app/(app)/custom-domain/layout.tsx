"use client";

import { PublicOrgShell } from "@/features/public-org/components/public-org-shell";
import {
  PublicOrgNotFound,
  PublicOrgShellSkeleton,
} from "@/features/public-org/components/public-org-states";
import { useCustomDomainOrg } from "@/features/public-org/hooks/use-custom-domain-org";

export default function CustomDomainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const org = useCustomDomainOrg();

  if (org === undefined) {
    return <PublicOrgShellSkeleton />;
  }

  if (org === null) {
    return (
      <PublicOrgNotFound
        description="No organization is set up for this domain yet."
        homeHref="https://www.reflet.app"
        homeLabel="Go to Reflet"
        title="Site not found"
      />
    );
  }

  return (
    <PublicOrgShell basePath="" org={org} orgSlug={org.slug}>
      {children}
    </PublicOrgShell>
  );
}
