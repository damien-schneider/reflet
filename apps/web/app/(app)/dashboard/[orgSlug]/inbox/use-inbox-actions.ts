import { toast } from "@ctrl-ui/react/ui/toast";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import type { useInbox } from "@/features/inbox/hooks/use-inbox";
import type { ConversationStatus } from "@/features/support/lib/conversation-status";

export type InboxState = ReturnType<typeof useInbox>;

async function withFailureToast(
  action: () => Promise<unknown>,
  message: string
) {
  try {
    await action();
  } catch {
    toast.error(message);
  }
}

export function useInboxActions(inbox: InboxState) {
  const { conversations, selectedId, write } = inbox;

  const updateStatus = (
    id: Id<"supportConversations">,
    status: ConversationStatus
  ) =>
    withFailureToast(
      () => write.updateStatus({ id, status }),
      "Couldn’t update the status. Try again."
    );

  const changeStatus = async (status: ConversationStatus) => {
    if (selectedId) {
      await updateStatus(selectedId, status);
    }
  };

  const assign = (
    id: Id<"supportConversations">,
    assignedTo: string | undefined
  ) =>
    withFailureToast(
      () => write.assignConversation({ assignedTo, id }),
      "Couldn’t change the assignee. Try again."
    );

  const moveSelection = (offset: number) => {
    if (!conversations || conversations.length === 0) {
      return;
    }
    const current = conversations.findIndex((c) => c._id === selectedId);
    const next = Math.max(
      0,
      Math.min(current + offset, conversations.length - 1)
    );
    inbox.setSelectedId(conversations[next]._id);
  };

  return { assign, changeStatus, moveSelection, updateStatus };
}

export function useSupportToggle(
  inbox: InboxState,
  organizationId: Id<"organizations">
) {
  const [isSaving, setIsSaving] = useState(false);

  const toggleSupport = async (enabled: boolean) => {
    setIsSaving(true);
    try {
      await inbox.write.updateSupportSettings({
        organizationId,
        supportEnabled: enabled,
      });
    } catch {
      toast.error("Couldn’t update the support page. Try again.");
    }
    setIsSaving(false);
  };

  return { isSaving, toggleSupport };
}
