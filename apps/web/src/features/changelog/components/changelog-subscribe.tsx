import { Bell, BellSlash } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmailSubscribeForm } from "@/components/ui/email-subscribe-form";
import { capture } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface ChangelogSubscribeProps {
  className?: string;
  organizationId: Id<"organizations">;
}

export function ChangelogSubscribe({
  organizationId,
  className,
}: ChangelogSubscribeProps) {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const isSubscribed = useQuery(api.changelog.subscriptions.isSubscribed, {
    organizationId,
  });

  const subscribe = useMutation(api.changelog.subscriptions.subscribe);
  const unsubscribe = useMutation(api.changelog.subscriptions.unsubscribe);
  const subscribeByEmail = useMutation(
    api.changelog.subscriptions.subscribeByEmail
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggleSubscription = async () => {
    if (!userId) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSubscribed) {
        await unsubscribe({ organizationId });
        toast.success("Unsubscribed from changelog updates");
      } else {
        await subscribe({ organizationId });
        capture("changelog_subscribed", { method: "authenticated" });
        toast.success("Subscribed to changelog updates!");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update subscription"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubscribe = async (email: string) => {
    await subscribeByEmail({
      organizationId,
      email,
    });
    capture("changelog_subscribed", { method: "email" });
  };

  // Logged in user - show toggle button
  if (userId) {
    return (
      <Button
        className={cn("gap-2", className)}
        disabled={isSubmitting || isSubscribed === undefined}
        onClick={handleToggleSubscription}
        variant={isSubscribed ? "outline" : "default"}
      >
        {isSubscribed ? (
          <>
            <BellSlash className="h-4 w-4" />
            Unsubscribe
          </>
        ) : (
          <>
            <Bell className="h-4 w-4" />
            Subscribe
          </>
        )}
      </Button>
    );
  }

  // Not logged in - show shared email form (inline in header)
  return (
    <EmailSubscribeForm
      className={className}
      onSubscribe={handleEmailSubscribe}
      successMessage="Subscribed to changelog updates!"
      variant="inline"
    />
  );
}
