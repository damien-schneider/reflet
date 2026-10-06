"use client";

import { PublicChangelogView } from "@/features/changelog/components/public-changelog-view";
import { useCustomDomainOrg } from "@/features/public-org/hooks/use-custom-domain-org";

export default function CustomDomainChangelogPage() {
  const org = useCustomDomainOrg();

  return <PublicChangelogView org={org} />;
}
