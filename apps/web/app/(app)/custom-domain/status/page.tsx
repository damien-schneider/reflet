"use client";

import { useCustomDomainOrg } from "@/features/public-org/hooks/use-custom-domain-org";
import {
  PublicStatusSkeleton,
  PublicStatusUnavailable,
  PublicStatusView,
} from "@/features/status/components/public-status-view";

export default function CustomDomainStatusPage() {
  const org = useCustomDomainOrg();

  if (org === undefined) {
    return <PublicStatusSkeleton />;
  }

  if (org === null) {
    return <PublicStatusUnavailable />;
  }

  return <PublicStatusView orgSlug={org.slug} />;
}
