"use client";

import { ChatCircle } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";

import { Card, CardContent } from "@/components/ui/card";
import { H2, H3, Muted, Text } from "@/components/ui/typography";
import { AssignMemberDropdown } from "@/features/inbox/components/assign-member-dropdown";
import { InlineStatusButtons } from "@/features/inbox/components/inline-status-buttons";
import { MessageInput } from "@/features/inbox/components/message-input";
import { MessageList } from "@/features/inbox/components/message-list";

type ConversationStatus = "open" | "awaiting_reply" | "resolved" | "closed";

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
  assignedTo?: string;
  guestEmail?: string;
  status: string;
  subject?: string;
  user?: { name?: string; email?: string };
}

interface AdminConversationViewProps {
  conversation: Conversation;
  messages: Message[];
  messagesLoading: boolean;
  onAssign: (memberId: string | undefined) => Promise<void>;
  onSendMessage: (body: string) => Promise<void>;
  onStatusChange: (status: ConversationStatus) => Promise<void>;
  teamMembers: TeamMember[];
}

export function AdminConversationView({
  conversation,
  messages,
  messagesLoading,
  teamMembers,
  onSendMessage,
  onStatusChange,
  onAssign,
}: AdminConversationViewProps) {
  const isConversationClosed =
    conversation.status === "closed" || conversation.status === "resolved";

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
            onAssign={onAssign}
          />

          <InlineStatusButtons
            currentStatus={conversation.status}
            onStatusChange={onStatusChange}
          />
        </div>
      </div>

      <MessageList isLoading={messagesLoading} messages={messages} />

      <MessageInput
        autoFocus
        disabled={isConversationClosed}
        onSend={onSendMessage}
        placeholder="Type your reply..."
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
    <div className="flex flex-1 items-center justify-center">
      <Card>
        <CardContent className="py-12 text-center">
          <ChatCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <H3 className="mb-2" variant="card">
            {hasConversations ? "Select a conversation" : "No conversations"}
          </H3>
          <Muted>
            {hasConversations
              ? "Choose a conversation from the sidebar to view messages"
              : "No support requests have been submitted yet."}
          </Muted>
        </CardContent>
      </Card>
    </div>
  );
}
