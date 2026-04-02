"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

interface UseMcpApiKeyProps {
  organizationId: Id<"organizations">;
}

interface UseMcpApiKeyReturn {
  clearSecretKey: () => void;
  handleGenerate: () => Promise<void>;
  hasExistingKey: boolean | undefined;
  isGenerating: boolean;
  newSecretKey: string | null;
}

export function useMcpApiKey({
  organizationId,
}: UseMcpApiKeyProps): UseMcpApiKeyReturn {
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
        organizationId,
        name: "MCP Server",
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
  };

  const clearSecretKey = () => {
    setNewSecretKey(null);
  };

  return {
    hasExistingKey,
    newSecretKey,
    isGenerating,
    handleGenerate,
    clearSecretKey,
  };
}
