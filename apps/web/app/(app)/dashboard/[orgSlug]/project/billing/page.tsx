"use client";

import { BillingSection } from "@/features/project/components/billing-section";
import { useProjectContext } from "@/features/project/components/project-context";

export default function BillingPage() {
  const { organizationId, orgSlug } = useProjectContext();
  return <BillingSection organizationId={organizationId} orgSlug={orgSlug} />;
}
