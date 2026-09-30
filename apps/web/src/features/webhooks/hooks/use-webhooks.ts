"use client";

import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

export type WebhookListItem = Omit<Doc<"organizationWebhooks">, "secret">;

export type CreateWebhookInput = Omit<
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

  const create = async (input: CreateWebhookInput): Promise<boolean> => {
    setIsCreating(true);
    let created = false;
    try {
      const result = await createMutation({ organizationId, ...input });
      setNewSecret(result.secret);
      created = true;
    } catch (error) {
      reportError(error, "Couldn’t create the webhook");
    }
    setIsCreating(false);
    return created;
  };

  const setActive = async (
    webhookId: Id<"organizationWebhooks">,
    isActive: boolean
  ) => {
    try {
      await updateMutation({ isActive, webhookId });
    } catch (error) {
      reportError(error, "Couldn’t update the webhook");
    }
  };

  const remove = async (webhookId: Id<"organizationWebhooks">) => {
    try {
      await removeMutation({ webhookId });
    } catch (error) {
      reportError(error, "Couldn’t delete the webhook");
    }
  };

  return {
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
