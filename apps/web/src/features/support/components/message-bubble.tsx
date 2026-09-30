"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@ctrl-ui/react/ui/avatar";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { format } from "date-fns";
import { getInitials } from "@/features/support/lib/initials";
import { cn } from "@/lib/utils";

const REACTION_CHIP =
  "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs";

interface MessageSender {
  email?: string;
  id?: string;
  image?: string;
  name?: string;
}

interface MessageReaction {
  count: number;
  emoji: string;
  userIds: string[];
}

interface MessageBubbleProps {
  body: string;
  currentUserId?: string;
  isOwnMessage: boolean;
  messageId?: Id<"supportMessages">;
  onAddReaction?: (messageId: Id<"supportMessages">, emoji: string) => void;
  onRemoveReaction?: (messageId: Id<"supportMessages">) => void;
  reactions?: MessageReaction[];
  sender?: MessageSender;
  senderType: "user" | "admin";
  showAvatar?: boolean;
  showTimestamp?: boolean;
  timestamp?: number;
}

export function MessageBubble({
  body,
  sender,
  isOwnMessage,
  senderType,
  timestamp,
  showAvatar = true,
  showTimestamp = false,
  messageId,
  reactions = [],
  onAddReaction,
  onRemoveReaction,
  currentUserId,
}: MessageBubbleProps) {
  const initials = getInitials(sender?.name, sender?.email);
  const displayName = sender?.name || sender?.email || "Unknown";

  const handleReactionClick = (emoji: string) => {
    if (!(messageId && onAddReaction && onRemoveReaction)) {
      return;
    }

    const reaction = reactions.find((r) => r.emoji === emoji);
    const hasUserReacted = reaction?.userIds.includes(currentUserId ?? "");

    if (hasUserReacted) {
      onRemoveReaction(messageId);
    } else {
      onAddReaction(messageId, emoji);
    }
  };

  return (
    <div
      className={cn(
        "group flex w-full gap-2.5",
        isOwnMessage ? "flex-row-reverse" : "flex-row"
      )}
    >
      {showAvatar ? (
        <Avatar className="size-8">
          <AvatarImage alt="" src={sender?.image} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      ) : (
        <div aria-hidden className="w-8 shrink-0" />
      )}

      <div
        className={cn(
          "flex max-w-[75%] flex-col gap-1",
          isOwnMessage ? "items-end" : "items-start"
        )}
      >
        {showAvatar && (
          <SenderLabel
            displayName={displayName}
            isAdmin={senderType === "admin"}
            isOwnMessage={isOwnMessage}
          />
        )}

        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isOwnMessage
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md bg-muted text-foreground"
          )}
        >
          <p className="whitespace-pre-wrap break-words">{body}</p>

          {messageId && onAddReaction ? (
            <MessageReactions
              currentUserId={currentUserId}
              isOwnMessage={isOwnMessage}
              onReactionClick={handleReactionClick}
              reactions={reactions}
            />
          ) : null}
        </div>

        {showTimestamp && timestamp ? (
          <time
            className="text-caption text-muted-foreground tabular-nums"
            dateTime={new Date(timestamp).toISOString()}
            title={format(timestamp, "PPpp")}
          >
            {format(timestamp, "hh:mm a")}
          </time>
        ) : null}
      </div>
    </div>
  );
}

function SenderLabel({
  displayName,
  isAdmin,
  isOwnMessage,
}: {
  displayName: string;
  isAdmin: boolean;
  isOwnMessage: boolean;
}) {
  return (
    <span
      className={cn(
        "text-muted-foreground text-xs",
        isOwnMessage ? "text-right" : "text-left"
      )}
    >
      {isOwnMessage ? "You" : displayName}
      {isAdmin && !isOwnMessage && (
        <span className="ml-1 text-brand-text">(Support)</span>
      )}
    </span>
  );
}

interface MessageReactionsProps {
  currentUserId?: string;
  isOwnMessage: boolean;
  onReactionClick: (emoji: string) => void;
  reactions: MessageReaction[];
}

function MessageReactions({
  currentUserId,
  isOwnMessage,
  onReactionClick,
  reactions,
}: MessageReactionsProps) {
  const chipTone = isOwnMessage
    ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
    : "bg-muted-foreground/10 text-foreground hover:bg-muted-foreground/20";
  const reactedRing = isOwnMessage
    ? "ring-2 ring-primary-foreground/50"
    : "ring-2 ring-primary";

  return (
    <>
      {reactions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {reactions.map((reaction) => {
            const hasUserReacted = reaction.userIds.includes(
              currentUserId ?? ""
            );
            return (
              <button
                aria-pressed={hasUserReacted}
                className={cn(
                  REACTION_CHIP,
                  chipTone,
                  hasUserReacted && reactedRing
                )}
                key={reaction.emoji}
                onClick={() => onReactionClick(reaction.emoji)}
                type="button"
              >
                <span>{reaction.emoji}</span>
                <span className="font-medium tabular-nums">
                  {reaction.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <button
        className={cn(REACTION_CHIP, "mt-2 self-start", chipTone)}
        onClick={() => onReactionClick("👍")}
        type="button"
      >
        <span aria-hidden>👍</span>
        <span
          className={cn(
            isOwnMessage ? "text-primary-foreground" : "text-muted-foreground"
          )}
        >
          React
        </span>
      </button>
    </>
  );
}
