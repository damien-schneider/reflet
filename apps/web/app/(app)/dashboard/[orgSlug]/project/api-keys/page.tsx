"use client";

import { ApiKeysSettings } from "@/features/feedback/components/api-keys/api-keys-settings";
import { useProjectContext } from "@/features/project/components/project-context";
import { SettingsPage } from "@/features/project/components/settings-page";
import { WebhooksSettings } from "@/features/webhooks/components/webhooks-settings";

export default function ApiKeysPage() {
  const { organizationId } = useProjectContext();
  return (
    <SettingsPage
      description="Connect Reflet to your product and your own services."
      title="API keys"
    >
      <ApiKeysSettings organizationId={organizationId} />
      <WebhooksSettings organizationId={organizationId} />
    </SettingsPage>
  );
}
