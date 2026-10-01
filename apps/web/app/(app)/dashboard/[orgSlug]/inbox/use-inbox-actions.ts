import { toast } from "@ctrl-ui/react/ui/toast";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useState } from "react";
import type { useInbox } from "@/features/inbox/hooks/use-inbox";
import type { ConversationStatus } from "@/features/support/lib/conversation-status";

export type InboxState = ReturnType<typeof useInbox>;
type InboxWrite = InboxState["write"];

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

const conversationMutations = (write: InboxWrite) => ({
  assign: (id: Id<"supportConversations">, assignedTo: string | undefined) =>
    withFailureToast(
      () => write.assignConversation({ assignedTo, id }),
      "Couldn’t change the assignee. Try again."
    ),
  updateStatus: (id: Id<"supportConversations">, status: ConversationStatus) =>
    withFailureToast(
      () => write.updateStatus({ id, status }),
      "Couldn’t update the status. Try again."
    ),
});

export function useInboxActions(inbox: InboxState) {
  const { conversations, selectedId, viewerId, write } = inbox;
  const { assign, updateStatus } = conversationMutations(write);

  const changeStatus = async (status: ConversationStatus) => {
    if (selectedId) {
      await updateStatus(selectedId, status);
    }
  };

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

  const selectedConversationActions = {
    onAssign: async (memberId: string | undefined) => {
      if (selectedId) {
        await assign(selectedId, memberId);
      }
    },
    onSendMessage: async (body: string) => {
      if (selectedId) {
        await write.sendMessage({ body, conversationId: selectedId });
      }
    },
    onStatusChange: changeStatus,
  };

  const quickActions = {
    onAssignToMe: (id: Id<"supportConversations">) =>
      viewerId ? assign(id, viewerId) : undefined,
    onStatusChange: updateStatus,
  };

  return {
    moveSelection,
    quickActions,
    selectedConversationActions,
  };
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
