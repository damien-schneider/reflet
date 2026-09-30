"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@ctrl-ui/react/ui/avatar";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { ScrollArea } from "@ctrl-ui/react/ui/scroll-area";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { ChatCircle } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { format, formatDistanceToNowStrict } from "date-fns";
import { type ReactNode, useEffect, useRef } from "react";
import { HoverQuickActions } from "@/features/inbox/components/hover-quick-actions";
import { ConversationStatusBadge } from "@/features/support/components/conversation-status-badge";
import { getInitials } from "@/lib/initials";
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
  emptyState?: ReactNode;
  isAdmin?: boolean;
  onSelect: (conversation: ConversationSummary) => void;
  quickActions?: QuickActions;
  selectedId?: Id<"supportConversations">;
}

const MAX_DISPLAYED_UNREAD = 99;

function UnreadCount({ count }: { count: number }) {
  return (
    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 font-medium text-brand-foreground text-caption tabular-nums">
      <span>
        {count > MAX_DISPLAYED_UNREAD ? `${MAX_DISPLAYED_UNREAD}+` : count}
      </span>
      <span className="sr-only"> unread</span>
    </span>
  );
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
  const displayName = user?.name || user?.email || "Unknown user";
  const unreadCount = isAdmin
    ? conversation.adminUnreadCount
    : conversation.userUnreadCount;
  const hasUnread = unreadCount > 0;
  const lastMessageDate = new Date(conversation.lastMessageAt);

  useEffect(() => {
    if (isActive) {
      rowRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [isActive]);

  return (
    <li
      className={cn(
        "group/conversation relative rounded-lg hover:bg-accent",
        hasUnread && "bg-accent/50",
        isSelected && "bg-accent",
        isActive && "ring-2 ring-ring"
      )}
      data-active={isActive}
      ref={rowRef}
    >
      <button
        aria-current={isSelected ? "true" : undefined}
        className="flex w-full items-start gap-3 rounded-lg p-3 text-left"
        onClick={onSelect}
        type="button"
      >
        <Avatar className="size-10">
          <AvatarImage alt="" src={user?.image} />
          <AvatarFallback>
            {getInitials(user?.name, user?.email)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={cn(
                "truncate text-sm",
                hasUnread ? "font-semibold" : "font-medium"
              )}
              title={displayName}
            >
              {displayName}
            </span>
            <time
              className="shrink-0 text-caption text-muted-foreground tabular-nums"
              dateTime={lastMessageDate.toISOString()}
              title={format(lastMessageDate, "PPpp")}
            >
              {formatDistanceToNowStrict(lastMessageDate)}
            </time>
          </div>

          {conversation.subject && (
            <p
              className={cn(
                "mt-0.5 truncate text-xs",
                hasUnread ? "text-foreground" : "text-muted-foreground"
              )}
              title={conversation.subject}
            >
              {conversation.subject}
            </p>
          )}

          {conversation.lastMessagePreview && (
            <p
              className="mt-0.5 truncate text-muted-foreground text-xs"
              title={conversation.lastMessagePreview}
            >
              {conversation.lastMessagePreview}
            </p>
          )}

          <div className="mt-1.5 flex items-center gap-2">
            <ConversationStatusBadge
              showIcon={false}
              status={conversation.status}
            />
            {hasUnread && <UnreadCount count={unreadCount} />}
          </div>
        </div>
      </button>

      {isAdmin && quickActions && (
        <HoverQuickActions
          className="absolute right-2 bottom-2"
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
    <div className={cn("flex flex-1 flex-col", className)} role="status">
      <span className="sr-only">Loading conversations…</span>
      <ul aria-hidden className="space-y-1 p-2">
        {SKELETON_ROWS.map((row) => (
          <li className="flex items-start gap-3 p-3" key={row}>
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2 pt-0.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConversationListEmpty({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <ChatCircle aria-hidden />
        </EmptyMedia>
        <EmptyTitle>No conversations</EmptyTitle>
        <EmptyDescription>
          {isAdmin
            ? "No support requests yet"
            : "Start a new conversation to get help"}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function ConversationList({
  conversations,
  selectedId,
  activeId,
  onSelect,
  isAdmin = false,
  className,
  emptyState,
  quickActions,
}: ConversationListProps) {
  if (!conversations) {
    return <ConversationListSkeleton className={className} />;
  }

  if (conversations.length === 0) {
    return (
      <div className={cn("flex flex-1 items-center justify-center", className)}>
        {emptyState ?? <ConversationListEmpty isAdmin={isAdmin} />}
      </div>
    );
  }

  return (
    <ScrollArea className={cn("flex-1", className)}>
      <ul aria-label="Conversations" className="space-y-1 p-2">
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
