"use client";

import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";

type CreateWebhookInput = Omit<
  Parameters<
    ReturnType<typeof useMutation<typeof api.webhooks.mutations.create>>
  >[0],
  "organizationId"
>;

function reportError(error: unknown, fallback: string): void {
  toast.error(error instanceof Error ? error.message : fallback);
}

export function useWebhooks(organizationId: Id<"organizations">) {
  const webhooks = useQuery(api.webhooks.queries.list, { organizationId });
  const deliveries = useQuery(api.webhooks.queries.listDeliveries, {
    organizationId,
  });
  const createMutation = useMutation(api.webhooks.mutations.create);
  const updateMutation = useMutation(api.webhooks.mutations.update);
  const removeMutation = useMutation(api.webhooks.mutations.remove);

  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const create = useCallback(
    async (input: CreateWebhookInput): Promise<boolean> => {
      setIsCreating(true);
      try {
        const result = await createMutation({ organizationId, ...input });
        setNewSecret(result.secret);
        toast.success("Webhook created");
        return true;
      } catch (error) {
        reportError(error, "Failed to create webhook");
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    [createMutation, organizationId]
  );

  const setActive = useCallback(
    async (webhookId: Id<"organizationWebhooks">, isActive: boolean) => {
      try {
        await updateMutation({ isActive, webhookId });
      } catch (error) {
        reportError(error, "Failed to update webhook");
      }
    },
    [updateMutation]
  );

  const remove = useCallback(
    async (webhookId: Id<"organizationWebhooks">) => {
      try {
        await removeMutation({ webhookId });
        toast.success("Webhook deleted");
      } catch (error) {
        reportError(error, "Failed to delete webhook");
      }
    },
    [removeMutation]
  );

  const copySecret = useCallback(() => {
    if (newSecret) {
      navigator.clipboard.writeText(newSecret);
      toast.success("Secret copied to clipboard");
    }
  }, [newSecret]);

  return {
    copySecret,
    create,
    deliveries,
    dismissSecret: () => setNewSecret(null),
    isCreating,
    newSecret,
    remove,
    setActive,
    webhooks,
  };
}
