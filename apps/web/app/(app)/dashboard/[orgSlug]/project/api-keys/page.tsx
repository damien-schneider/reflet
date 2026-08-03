"use client";

import { ApiKeysSettings } from "@/features/feedback/components/api-keys/api-keys-settings";
import { useProjectContext } from "@/features/project/components/project-context";

export default function ApiKeysPage() {
  const { organizationId } = useProjectContext();
  return <ApiKeysSettings organizationId={organizationId} />;
}
