"use client";

import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

interface UseAgentApiKeyProps {
  organizationId: Id<"organizations">;
}

export interface UseAgentApiKeyReturn {
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

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateApiKeysMutation({
        name: "CLI",
        organizationId,
      });
      setNewSecretKey(result.secretKey);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn’t generate an API key"
      );
    }
    setIsGenerating(false);
  };

  return {
    clearSecretKey: () => setNewSecretKey(null),
    handleGenerate,
    hasExistingKey,
    isGenerating,
    newSecretKey,
  };
}
