"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import {
  PageBody,
  PageDescription,
  PageHeader,
  PageLayout,
  PageTitle,
} from "@ctrl-ui/react/ui/page-layout";
import { ArrowLeft } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { PublicOrgNotFound } from "@/features/public-org/components/public-org-states";
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
  const supportSettings = useQuery(
    api.support.settings.get,
    org?._id ? { organizationId: org._id } : "skip"
  );

  if (org === undefined || supportSettings === undefined) {
    return <SupportLoadingState />;
  }

  if (org === null) {
    return (
      <PublicOrgNotFound
        description="Check the link, or ask the team that shared it for the right address."
        homeHref="/"
        homeLabel="Go to homepage"
        title="Organization not found"
      />
    );
  }

  if (!supportSettings?.supportEnabled) {
    return <SupportUnavailable backHref={backHref} />;
  }

  return <SupportConversations isGuest={!session?.user} org={org} />;
}

interface SupportConversationsProps {
  isGuest: boolean;
  org: { _id: Id<"organizations">; slug: string };
}

function SupportConversations({ isGuest, org }: SupportConversationsProps) {
  const { guestEmail, guestId, saveGuestSession } = useGuestSession(org.slug);
  const [pendingEmail, setPendingEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [openConversationId, setOpenConversationId] =
    useState<Id<"supportConversations"> | null>(null);

  const userConversations = useQuery(
    api.support.conversations.listForUser,
    isGuest ? "skip" : { organizationId: org._id }
  );
  const guestConversations = useQuery(
    api.support.conversations.listForGuest,
    isGuest && guestId ? { guestId, organizationId: org._id } : "skip"
  );
  const createConversation = useMutation(api.support.conversations.create);

  const conversations = isGuest ? guestConversations : userConversations;
  const email = pendingEmail || guestEmail || "";

  const handleSubmit = async (data: {
    subject: string;
    message: string;
    email?: string;
  }) => {
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
      setSubmitError("Message not sent. Check your connection and try again.");
    }
    setIsSubmitting(false);
  };

  if (openConversationId) {
    return (
      <OpenConversation
        conversationId={openConversationId}
        guestId={guestId ?? undefined}
        onBack={() => setOpenConversationId(null)}
      />
    );
  }

  return (
    <PageLayout scroll="page" width="prose">
      <PageHeader>
        <PageTitle>Contact Support</PageTitle>
        <PageDescription>
          Send a message. Replies from the team show up on this page.
        </PageDescription>
      </PageHeader>
      <PageBody>
        <div className="flex flex-col gap-8">
          <ConversationComposer
            error={submitError}
            guestEmail={email}
            isGuest={isGuest}
            isSubmitting={isSubmitting}
            onGuestEmailChange={setPendingEmail}
            onSubmit={handleSubmit}
          />

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
        </div>
      </PageBody>
    </PageLayout>
  );
}

function OpenConversation({
  conversationId,
  guestId,
  onBack,
}: {
  conversationId: Id<"supportConversations">;
  guestId: string | undefined;
  onBack: () => void;
}) {
  return (
    <PageLayout scroll="page" width="prose">
      <PageBody>
        <Button className="mb-4" onClick={onBack} size="xs" variant="ghost">
          <ArrowLeft aria-hidden />
          All conversations
        </Button>
        <SupportThread conversationId={conversationId} guestId={guestId} />
      </PageBody>
    </PageLayout>
  );
}
