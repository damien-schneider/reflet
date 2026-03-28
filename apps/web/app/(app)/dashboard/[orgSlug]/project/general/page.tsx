"use client";

import { OrganizationSection } from "@/features/project/components/organization-section";
import { useProjectContext } from "@/features/project/components/project-context";

export default function GeneralPage() {
  const { isAdmin, organizationId, orgSlug } = useProjectContext();
  return (
    <OrganizationSection
      isAdmin={isAdmin}
      organizationId={organizationId}
      orgSlug={orgSlug}
    />
  );
}
