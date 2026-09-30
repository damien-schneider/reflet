"use client";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { ChatCircle } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { RefObject } from "react";

import { H2, Text } from "@/components/ui/typography";
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
  const title = conversation.subject || "Support conversation";
  const senderName =
    conversation.user?.name ??
    conversation.guestEmail ??
    conversation.user?.email ??
    "Unknown user";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div className="min-w-0">
          <H2 className="truncate" title={title} variant="card">
            {title}
          </H2>
          <Text className="truncate text-muted-foreground" variant="bodySmall">
            From: {senderName}
            {conversation.guestEmail && !conversation.user?.name && (
              <span className="ml-1">(guest)</span>
            )}
          </Text>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

      <MessageList
        conversationId={conversation._id}
        key={conversation._id}
        messages={messages}
      />

      <MessageInput
        disabled={!canReply}
        key={`reply-${conversation._id}`}
        label="Reply"
        onSend={actions.onSendMessage}
        placeholder={
          canReply ? "Write a reply…" : "Reopen this conversation to reply"
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
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <ChatCircle aria-hidden />
        </EmptyMedia>
        <EmptyTitle>
          {hasConversations ? "Select a conversation" : "No conversations"}
        </EmptyTitle>
        <EmptyDescription>
          {hasConversations
            ? "Pick a conversation from the list to read and reply."
            : "No support requests have been submitted yet."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
