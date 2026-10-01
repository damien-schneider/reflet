"use client";

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@ctrl-ui/react/ui/item";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ConversationStatusBadge } from "@/features/support/components/conversation-status-badge";
import { UnreadCount } from "@/features/support/components/unread-count";
import { cn } from "@/lib/utils";

export interface CustomerConversation {
  _id: Id<"supportConversations">;
  lastMessageAt: number;
  lastMessagePreview?: string;
  status: string;
  subject?: string;
  userUnreadCount: number;
}

interface ConversationListProps {
  conversations: CustomerConversation[];
  onSelect: (conversationId: Id<"supportConversations">) => void;
}

export function ConversationList({
  conversations,
  onSelect,
}: ConversationListProps) {
  return (
    <ul aria-label="Your conversations" className="flex flex-col">
      {conversations.map((conversation) => {
        const title =
          conversation.subject ||
          conversation.lastMessagePreview ||
          "Support conversation";
        const hasUnread = conversation.userUnreadCount > 0;
        return (
          <li key={conversation._id}>
            <Item
              className="w-full text-left [--cui-item-hover-background:var(--hover-fill)]"
              onClick={() => onSelect(conversation._id)}
              render={<button type="button" />}
            >
              <ItemContent>
                <ItemTitle className="w-full justify-between">
                  <span
                    className={cn("truncate", hasUnread && "font-semibold")}
                  >
                    {title}
                  </span>
                  <time
                    className="shrink-0 font-normal text-caption text-muted-foreground tabular-nums"
                    dateTime={new Date(
                      conversation.lastMessageAt
                    ).toISOString()}
                    title={format(conversation.lastMessageAt, "PPpp")}
                  >
                    {formatDistanceToNowStrict(conversation.lastMessageAt, {
                      addSuffix: true,
                    })}
                  </time>
                </ItemTitle>
                {conversation.subject && conversation.lastMessagePreview && (
                  <ItemDescription className="truncate">
                    {conversation.lastMessagePreview}
                  </ItemDescription>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <ConversationStatusBadge
                    status={conversation.status}
                    viewer="customer"
                  />
                  {hasUnread && (
                    <UnreadCount count={conversation.userUnreadCount} />
                  )}
                </div>
              </ItemContent>
            </Item>
          </li>
        );
      })}
    </ul>
  );
}
