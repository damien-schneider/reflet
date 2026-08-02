"use client";

import { ChatCircle } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useRef } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Text } from "@/components/ui/typography";
import { HoverQuickActions } from "@/features/inbox/components/hover-quick-actions";
import { ConversationStatusBadge } from "@/features/support/components/conversation-status-badge";
import { getInitials } from "@/features/support/lib/initials";
import { cn } from "@/lib/utils";

interface ConversationUser {
  email: string;
  image?: string;
  name?: string;
}

export interface ConversationSummary {
  _id: Id<"supportConversations">;
  adminUnreadCount: number;
  lastMessageAt: number;
  lastMessagePreview?: string;
  status: string;
  subject?: string;
  user?: ConversationUser;
  userUnreadCount: number;
}

interface QuickActions {
  onAssign: (conversationId: Id<"supportConversations">) => void;
  onClose: (conversationId: Id<"supportConversations">) => void;
  onResolve: (conversationId: Id<"supportConversations">) => void;
}

interface ConversationListProps {
  activeId?: Id<"supportConversations">;
  className?: string;
  conversations: ConversationSummary[] | undefined;
  isAdmin?: boolean;
  onSelect: (conversation: ConversationSummary) => void;
  quickActions?: QuickActions;
  selectedId?: Id<"supportConversations">;
}

function ConversationRow({
  conversation,
  isSelected,
  isActive,
  isAdmin,
  onSelect,
  quickActions,
}: {
  conversation: ConversationSummary;
  isSelected: boolean;
  isActive: boolean;
  isAdmin: boolean;
  onSelect: () => void;
  quickActions?: QuickActions;
}) {
  const rowRef = useRef<HTMLLIElement>(null);
  const user = conversation.user;
  const displayName = user?.name || user?.email || "Unknown User";
  const unreadCount = isAdmin
    ? conversation.adminUnreadCount
    : conversation.userUnreadCount;
  const hasUnread = unreadCount > 0;

  useEffect(() => {
    if (isActive) {
      rowRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [isActive]);

  return (
    <li
      className={cn(
        "group/conversation relative rounded-lg transition-colors hover:bg-accent",
        isSelected && "bg-accent",
        isActive && "ring-2 ring-ring",
        hasUnread && !isSelected && "bg-accent/50"
      )}
      data-active={isActive}
      ref={rowRef}
    >
      <button
        className="flex w-full items-start gap-3 rounded-lg p-3 text-left"
        onClick={onSelect}
        type="button"
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage alt={displayName} src={user?.image} />
          <AvatarFallback>
            {getInitials(user?.name, user?.email)}
          </AvatarFallback>
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
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatDistanceToNow(conversation.lastMessageAt, {
                addSuffix: false,
              })}
            </span>
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

      {isAdmin && quickActions && (
        <HoverQuickActions
          className="absolute top-2 right-2"
          onAssignToMe={() => quickActions.onAssign(conversation._id)}
          onClose={() => quickActions.onClose(conversation._id)}
          onResolve={() => quickActions.onResolve(conversation._id)}
        />
      )}
    </li>
  );
}

const SKELETON_ROWS = ["one", "two", "three", "four", "five"];

function ConversationListSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-1 flex-col", className)}>
      <div className="space-y-2 p-2">
        {SKELETON_ROWS.map((row) => (
          <div
            className="flex animate-pulse items-start gap-3 rounded-lg p-3"
            key={row}
          >
            <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConversationList({
  conversations,
  selectedId,
  activeId,
  onSelect,
  isAdmin = false,
  className,
  quickActions,
}: ConversationListProps) {
  if (!conversations) {
    return <ConversationListSkeleton className={className} />;
  }

  if (conversations.length === 0) {
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
      <ul className="space-y-1 p-2">
        {conversations.map((conversation) => (
          <ConversationRow
            conversation={conversation}
            isActive={activeId === conversation._id}
            isAdmin={isAdmin}
            isSelected={selectedId === conversation._id}
            key={conversation._id}
            onSelect={() => onSelect(conversation)}
            quickActions={quickActions}
          />
        ))}
      </ul>
    </ScrollArea>
  );
}
