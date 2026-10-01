"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@ctrl-ui/react/ui/empty";
import { Kbd } from "@ctrl-ui/react/ui/kbd";
import {
  ArrowCounterClockwise,
  ChatCircle,
  Check,
} from "@phosphor-icons/react";
import type { api } from "@reflet/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { useRef } from "react";
import { AssignMemberDropdown } from "@/features/inbox/components/conversation/assign-member-dropdown";
import type { TeamMember } from "@/features/inbox/hooks/use-inbox";
import { ConversationStatusBadge } from "@/features/support/components/conversation-status-badge";
import { MessageComposer } from "@/features/support/components/thread/message-composer";
import { MessageThread } from "@/features/support/components/thread/message-thread";
import type { SupportMessageData } from "@/features/support/components/thread/support-message";
import {
  acceptsReplies,
  type ConversationStatus,
} from "@/features/support/lib/conversation-status";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

type ConversationDetail = NonNullable<
  FunctionReturnType<typeof api.support.conversations.get>
>;

interface ConversationControls {
  actions: {
    onAssign: (memberId: string | undefined) => Promise<void>;
    onSendMessage: (body: string) => Promise<void>;
    onStatusChange: (status: ConversationStatus) => Promise<void>;
  };
  members: TeamMember[];
}

interface AdminConversationViewProps {
  controls: ConversationControls;
  conversation: ConversationDetail;
  messages: SupportMessageData[] | undefined;
}

export function AdminConversationView({
  controls,
  conversation,
  messages,
}: AdminConversationViewProps) {
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const canReply = acceptsReplies(conversation.status);

  const { onStatusChange } = controls.actions;
  useKeyboardShortcuts({
    r: () => replyRef.current?.focus(),
    ...(canReply && {
      c: () => onStatusChange("closed"),
      e: () => onStatusChange("resolved"),
    }),
  });

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <ConversationHeader
        canReply={canReply}
        controls={controls}
        conversation={conversation}
      />
      <MessageThread
        composer={
          <MessageComposer
            field={{
              disabledReason: canReply
                ? undefined
                : "Reopen this conversation to reply",
              label: "Reply",
              placeholder: "Write a reply…",
            }}
            key={conversation._id}
            onSend={controls.actions.onSendMessage}
            ref={replyRef}
          />
        }
        conversation={{ id: conversation._id }}
        key={conversation._id}
        messages={messages}
      />
    </div>
  );
}

function ConversationHeader({
  canReply,
  controls,
  conversation,
}: {
  canReply: boolean;
  controls: ConversationControls;
  conversation: ConversationDetail;
}) {
  const title = conversation.subject || "Support conversation";
  const name = conversation.user?.name;
  const email = conversation.user?.email ?? conversation.guestEmail;

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-5 py-3">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate font-semibold text-body" title={title}>
            {title}
          </h2>
          <ConversationStatusBadge status={conversation.status} viewer="team" />
        </div>
        <p className="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
          <span className="truncate">
            {name ? `${name} · ${email ?? ""}` : (email ?? "Unknown visitor")}
          </span>
          {conversation.guestId && (
            <Badge color="neutral" size="sm">
              Guest
            </Badge>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <AssignMemberDropdown
          assignedTo={conversation.assignedTo}
          members={controls.members}
          onAssign={controls.actions.onAssign}
        />
        <StatusActions
          canReply={canReply}
          onStatusChange={controls.actions.onStatusChange}
        />
      </div>
    </header>
  );
}

function StatusActions({
  canReply,
  onStatusChange,
}: {
  canReply: boolean;
  onStatusChange: (status: ConversationStatus) => Promise<void>;
}) {
  if (!canReply) {
    return (
      <Button
        onClick={() => onStatusChange("open")}
        size="sm"
        variant="surface"
      >
        <ArrowCounterClockwise aria-hidden />
        Reopen
      </Button>
    );
  }

  return (
    <>
      <Button
        aria-keyshortcuts="C"
        onClick={() => onStatusChange("closed")}
        size="sm"
        variant="ghost"
      >
        Close
      </Button>
      <Button
        aria-keyshortcuts="E"
        onClick={() => onStatusChange("resolved")}
        size="sm"
        tone="primary"
        variant="solid"
      >
        <Check aria-hidden />
        Resolve
        <Kbd aria-hidden className="max-sm:hidden">
          E
        </Kbd>
      </Button>
    </>
  );
}

export function SelectConversationPrompt() {
  return (
    <Empty className="m-4 flex-1">
      <EmptyHeader>
        <EmptyMedia>
          <ChatCircle aria-hidden />
        </EmptyMedia>
        <EmptyTitle>Select a conversation</EmptyTitle>
        <EmptyDescription>
          Pick a conversation to read and reply. Use J and K to move between
          them.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
