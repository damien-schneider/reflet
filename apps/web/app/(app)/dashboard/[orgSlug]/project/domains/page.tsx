"use client";

import { DomainsSection } from "@/features/project/components/domains-section";
import { useProjectContext } from "@/features/project/components/project-context";

export default function DomainsPage() {
  const { organizationId, isAdmin, orgSlug } = useProjectContext();

  return (
    <DomainsSection
      isAdmin={isAdmin}
      organizationId={organizationId}
      orgSlug={orgSlug}
    />
  );
}
