"use client";

import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface UseApiKeysProps {
  organizationId: Id<"organizations">;
}

interface UseApiKeysReturn {
  // Data
  apiKeys: ReturnType<
    typeof useQuery<typeof api.feedback_api_admin.getApiKeys>
  >;

  // State
  showSecretKey: boolean;
  setShowSecretKey: (value: boolean) => void;
  newSecretKey: string | null;
  setNewSecretKey: (value: string | null) => void;
  isRegenerating: boolean;
  setIsRegenerating: (value: boolean) => void;
  showRegenerateDialog: boolean;
  setShowRegenerateDialog: (value: boolean) => void;
  selectedKeyId: Id<"organizationApiKeys"> | null;
  setSelectedKeyId: (value: Id<"organizationApiKeys"> | null) => void;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (value: boolean) => void;
  keyToDelete: Id<"organizationApiKeys"> | null;
  setKeyToDelete: (value: Id<"organizationApiKeys"> | null) => void;
  domainInput: string;
  setDomainInput: (value: string) => void;
  newKeyName: string;
  setNewKeyName: (value: string) => void;
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;

  // Handlers
  handleGenerateKeys: () => Promise<void>;
  handleRegenerateSecretKey: () => Promise<void>;
  handleToggleActive: (
    apiKeyId: Id<"organizationApiKeys">,
    isActive: boolean
  ) => Promise<void>;
  handleDeleteKey: () => Promise<void>;
  handleAddDomain: (
    apiKeyId: Id<"organizationApiKeys">,
    currentDomains: string[]
  ) => Promise<void>;
  handleRemoveDomain: (
    apiKeyId: Id<"organizationApiKeys">,
    currentDomains: string[],
    domain: string
  ) => Promise<void>;
  copyToClipboard: (text: string, label: string) => void;
}

export function useApiKeys({
  organizationId,
}: UseApiKeysProps): UseApiKeysReturn {
  const apiKeys = useQuery(api.feedback_api_admin.getApiKeys, {
    organizationId,
  });
  const generateApiKeysMutation = useMutation(
    api.feedback_api_admin.generateApiKeys
  );
  const regenerateSecretKeyMutation = useMutation(
    api.feedback_api_admin.regenerateSecretKey
  );
  const updateApiKeySettingsMutation = useMutation(
    api.feedback_api_admin.updateApiKeySettings
  );
  const deleteApiKeyMutation = useMutation(api.feedback_api_admin.deleteApiKey);

  const [showSecretKey, setShowSecretKey] = useState(false);
  const [newSecretKey, setNewSecretKey] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [selectedKeyId, setSelectedKeyId] =
    useState<Id<"organizationApiKeys"> | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [keyToDelete, setKeyToDelete] =
    useState<Id<"organizationApiKeys"> | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [newKeyName, setNewKeyName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateKeys = useCallback(async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateApiKeysMutation({
        organizationId,
        name: newKeyName.trim(),
      });
      setNewSecretKey(result.secretKey);
      setNewKeyName("");
      toast.success("API keys generated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate API keys"
      );
    } finally {
      setIsGenerating(false);
    }
  }, [organizationId, newKeyName, generateApiKeysMutation]);

  const handleRegenerateSecretKey = useCallback(async () => {
    if (!selectedKeyId) {
      return;
    }
    setIsRegenerating(true);
    try {
      const result = await regenerateSecretKeyMutation({
        organizationId,
        apiKeyId: selectedKeyId,
      });
      setNewSecretKey(result.secretKey);
      setShowRegenerateDialog(false);
      toast.success("Secret key regenerated successfully");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to regenerate secret key"
      );
    } finally {
      setIsRegenerating(false);
    }
  }, [organizationId, selectedKeyId, regenerateSecretKeyMutation]);

  const handleToggleActive = useCallback(
    async (apiKeyId: Id<"organizationApiKeys">, isActive: boolean) => {
      try {
        await updateApiKeySettingsMutation({
          organizationId,
          apiKeyId,
          isActive,
        });
        toast.success(isActive ? "API key activated" : "API key deactivated");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to update settings"
        );
      }
    },
    [organizationId, updateApiKeySettingsMutation]
  );

  const handleDeleteKey = useCallback(async () => {
    if (!keyToDelete) {
      return;
    }
    try {
      await deleteApiKeyMutation({ organizationId, apiKeyId: keyToDelete });
      setShowDeleteDialog(false);
      setKeyToDelete(null);
      toast.success("API key deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete API key"
      );
    }
  }, [organizationId, keyToDelete, deleteApiKeyMutation]);

  const handleAddDomain = useCallback(
    async (apiKeyId: Id<"organizationApiKeys">, currentDomains: string[]) => {
      if (!domainInput.trim()) {
        return;
      }

      const newDomains = [...currentDomains, domainInput.trim()];
      try {
        await updateApiKeySettingsMutation({
          organizationId,
          apiKeyId,
          allowedDomains: newDomains,
        });
        setDomainInput("");
        toast.success("Domain added");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to add domain"
        );
      }
    },
    [organizationId, domainInput, updateApiKeySettingsMutation]
  );

  const handleRemoveDomain = useCallback(
    async (
      apiKeyId: Id<"organizationApiKeys">,
      currentDomains: string[],
      domain: string
    ) => {
      const newDomains = currentDomains.filter((d: string) => d !== domain);
      try {
        await updateApiKeySettingsMutation({
          organizationId,
          apiKeyId,
          allowedDomains: newDomains,
        });
        toast.success("Domain removed");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to remove domain"
        );
      }
    },
    [organizationId, updateApiKeySettingsMutation]
  );

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  }, []);

  return {
    apiKeys,
    showSecretKey,
    setShowSecretKey,
    newSecretKey,
    setNewSecretKey,
    isRegenerating,
    setIsRegenerating,
    showRegenerateDialog,
    setShowRegenerateDialog,
    selectedKeyId,
    setSelectedKeyId,
    showDeleteDialog,
    setShowDeleteDialog,
    keyToDelete,
    setKeyToDelete,
    domainInput,
    setDomainInput,
    newKeyName,
    setNewKeyName,
    isGenerating,
    setIsGenerating,
    handleGenerateKeys,
    handleRegenerateSecretKey,
    handleToggleActive,
    handleDeleteKey,
    handleAddDomain,
    handleRemoveDomain,
    copyToClipboard,
  };
}
