import { Bell, BellSlash, Envelope } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface ChangelogSubscribeProps {
  organizationId: Id<"organizations">;
  className?: string;
}

export function ChangelogSubscribe({
  organizationId,
  className,
}: ChangelogSubscribeProps) {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  const isSubscribed = useQuery(api.changelog_subscriptions.isSubscribed, {
    organizationId,
  });

  const subscribe = useMutation(api.changelog_subscriptions.subscribe);
  const unsubscribe = useMutation(api.changelog_subscriptions.unsubscribe);
  const subscribeByEmail = useMutation(
    api.changelog_subscriptions.subscribeByEmail
  );

  const [email, setEmail] = useState("");
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

  const handleEmailSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await subscribeByEmail({
        organizationId,
        email: email.trim(),
      });
      toast.success("Subscribed to changelog updates!");
      setEmail("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to subscribe"
      );
    } finally {
      setIsSubmitting(false);
    }
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

  // Not logged in - show email form
  return (
    <form
      className={cn("flex gap-2", className)}
      onSubmit={handleEmailSubscribe}
    >
      <div className="relative flex-1">
        <Envelope className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          disabled={isSubmitting}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          type="email"
          value={email}
        />
      </div>
      <Button disabled={isSubmitting} type="submit">
        <Bell className="mr-2 h-4 w-4" />
        Subscribe
      </Button>
    </form>
  );
}
