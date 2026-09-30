import { Button } from "@ctrl-ui/react/ui/button";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { toast } from "@ctrl-ui/react/ui/toast";
import { Bell, BellSlash } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { EmailSubscribeForm } from "@/components/ui/email-subscribe-form";
import { capture } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";

interface ChangelogSubscribeProps {
  className?: string;
  organizationId: Id<"organizations">;
}

export function ChangelogSubscribe({
  organizationId,
  className,
}: ChangelogSubscribeProps) {
  const { data: session } = authClient.useSession();

  if (session?.user?.id) {
    return (
      <AccountSubscribeButton
        className={className}
        organizationId={organizationId}
      />
    );
  }

  return (
    <EmailSubscribe className={className} organizationId={organizationId} />
  );
}

function SubscribeIcon({
  isSubmitting,
  isSubscribed,
}: {
  isSubmitting: boolean;
  isSubscribed: boolean | undefined;
}) {
  if (isSubmitting) {
    return <Spinner data-icon="inline-start" size="xs" />;
  }
  if (isSubscribed) {
    return <BellSlash aria-hidden="true" className="size-4" />;
  }
  return <Bell aria-hidden="true" className="size-4" />;
}

function AccountSubscribeButton({
  organizationId,
  className,
}: ChangelogSubscribeProps) {
  const isSubscribed = useQuery(api.changelog.subscriptions.isSubscribed, {
    organizationId,
  });
  const subscribe = useMutation(api.changelog.subscriptions.subscribe);
  const unsubscribe = useMutation(api.changelog.subscriptions.unsubscribe);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleSubscription = async () => {
    setIsSubmitting(true);
    try {
      if (isSubscribed) {
        await unsubscribe({ organizationId });
      } else {
        await subscribe({ organizationId });
        capture("changelog_subscribed", { method: "authenticated" });
        toast.success("Subscribed. You’ll get an email when a release ships.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update your subscription. Try again."
      );
    }
    setIsSubmitting(false);
  };

  return (
    <Button
      className={className}
      disabled={isSubmitting || isSubscribed === undefined}
      onClick={handleToggleSubscription}
      tone={isSubscribed ? "neutral" : "primary"}
      variant={isSubscribed ? "surface" : "solid"}
    >
      <SubscribeIcon isSubmitting={isSubmitting} isSubscribed={isSubscribed} />
      {isSubscribed ? "Unsubscribe" : "Subscribe"}
    </Button>
  );
}

function EmailSubscribe({
  organizationId,
  className,
}: ChangelogSubscribeProps) {
  const subscribeByEmail = useMutation(
    api.changelog.subscriptions.subscribeByEmail
  );

  const handleEmailSubscribe = async (email: string) => {
    await subscribeByEmail({ email, organizationId });
    capture("changelog_subscribed", { method: "email" });
  };

  return (
    <EmailSubscribeForm
      className={className}
      onSubscribe={handleEmailSubscribe}
      successMessage="Check your inbox to confirm your subscription."
      variant="inline"
    />
  );
}
