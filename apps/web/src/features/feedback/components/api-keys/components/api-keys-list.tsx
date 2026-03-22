"use client";

import { Plus } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiKeyCard } from "./api-key-card";

interface ApiKey {
  allowedDomains?: string[];
  apiKeyId: Id<"organizationApiKeys">;
  createdAt: number;
  isActive: boolean;
  lastUsedAt?: number;
  name: string;
  publicKey: string;
}

interface ApiKeysListProps {
  apiKeys: ApiKey[];
  domainInput: string;
  isGenerating: boolean;
  newKeyName: string;
  onAddDomain: (
    apiKeyId: Id<"organizationApiKeys">,
    currentDomains: string[]
  ) => void;
  onCopyToClipboard: (text: string, label: string) => void;
  onDelete: (apiKeyId: Id<"organizationApiKeys">) => void;
  onGenerateKeys: () => void;
  onRegenerate: (apiKeyId: Id<"organizationApiKeys">) => void;
  onRemoveDomain: (
    apiKeyId: Id<"organizationApiKeys">,
    currentDomains: string[],
    domain: string
  ) => void;
  onToggleActive: (
    apiKeyId: Id<"organizationApiKeys">,
    isActive: boolean
  ) => void;
  setDomainInput: (value: string) => void;
  setNewKeyName: (value: string) => void;
  setShowSecretKey: (value: boolean) => void;
  showSecretKey: boolean;
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
