"use client";

import { ChatCircle } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import { ConversationStatusBadge } from "./conversation-status-badge";

interface ConversationUser {
  name?: string;
  email: string;
  image?: string;
}

interface Conversation {
  _id: string;
  subject?: string;
  status: string;
  lastMessageAt?: number;
  userUnreadCount: number;
  adminUnreadCount: number;
  user?: ConversationUser;
  lastMessagePreview?: string;
}

interface ConversationListProps {
  conversations: Conversation[] | undefined;
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
  isLoading?: boolean;
  isAdmin?: boolean;
  className?: string;
}

const INITIALS_SPLIT_PATTERN = /[\s@]/;

function getInitials(name?: string, email?: string): string {
  const source = name || email || "?";
  return source
    .split(INITIALS_SPLIT_PATTERN)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function ConversationItem({
  conversation,
  isSelected,
  onSelect,
  isAdmin,
}: {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  isAdmin: boolean;
}) {
  const user = conversation.user;
  const displayName = user?.name || user?.email || "Unknown User";
  const initials = getInitials(user?.name, user?.email);
  const unreadCount = isAdmin
    ? conversation.adminUnreadCount
    : conversation.userUnreadCount;
  const hasUnread = unreadCount > 0;

  return (
    <button
      className={cn(
        "flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent",
        isSelected && "bg-accent",
        hasUnread && "bg-accent/50"
      )}
      onClick={onSelect}
      type="button"
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage alt={displayName} src={user?.image} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm",
              hasUnread ? "font-semibold" : "font-medium"
            )}
          >
            {displayName}
          </span>
          {conversation.lastMessageAt && (
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatDistanceToNow(conversation.lastMessageAt, {
                addSuffix: false,
              })}
            </span>
          )}
        </div>

        {conversation.subject && (
          <p
            className={cn(
              "mt-0.5 truncate text-xs",
              hasUnread ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {conversation.subject}
          </p>
        )}

        {conversation.lastMessagePreview && (
          <Text className="mt-0.5 line-clamp-1" variant="caption">
            {conversation.lastMessagePreview}
          </Text>
        )}

        <div className="mt-1.5 flex items-center gap-2">
          <ConversationStatusBadge
            showIcon={false}
            status={conversation.status}
          />
          {hasUnread && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-olive-500 px-1.5 font-medium text-[10px] text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
  isAdmin = false,
  className,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className={cn("flex flex-1 flex-col", className)}>
        <div className="space-y-2 p-2">
          {Array.from({ length: 5 }).map((_, index) => {
            const skeletonId = `conversation-skeleton-${index}`;
            return (
              <div
                className="flex animate-pulse items-start gap-3 rounded-lg p-3"
                key={skeletonId}
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className={cn("flex flex-1 items-center justify-center", className)}>
        <div className="flex flex-col items-center gap-3 p-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ChatCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <Text variant="label">No conversations</Text>
            <Text className="mt-0.5" variant="caption">
              {isAdmin
                ? "No support requests yet"
                : "Start a new conversation to get help"}
            </Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className={cn("flex-1", className)}>
      <div className="space-y-1 p-2">
        {conversations.map((conversation) => (
          <ConversationItem
            conversation={conversation}
            isAdmin={isAdmin}
            isSelected={selectedId === conversation._id}
            key={conversation._id}
            onSelect={() => onSelect(conversation)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
