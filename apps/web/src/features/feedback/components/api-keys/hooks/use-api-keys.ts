"use client";

import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

export type ApiKeyId = Id<"organizationApiKeys">;

export interface ApiKeyListItem {
  allowedDomains?: string[];
  apiKeyId: ApiKeyId;
  createdAt: number;
  isActive: boolean;
  lastUsedAt?: number;
  name: string;
  publicKey: string;
}

export interface UseApiKeysReturn {
  apiKeys: ApiKeyListItem[] | undefined;
  dismissSecret: () => void;
  generate: (name: string) => Promise<boolean>;
  newSecretKey: string | null;
  regenerate: (apiKeyId: ApiKeyId) => Promise<boolean>;
  remove: (apiKeyId: ApiKeyId) => Promise<boolean>;
  setActive: (apiKeyId: ApiKeyId, isActive: boolean) => Promise<void>;
  setAllowedDomains: (
    apiKeyId: ApiKeyId,
    allowedDomains: string[]
  ) => Promise<boolean>;
}

function reportError(error: unknown, fallback: string): void {
  toast.error(error instanceof Error ? error.message : fallback);
}

export function useApiKeys(
  organizationId: Id<"organizations">
): UseApiKeysReturn {
  const apiKeys = useQuery(api.feedback.api_admin.getApiKeys, {
    organizationId,
  });
  const generateMutation = useMutation(api.feedback.api_admin.generateApiKeys);
  const regenerateMutation = useMutation(
    api.feedback.api_admin.regenerateSecretKey
  );
  const updateMutation = useMutation(
    api.feedback.api_admin.updateApiKeySettings
  );
  const deleteMutation = useMutation(api.feedback.api_admin.deleteApiKey);
  const [newSecretKey, setNewSecretKey] = useState<string | null>(null);

  const generate = async (name: string) => {
    try {
      const result = await generateMutation({ name, organizationId });
      setNewSecretKey(result.secretKey);
      return true;
    } catch (error) {
      reportError(error, "Couldn’t create the API key");
      return false;
    }
  };

  const regenerate = async (apiKeyId: ApiKeyId) => {
    try {
      const result = await regenerateMutation({ apiKeyId, organizationId });
      setNewSecretKey(result.secretKey);
      return true;
    } catch (error) {
      reportError(error, "Couldn’t regenerate the secret key");
      return false;
    }
  };

  const remove = async (apiKeyId: ApiKeyId) => {
    try {
      await deleteMutation({ apiKeyId, organizationId });
      return true;
    } catch (error) {
      reportError(error, "Couldn’t delete the API key");
      return false;
    }
  };

  const setActive = async (apiKeyId: ApiKeyId, isActive: boolean) => {
    try {
      await updateMutation({ apiKeyId, isActive, organizationId });
    } catch (error) {
      reportError(error, "Couldn’t update the API key");
    }
  };

  const setAllowedDomains = async (
    apiKeyId: ApiKeyId,
    allowedDomains: string[]
  ) => {
    try {
      await updateMutation({ allowedDomains, apiKeyId, organizationId });
      return true;
    } catch (error) {
      reportError(error, "Couldn’t update allowed domains");
      return false;
    }
  };

  return {
    apiKeys,
    dismissSecret: () => setNewSecretKey(null),
    generate,
    newSecretKey,
    regenerate,
    remove,
    setActive,
    setAllowedDomains,
  };
}
