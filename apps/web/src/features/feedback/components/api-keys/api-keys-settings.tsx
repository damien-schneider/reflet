"use client";

import { ArrowSquareOut, Copy, Key, Warning } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
        <Link
          className={buttonVariants({ size: "sm", variant: "ghost" })}
          href="/docs/sdk"
          rel="noopener"
          target="_blank"
        >
          Docs
          <ArrowSquareOut className="ml-2 h-4 w-4" />
        </Link>
      </div>

      {newSecretKey ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <div className="flex items-start gap-3">
            <Warning className="mt-0.5 h-5 w-5 text-amber-600" />
            <div className="min-w-0 flex-1">
              <h2 className="font-medium text-amber-800 dark:text-amber-200">
                Save your secret key now
              </h2>
              <p className="mt-1 text-amber-700 text-sm dark:text-amber-300">
                This is the only time it will be shown.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="min-w-0 flex-1 overflow-x-auto rounded bg-amber-100 px-3 py-2 font-mono text-sm dark:bg-amber-900">
                  {newSecretKey}
                </code>
                <Button
                  aria-label="Copy secret key"
                  onClick={() => copyToClipboard(newSecretKey, "Secret key")}
                  size="icon"
                  variant="outline"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                className="mt-3"
                onClick={() => setNewSecretKey(null)}
                size="sm"
                variant="ghost"
              >
                I&apos;ve saved it
              </Button>
            </div>
          </div>
        </div>
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
