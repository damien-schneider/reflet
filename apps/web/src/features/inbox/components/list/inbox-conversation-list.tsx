"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Avatar, AvatarFallback, AvatarImage } from "@ctrl-ui/react/ui/avatar";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@ctrl-ui/react/ui/item";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { formatDistanceToNowStrict } from "date-fns";
import { HoverQuickActions } from "@/features/inbox/components/list/hover-quick-actions";
import type { InboxConversation } from "@/features/inbox/hooks/use-inbox";
import { ConversationStatusBadge } from "@/features/support/components/conversation-status-badge";
import { UnreadCount } from "@/features/support/components/unread-count";
import type { ConversationStatus } from "@/features/support/lib/conversation-status";
import { getInitials } from "@/lib/initials";

interface QuickActions {
  onAssignToMe: (id: Id<"supportConversations">) => void;
  onStatusChange: (
    id: Id<"supportConversations">,
    status: ConversationStatus
  ) => void;
}

interface ConversationSelection {
  activeId: Id<"supportConversations"> | null;
  onSelect: (id: Id<"supportConversations">) => void;
}

interface InboxConversationListProps {
  conversations: InboxConversation[];
  quickActions?: QuickActions;
  selection: ConversationSelection;
}

export function InboxConversationList({
  conversations,
  quickActions,
  selection,
}: InboxConversationListProps) {
  return (
    <ul aria-label="Conversations" className="flex flex-col gap-0.5 p-2">
      {conversations.map((conversation) => (
        <ConversationRow
          conversation={conversation}
          key={conversation._id}
          quickActions={quickActions}
          selection={selection}
        />
      ))}
    </ul>
  );
}

function ConversationRow({
  conversation,
  quickActions,
  selection,
}: {
  conversation: InboxConversation;
  quickActions?: QuickActions;
  selection: ConversationSelection;
}) {
  const isActive = conversation._id === selection.activeId;
  const person = conversation.user;
  const displayName = person?.name || person?.email || "Unknown visitor";
  const hasUnread = conversation.adminUnreadCount > 0;
  const title =
    conversation.subject || conversation.lastMessagePreview || "No subject";
  const preview = conversation.subject
    ? conversation.lastMessagePreview
    : undefined;

  return (
    <li
      className="group/conversation relative"
      ref={(node) => {
        if (isActive) {
          node?.scrollIntoView({ block: "nearest" });
        }
      }}
    >
      <Item
        aria-current={isActive ? "true" : undefined}
        className={cn(
          "w-full items-start text-left [--cui-item-hover-background:var(--hover-fill)]",
          isActive && "bg-muted"
        )}
        onClick={() => selection.onSelect(conversation._id)}
        render={<button type="button" />}
      >
        <ItemMedia>
          <Avatar aria-hidden className="size-8">
            {person?.image && <AvatarImage alt="" src={person.image} />}
            <AvatarFallback>
              {getInitials(person?.name, person?.email)}
            </AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent className="min-w-0 gap-0.5">
          <ItemTitle className="w-full justify-between">
            <span className={cn("truncate", hasUnread && "font-semibold")}>
              {displayName}
            </span>
            <time
              className="shrink-0 font-normal text-caption text-muted-foreground tabular-nums"
              dateTime={new Date(conversation.lastMessageAt).toISOString()}
            >
              {formatDistanceToNowStrict(conversation.lastMessageAt)}
            </time>
          </ItemTitle>
          <ItemDescription
            className={cn("truncate", hasUnread && "text-foreground")}
          >
            {title}
          </ItemDescription>
          {preview && (
            <ItemDescription className="truncate">{preview}</ItemDescription>
          )}
          <div className="mt-1 flex items-center gap-2">
            <ConversationStatusBadge
              status={conversation.status}
              viewer="team"
            />
            {hasUnread && <UnreadCount count={conversation.adminUnreadCount} />}
          </div>
        </ItemContent>
      </Item>
      {quickActions && (
        <HoverQuickActions
          actions={{
            onAssignToMe: () => quickActions.onAssignToMe(conversation._id),
            onStatusChange: (status) =>
              quickActions.onStatusChange(conversation._id, status),
          }}
          className="absolute right-2 bottom-2"
          status={conversation.status}
        />
      )}
    </li>
  );
}
