"use client";

import { MembersSection } from "@/features/project/components/members-section";
import { useProjectContext } from "@/features/project/components/project-context";

export default function MembersPage() {
  const { isAdmin, organizationId, orgSlug } = useProjectContext();
  return (
    <MembersSection
      isAdmin={isAdmin}
      organizationId={organizationId}
      orgSlug={orgSlug}
    />
  );
}
