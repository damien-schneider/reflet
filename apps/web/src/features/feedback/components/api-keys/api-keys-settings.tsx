"use client";

import { ButtonLink } from "@ctrl-ui/react/ui/button";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { ArrowSquareOut } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import Link from "next/link";
import { useState } from "react";
import { SecretOnceBanner } from "@/components/secret-once-banner";
import { SettingsSection } from "@/features/project/components/settings-page";
import { ApiKeyCard } from "./components/api-key-card";
import {
  type ApiKeyAction,
  ApiKeyConfirmDialog,
} from "./components/api-key-dialogs";
import { CreateApiKeyForm } from "./components/create-api-key-form";
import { type ApiKeyListItem, useApiKeys } from "./hooks/use-api-keys";

interface ApiKeysSettingsProps {
  organizationId: Id<"organizations">;
}

export function ApiKeysSettings({ organizationId }: ApiKeysSettingsProps) {
  const {
    apiKeys,
    dismissSecret,
    generate,
    newSecretKey,
    regenerate,
    remove,
    setActive,
    setAllowedDomains,
  } = useApiKeys(organizationId);
  const [pending, setPending] = useState<{
    action: ApiKeyAction;
    apiKey: ApiKeyListItem;
  } | null>(null);

  const handleConfirm = (action: ApiKeyAction, apiKey: ApiKeyListItem) =>
    action === "delete" ? remove(apiKey.apiKeyId) : regenerate(apiKey.apiKeyId);

  return (
    <SettingsSection
      actions={
        <ButtonLink
          render={<Link href="/docs/sdk" rel="noopener" target="_blank" />}
          size="sm"
          variant="ghost"
        >
          SDK docs
          <ArrowSquareOut aria-hidden />
        </ButtonLink>
      }
      description="Use a public key in the widget or SDK, and the secret key only on your server."
      title="Keys"
    >
      {newSecretKey ? (
        <SecretOnceBanner
          onDismiss={dismissSecret}
          secret={newSecretKey}
          title="Save your secret key now"
        />
      ) : null}

      {apiKeys === undefined ? (
        <div aria-busy="true" className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <CreateApiKeyForm hasKeys={apiKeys.length > 0} onCreate={generate} />
          {apiKeys.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {apiKeys.map((apiKey) => (
                <li key={apiKey.apiKeyId}>
                  <ApiKeyCard
                    apiKey={apiKey}
                    onDelete={(key) =>
                      setPending({ action: "delete", apiKey: key })
                    }
                    onRegenerate={(key) =>
                      setPending({ action: "regenerate", apiKey: key })
                    }
                    onSetAllowedDomains={setAllowedDomains}
                    onToggleActive={setActive}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}

      <ApiKeyConfirmDialog
        onClose={() => setPending(null)}
        onConfirm={handleConfirm}
        pending={pending}
      />
    </SettingsSection>
  );
}
