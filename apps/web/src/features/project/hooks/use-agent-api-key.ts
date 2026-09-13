"use client";

import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";

interface UseAgentApiKeyProps {
  organizationId: Id<"organizations">;
}

interface UseAgentApiKeyReturn {
  clearSecretKey: () => void;
  handleGenerate: () => Promise<void>;
  hasExistingKey: boolean | undefined;
  isGenerating: boolean;
  newSecretKey: string | null;
}

export function useAgentApiKey({
  organizationId,
}: UseAgentApiKeyProps): UseAgentApiKeyReturn {
  const apiKeys = useQuery(api.feedback.api_admin.getApiKeys, {
    organizationId,
  });
  const generateApiKeysMutation = useMutation(
    api.feedback.api_admin.generateApiKeys
  );

  const [newSecretKey, setNewSecretKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const hasExistingKey = apiKeys === undefined ? undefined : apiKeys.length > 0;

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const result = await generateApiKeysMutation({
        name: "CLI",
        organizationId,
      });
      setNewSecretKey(result.secretKey);
      toast.success("API key generated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate API key"
      );
    } finally {
      setIsGenerating(false);
    }
  }, [organizationId, generateApiKeysMutation]);

  const clearSecretKey = useCallback(() => {
    setNewSecretKey(null);
  }, []);

  return {
    clearSecretKey,
    handleGenerate,
    hasExistingKey,
    isGenerating,
    newSecretKey,
  };
}
