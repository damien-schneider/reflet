"use client";

import { useCustomDomainOrg } from "@/features/public-org/hooks/use-custom-domain-org";
import { SupportCenter } from "@/features/support/components/support-center";

export default function CustomDomainSupportPage() {
  const org = useCustomDomainOrg();

  return <SupportCenter backHref="/" org={org} />;
}
