"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import type { FeedbackDetail } from "@/features/feedback/components/properties/property-types";
import { useAuthGuard } from "@/hooks/use-auth-guard";
import { CopyForAgents } from "./copy-for-agents";
import { SubscribeButton } from "./subscribe-button";

export function FeedbackDetailActions({
  feedback,
  isAdmin,
  showLabel = false,
}: {
  feedback: FeedbackDetail;
  isAdmin: boolean;
  showLabel?: boolean;
}) {
  const { guard: authGuard, isAuthenticated } = useAuthGuard({
    message: "Sign in to get updates on this feedback",
  });
  const isSubscribed = useQuery(api.feedback.subscriptions.isSubscribed, {
    feedbackId: feedback._id,
  });
  const toggleSubscription = useMutation(api.feedback.subscriptions.toggle);

  const handleToggleSubscription = async () => {
    if (!isAuthenticated) {
      authGuard(() => undefined);
      return;
    }
    await toggleSubscription({ feedbackId: feedback._id });
  };

  return (
    <>
      {isAdmin && (
        <CopyForAgents
          attachments={feedback.attachments}
          description={feedback.description}
          feedbackId={feedback._id}
          organizationId={feedback.organizationId}
          tags={feedback.tags}
          title={feedback.title}
        />
      )}
      <SubscribeButton
        isSubscribed={isSubscribed}
        onToggle={handleToggleSubscription}
        showLabel={showLabel}
      />
    </>
  );
}
