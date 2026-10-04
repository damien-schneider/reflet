"use client";

import { useProjectContext } from "@/features/project/components/project-context";
import { SupportEmailSection } from "@/features/support-email/components/support-email-section";

export default function SupportEmailPage() {
  const { organizationId, isAdmin, orgSlug } = useProjectContext();

  return (
    <SupportEmailSection
      isAdmin={isAdmin}
      organizationId={organizationId}
      orgSlug={orgSlug}
    />
  );
}
