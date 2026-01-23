"use client";

import { ChatCircle } from "@phosphor-icons/react";
import type React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { H2, H3, Muted, Text } from "@/components/ui/typography";
import { AssignMemberDropdown } from "@/features/inbox/components/assign-member-dropdown";
import { ConversationStatusBadge } from "@/features/inbox/components/conversation-status-badge";
import { MessageInput } from "@/features/inbox/components/message-input";
import { MessageList } from "@/features/inbox/components/message-list";

type ConversationStatus = "open" | "awaiting_reply" | "resolved" | "closed";

const STATUS_OPTIONS: { value: ConversationStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "awaiting_reply", label: "Awaiting Reply" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

interface TeamMember {
  id: string;
  name?: string;
  email: string;
  image?: string;
}

interface Message {
  _id: string;
  senderId: string;
  senderType: "user" | "admin";
  body: string;
  isRead: boolean;
  createdAt: number;
  isOwnMessage: boolean;
}

interface Conversation {
  subject?: string;
  status: string;
  assignedTo?: string;
  user?: { name?: string };
}

interface AdminConversationViewProps {
  conversation: Conversation;
  messages: Message[];
  messagesLoading: boolean;
  teamMembers: TeamMember[];
  onSendMessage: (body: string) => Promise<void>;
  onStatusChange: (status: ConversationStatus) => Promise<void>;
  onAssign: (memberId: string | undefined) => Promise<void>;
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
            From: {conversation.user?.name ?? "Unknown User"}
          </Text>
        </div>

        <div className="flex items-center gap-3">
          <AssignMemberDropdown
            assignedTo={conversation.assignedTo}
            members={teamMembers}
            onAssign={onAssign}
          />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={(props: React.ComponentProps<"button">) => (
                <Button {...props} size="sm" variant="outline">
                  <ConversationStatusBadge status={conversation.status} />
                </Button>
              )}
            />
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Change status</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              {STATUS_OPTIONS.map((option) => (
                <DropdownMenuCheckboxItem
                  checked={conversation.status === option.value}
                  key={option.value}
                  onCheckedChange={() => onStatusChange(option.value)}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <MessageList isLoading={messagesLoading} messages={messages} />

      <MessageInput
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
