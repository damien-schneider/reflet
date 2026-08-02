"use client";

import { ArrowLeft, CheckCircle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { H1, Lead, Muted } from "@/components/ui/typography";
import { ConversationComposer } from "@/features/support/components/conversation-composer";
import { ConversationList } from "@/features/support/components/conversation-list";
import { SupportLoadingState } from "@/features/support/components/support-loading-state";
import { SupportThread } from "@/features/support/components/support-thread";
import { SupportUnavailable } from "@/features/support/components/support-unavailable";
import { useGuestSession } from "@/features/support/hooks/use-guest-session";
import { authClient } from "@/lib/auth-client";

interface SupportCenterProps {
  backHref: string;
  org: { _id: Id<"organizations">; slug: string } | null | undefined;
}

export function SupportCenter({ backHref, org }: SupportCenterProps) {
  const { data: session } = authClient.useSession();
  const isGuest = !session?.user;

  const orgSlug = org?.slug ?? "";
  const { guestEmail, guestId, saveGuestSession } = useGuestSession(orgSlug);
  const [pendingEmail, setPendingEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [openConversationId, setOpenConversationId] =
    useState<Id<"supportConversations"> | null>(null);

  const supportSettings = useQuery(
    api.support.settings.get,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const userConversations = useQuery(
    api.support.conversations.listForUser,
    org?._id && !isGuest ? { organizationId: org._id } : "skip"
  );

  const guestConversations = useQuery(
    api.support.conversations.listForGuest,
    org?._id && isGuest && guestId
      ? { guestId, organizationId: org._id }
      : "skip"
  );

  const createConversation = useMutation(api.support.conversations.create);

  const conversations = isGuest ? guestConversations : userConversations;
  const email = pendingEmail || guestEmail || "";

  if (org === undefined || supportSettings === undefined) {
    return <SupportLoadingState />;
  }

  if (org === null) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <H1 variant="page">Organization not found</H1>
        <Muted className="mt-2">
          This support page doesn&apos;t exist or is no longer available.
        </Muted>
      </div>
    );
  }

  if (!supportSettings?.supportEnabled) {
    return <SupportUnavailable backHref={backHref} />;
  }

  const handleSubmit = async (data: {
    subject: string;
    message: string;
    email?: string;
  }) => {
    if (!data.message.trim()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const guestArgs = isGuest
        ? {
            guestEmail: data.email ?? email,
            guestId: saveGuestSession(data.email ?? email),
          }
        : {};

      const conversationId = await createConversation({
        ...guestArgs,
        initialMessage: data.message,
        organizationId: org._id,
        subject: data.subject || undefined,
      });
      setOpenConversationId(conversationId);
    } catch {
      setSubmitError("Your message could not be sent. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (openConversationId) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <Button
          className="mb-4"
          onClick={() => setOpenConversationId(null)}
          size="sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
          All conversations
        </Button>
        <SupportThread
          conversationId={openConversationId}
          guestId={guestId ?? undefined}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <H1 variant="page">Contact Support</H1>
        <Lead>Get help from our team</Lead>
      </div>

      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <ConversationComposer
          alwaysExpanded
          guestEmail={email}
          isGuest={isGuest}
          isSubmitting={isSubmitting}
          onGuestEmailChange={setPendingEmail}
          onSubmit={handleSubmit}
        />

        {submitError && (
          <p className="text-destructive text-sm" role="alert">
            {submitError}
          </p>
        )}

        {conversations && conversations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your conversations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ConversationList
                conversations={conversations}
                onSelect={(conversation) =>
                  setOpenConversationId(conversation._id)
                }
              />
            </CardContent>
          </Card>
        )}

        {conversations?.length === 0 && (
          <p className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <CheckCircle className="h-4 w-4" />
            Replies from the team will show up here.
          </p>
        )}
      </div>
    </div>
  );
}
