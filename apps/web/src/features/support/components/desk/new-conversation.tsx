"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { ConversationComposer } from "@/features/support/components/desk/conversation-composer";
import type { GuestSession } from "@/features/support/hooks/use-guest-session";

interface NewConversationProps {
  flow: {
    onCancel?: () => void;
    onStarted: (conversationId: Id<"supportConversations">) => void;
  };
  guestSession: GuestSession | null;
  organizationId: Id<"organizations">;
}

export function NewConversation({
  flow,
  guestSession,
  organizationId,
}: NewConversationProps) {
  const createConversation = useMutation(api.support.conversations.create);
  const [pendingEmail, setPendingEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const email = pendingEmail || guestSession?.guestEmail || "";

  const startConversation = async (draft: {
    email?: string;
    message: string;
    subject: string;
  }) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const guestEmail = draft.email ?? email;
      const conversationId = await createConversation({
        ...(guestSession
          ? { guestEmail, guestId: guestSession.saveGuestSession(guestEmail) }
          : {}),
        initialMessage: draft.message,
        organizationId,
        subject: draft.subject || undefined,
      });
      flow.onStarted(conversationId);
    } catch {
      setSubmitError("Message not sent. Check your connection and try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium text-body">New message</h2>
        {flow.onCancel && (
          <Button onClick={flow.onCancel} size="sm" variant="ghost">
            Cancel
          </Button>
        )}
      </div>
      <ConversationComposer
        error={submitError}
        guestEmail={email}
        isGuest={guestSession !== null}
        isSubmitting={isSubmitting}
        onGuestEmailChange={setPendingEmail}
        onSubmit={startConversation}
      />
    </section>
  );
}
