"use client";

import { ApiKeysSettings } from "@/features/feedback/components/api-keys/api-keys-settings";
import { useProjectContext } from "@/features/project/components/project-context";
import { WebhooksSettings } from "@/features/webhooks/components/webhooks-settings";

export default function ApiKeysPage() {
  const { organizationId } = useProjectContext();
  return (
    <div className="space-y-12">
      <ApiKeysSettings organizationId={organizationId} />
      <WebhooksSettings organizationId={organizationId} />
    </div>
  );
}
