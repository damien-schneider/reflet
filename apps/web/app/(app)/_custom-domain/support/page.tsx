"use client";

import { ConversationComposer } from "@app/(app)/[orgSlug]/support/components/conversation-composer";
import { LoadingState } from "@app/(app)/[orgSlug]/support/components/loading-state";
import { SupportUnavailable } from "@app/(app)/[orgSlug]/support/components/support-unavailable";
import { useGuestSession } from "@app/(app)/[orgSlug]/support/hooks/use-guest-session";
import { CheckCircle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { H1, Lead } from "@/components/ui/typography";
import { useCustomDomainOrg } from "@/features/public-org/hooks/use-custom-domain-org";
import { authClient } from "@/lib/auth-client";

export default function CustomDomainSupportPage() {
  const org = useCustomDomainOrg();
  const { data: session } = authClient.useSession();
  const isLoggedIn = Boolean(session?.user);
  const isGuest = !isLoggedIn;

  const orgSlug = org?.slug ?? "";
  const { guestEmail, saveGuestSession } = useGuestSession(orgSlug);
  const [pendingEmail, setPendingEmail] = useState(guestEmail ?? "");

  const supportSettings = useQuery(
    api.support.conversation_queries.getSupportSettings,
    org?._id ? { organizationId: org._id } : "skip"
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const createConversation = useMutation(
    api.support.conversation_mutations.create
  );

  if (org === undefined || supportSettings === undefined) {
    return <LoadingState />;
  }

  if (!org) {
    return null;
  }

  if (!supportSettings?.supportEnabled) {
    return <SupportUnavailable orgSlug={orgSlug} />;
  }

  const handleSubmit = async (data: {
    subject: string;
    message: string;
    email?: string;
  }) => {
    if (!(data.message.trim() && org._id)) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (isGuest) {
        const savedGuestId = saveGuestSession(data.email ?? pendingEmail);
        await createConversation({
          organizationId: org._id,
          subject: data.subject || undefined,
          initialMessage: data.message,
          guestId: savedGuestId,
          guestEmail: data.email ?? pendingEmail,
        });
      } else {
        await createConversation({
          organizationId: org._id,
          subject: data.subject || undefined,
          initialMessage: data.message,
        });
      }
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <H1 variant="page">Contact Support</H1>
        <Lead>Get help from our team</Lead>
      </div>

      <div className="mx-auto max-w-lg">
        {submitted ? (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle
                  className="h-6 w-6 text-green-600 dark:text-green-400"
                  weight="fill"
                />
              </div>
              <CardTitle>Message sent</CardTitle>
              <CardDescription>
                We've received your message and will get back to you soon.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => setSubmitted(false)} variant="outline">
                Send another message
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ConversationComposer
            alwaysExpanded
            guestEmail={pendingEmail}
            isGuest={isGuest}
            isSubmitting={isSubmitting}
            onGuestEmailChange={setPendingEmail}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
