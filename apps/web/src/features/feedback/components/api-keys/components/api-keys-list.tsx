"use client";

import { Plus } from "@phosphor-icons/react";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiKeyCard } from "./api-key-card";

interface ApiKey {
  apiKeyId: Id<"organizationApiKeys">;
  name: string;
  publicKey: string;
  isActive: boolean;
  createdAt: number;
  lastUsedAt?: number;
  allowedDomains?: string[];
}

interface ApiKeysListProps {
  apiKeys: ApiKey[];
  showSecretKey: boolean;
  setShowSecretKey: (value: boolean) => void;
  newKeyName: string;
  setNewKeyName: (value: string) => void;
  isGenerating: boolean;
  domainInput: string;
  setDomainInput: (value: string) => void;
  onGenerateKeys: () => void;
  onToggleActive: (
    apiKeyId: Id<"organizationApiKeys">,
    isActive: boolean
  ) => void;
  onDelete: (apiKeyId: Id<"organizationApiKeys">) => void;
  onRegenerate: (apiKeyId: Id<"organizationApiKeys">) => void;
  onAddDomain: (
    apiKeyId: Id<"organizationApiKeys">,
    currentDomains: string[]
  ) => void;
  onRemoveDomain: (
    apiKeyId: Id<"organizationApiKeys">,
    currentDomains: string[],
    domain: string
  ) => void;
  onCopyToClipboard: (text: string, label: string) => void;
}

export function ApiKeysList({
  apiKeys,
  showSecretKey,
  setShowSecretKey,
  newKeyName,
  setNewKeyName,
  isGenerating,
  domainInput,
  setDomainInput,
  onGenerateKeys,
  onToggleActive,
  onDelete,
  onRegenerate,
  onAddDomain,
  onRemoveDomain,
  onCopyToClipboard,
}: ApiKeysListProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-lg border p-4">
        <Input
          className="flex-1"
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="New API key name"
          value={newKeyName}
        />
        <Button
          disabled={isGenerating || !newKeyName.trim()}
          onClick={onGenerateKeys}
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          {isGenerating ? "Creating..." : "Create Key"}
        </Button>
      </div>

      {apiKeys.map((key) => (
        <ApiKeyCard
          apiKey={key}
          domainInput={domainInput}
          key={key.apiKeyId}
          onAddDomain={onAddDomain}
          onCopyToClipboard={onCopyToClipboard}
          onDelete={onDelete}
          onRegenerate={onRegenerate}
          onRemoveDomain={onRemoveDomain}
          onToggleActive={onToggleActive}
          setDomainInput={setDomainInput}
          setShowSecretKey={setShowSecretKey}
          showSecretKey={showSecretKey}
        />
      ))}
    </div>
  );
}
