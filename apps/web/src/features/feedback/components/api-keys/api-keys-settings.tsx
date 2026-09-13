"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import { ArrowSquareOut, Key } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import Link from "next/link";
import { SecretOnceBanner } from "@/components/secret-once-banner";
import { ApiKeyDialogs } from "./components/api-key-dialogs";
import { ApiKeysList } from "./components/api-keys-list";
import { useApiKeys } from "./hooks/use-api-keys";

interface ApiKeysSettingsProps {
  organizationId: Id<"organizations">;
}

export function ApiKeysSettings({ organizationId }: ApiKeysSettingsProps) {
  const {
    apiKeys,
    showSecretKey,
    setShowSecretKey,
    newSecretKey,
    setNewSecretKey,
    isRegenerating,
    showRegenerateDialog,
    setShowRegenerateDialog,
    setSelectedKeyId,
    showDeleteDialog,
    setShowDeleteDialog,
    setKeyToDelete,
    domainInput,
    setDomainInput,
    newKeyName,
    setNewKeyName,
    isGenerating,
    handleGenerateKeys,
    handleRegenerateSecretKey,
    handleToggleActive,
    handleDeleteKey,
    handleAddDomain,
    handleRemoveDomain,
    copyToClipboard,
  } = useApiKeys({ organizationId });

  if (apiKeys === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-32 rounded bg-muted" />
        <div className="h-11 w-full rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-semibold text-lg">API keys</h1>
        <ButtonLink
          render={<Link href="/docs/sdk" rel="noopener" target="_blank" />}
          size="xs"
        >
          Docs
          <ArrowSquareOut className="ml-2 h-4 w-4" />
        </ButtonLink>
      </div>

      {newSecretKey ? (
        <SecretOnceBanner
          onCopy={() => copyToClipboard(newSecretKey, "Secret key")}
          onDismiss={() => setNewSecretKey(null)}
          secret={newSecretKey}
          title="Save your secret key now"
        />
      ) : null}

      {apiKeys.length === 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            className="sm:max-w-xs"
            onChange={(event) => setNewKeyName(event.target.value)}
            placeholder="Key name"
            value={newKeyName}
          />
          <Button
            disabled={isGenerating || !newKeyName.trim()}
            onClick={handleGenerateKeys}
            tone="primary"
            variant="solid"
          >
            <Key className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate key"}
          </Button>
        </div>
      ) : (
        <ApiKeysList
          apiKeys={apiKeys}
          domainInput={domainInput}
          isGenerating={isGenerating}
          newKeyName={newKeyName}
          onAddDomain={handleAddDomain}
          onCopyToClipboard={copyToClipboard}
          onDelete={(id) => {
            setKeyToDelete(id);
            setShowDeleteDialog(true);
          }}
          onGenerateKeys={handleGenerateKeys}
          onRegenerate={(id) => {
            setSelectedKeyId(id);
            setShowRegenerateDialog(true);
          }}
          onRemoveDomain={handleRemoveDomain}
          onToggleActive={handleToggleActive}
          setDomainInput={setDomainInput}
          setNewKeyName={setNewKeyName}
          setShowSecretKey={setShowSecretKey}
          showSecretKey={showSecretKey}
        />
      )}

      <ApiKeyDialogs
        isRegenerating={isRegenerating}
        onDelete={handleDeleteKey}
        onRegenerate={handleRegenerateSecretKey}
        setShowDeleteDialog={setShowDeleteDialog}
        setShowRegenerateDialog={setShowRegenerateDialog}
        showDeleteDialog={showDeleteDialog}
        showRegenerateDialog={showRegenerateDialog}
      />
    </div>
  );
}
