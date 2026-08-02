"use client";

import { ChatCircle } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { RefObject } from "react";

import { H2, H3, Muted, Text } from "@/components/ui/typography";
import { AssignMemberDropdown } from "@/features/inbox/components/assign-member-dropdown";
import { InlineStatusButtons } from "@/features/inbox/components/inline-status-buttons";
import { MessageInput } from "@/features/support/components/message-input";
import { MessageList } from "@/features/support/components/message-list";
import {
  type ConversationStatus,
  isConversationEditable,
  isConversationStatus,
} from "@/features/support/lib/conversation-status";

interface TeamMember {
  email: string;
  id: string;
  image?: string;
  name?: string;
}

interface Message {
  _id: Id<"supportMessages">;
  body: string;
  createdAt: number;
  isOwnMessage: boolean;
  isRead: boolean;
  senderId: string;
  senderType: "user" | "admin";
}

interface Conversation {
  _id: Id<"supportConversations">;
  assignedTo?: string;
  guestEmail?: string;
  status: string;
  subject?: string;
  user?: { name?: string; email?: string };
}

interface AdminConversationViewProps {
  actions: {
    onAssign: (memberId: string | undefined) => Promise<void>;
    onSendMessage: (body: string) => Promise<void>;
    onStatusChange: (status: ConversationStatus) => Promise<void>;
  };
  conversation: Conversation;
  messages: Message[] | undefined;
  replyRef?: RefObject<HTMLTextAreaElement | null>;
  teamMembers: TeamMember[];
}

export function AdminConversationView({
  conversation,
  messages,
  teamMembers,
  actions,
  replyRef,
}: AdminConversationViewProps) {
  const canReply =
    isConversationStatus(conversation.status) &&
    isConversationEditable(conversation.status);

  return (
    <>
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <H2 variant="card">
            {conversation.subject || "Support Conversation"}
          </H2>
          <Text variant="bodySmall">
            From:{" "}
            {conversation.user?.name ??
              conversation.guestEmail ??
              conversation.user?.email ??
              "Unknown User"}
            {conversation.guestEmail && !conversation.user?.name && (
              <span className="ml-1 text-muted-foreground">(guest)</span>
            )}
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <AssignMemberDropdown
            assignedTo={conversation.assignedTo}
            members={teamMembers}
            onAssign={actions.onAssign}
          />

          <InlineStatusButtons
            currentStatus={conversation.status}
            onStatusChange={actions.onStatusChange}
          />
        </div>
      </div>

      <MessageList conversationId={conversation._id} messages={messages} />

      <MessageInput
        autoFocus
        disabled={!canReply}
        onSend={actions.onSendMessage}
        placeholder={
          canReply ? "Type your reply..." : "Reopen this conversation to reply"
        }
        ref={replyRef}
      />
    </>
  );
}

interface EmptyConversationStateProps {
  hasConversations: boolean;
}

export function EmptyConversationState({
  hasConversations,
}: EmptyConversationStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <ChatCircle className="h-12 w-12 text-muted-foreground" />
      <H3>{hasConversations ? "Select a conversation" : "No conversations"}</H3>
      <Muted>
        {hasConversations
          ? "Choose a conversation from the sidebar to view messages"
          : "No support requests have been submitted yet."}
      </Muted>
    </div>
  );
}
