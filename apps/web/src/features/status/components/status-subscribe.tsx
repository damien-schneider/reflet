"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { EmailSubscribeForm } from "@/components/ui/email-subscribe-form";

interface StatusSubscribeProps {
  className?: string;
  organizationId: Id<"organizations">;
}

export function StatusSubscribe({
  organizationId,
  className,
}: StatusSubscribeProps) {
  const subscribe = useMutation(api.status.subscriptions.subscribe);

  const handleSubscribe = async (email: string) => {
    await subscribe({ email, organizationId });
  };

  return (
    <EmailSubscribeForm
      className={className}
      onSubscribe={handleSubscribe}
      successMessage="Check your inbox to confirm your subscription."
      variant="inline"
    />
  );
}
