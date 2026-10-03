"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Button } from "@ctrl-ui/react/ui/button";
import { Card } from "@ctrl-ui/react/ui/card";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { PencilSimpleLine } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { type ComponentProps, useState } from "react";
import {
  ConversationList,
  type CustomerConversation,
} from "@/features/support/components/conversation-list";
import { NewConversation } from "@/features/support/components/desk/new-conversation";
import { SupportThread } from "@/features/support/components/desk/support-thread";
import { useGuestSession } from "@/features/support/hooks/use-guest-session";

type DeskSurface = "page" | "panel";
interface DeskOrg {
  _id: Id<"organizations">;
  slug: string;
}
type ConversationId = Id<"supportConversations">;

interface SupportDeskProps {
  isGuest: boolean;
  org: DeskOrg;
  surface: DeskSurface;
}

function useDeskConversations(isGuest: boolean, org: DeskOrg) {
  const guestSession = useGuestSession(org.slug);
  const { guestId } = guestSession;
  const userConversations = useQuery(
    api.support.conversations.listForUser,
    isGuest ? "skip" : { organizationId: org._id }
  );
  const guestConversations = useQuery(
    api.support.conversations.listForGuest,
    isGuest && guestId ? { guestId, organizationId: org._id } : "skip"
  );

  if (!isGuest) {
    return { conversations: userConversations, guestSession: null };
  }
  return {
    conversations: guestId ? guestConversations : [],
    guestSession,
  };
}

export function SupportDesk({ isGuest, org, surface }: SupportDeskProps) {
  const { conversations, guestSession } = useDeskConversations(isGuest, org);
  const [openId, setOpenId] = useState<ConversationId | null>(null);

  if (openId) {
    const thread = (
      <SupportThread
        conversationId={openId}
        guestId={guestSession?.guestId ?? undefined}
        onBack={() => setOpenId(null)}
      />
    );
    return surface === "page" ? (
      <Card className="flex h-[min(75dvh,48rem)] flex-col overflow-hidden p-0">
        {thread}
      </Card>
    ) : (
      thread
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        surface === "panel" && "min-h-0 flex-1 overflow-y-auto p-4"
      )}
    >
      {conversations === undefined ? (
        <DeskLoading />
      ) : (
        <DeskHome
          conversations={conversations}
          newConversation={{ guestSession, organizationId: org._id }}
          onOpen={setOpenId}
        />
      )}
    </div>
  );
}

function DeskHome({
  conversations,
  newConversation,
  onOpen,
}: {
  conversations: CustomerConversation[];
  newConversation: Omit<ComponentProps<typeof NewConversation>, "flow">;
  onOpen: (conversationId: ConversationId) => void;
}) {
  const [isComposing, setIsComposing] = useState(false);
  const hasHistory = conversations.length > 0;

  if (isComposing || !hasHistory) {
    return (
      <NewConversation
        {...newConversation}
        flow={{
          onCancel: hasHistory ? () => setIsComposing(false) : undefined,
          onStarted: onOpen,
        }}
      />
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium text-body">Your conversations</h2>
        <Button
          onClick={() => setIsComposing(true)}
          size="sm"
          variant="surface"
        >
          <PencilSimpleLine aria-hidden />
          New message
        </Button>
      </div>
      <ConversationList conversations={conversations} onSelect={onOpen} />
    </section>
  );
}

function DeskLoading() {
  return (
    <div className="flex flex-col gap-3" role="status">
      <span className="sr-only">Loading conversations…</span>
      <Skeleton aria-hidden className="h-5 w-40" />
      <Skeleton aria-hidden className="h-16 w-full" />
      <Skeleton aria-hidden className="h-16 w-full" />
    </div>
  );
}
