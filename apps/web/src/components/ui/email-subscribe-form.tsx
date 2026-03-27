"use client";

import { Bell, Envelope } from "@phosphor-icons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EmailSubscribeFormProps {
  className?: string;
  description?: string;
  onSubscribe: (email: string) => Promise<void>;
  placeholder?: string;
  successMessage?: string;
  title?: string;
  variant?: "card" | "inline";
}

export function EmailSubscribeForm({
  className,
  description,
  onSubscribe,
  placeholder = "your@email.com",
  successMessage = "Subscribed! You'll receive email notifications.",
  title,
  variant = "card",
}: EmailSubscribeFormProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubscribe(email.trim());
      toast.success(successMessage);
      setEmail("");
      setIsSubscribed(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to subscribe"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCard = variant === "card";

  if (isSubscribed) {
    if (!isCard) {
      return (
        <p
          className={cn(
            "text-emerald-600 text-sm dark:text-emerald-400",
            className
          )}
        >
          {successMessage}
        </p>
      );
    }
    return (
      <div className={cn("rounded-lg border p-4", className)}>
        <p className="text-emerald-600 text-sm dark:text-emerald-400">
          {successMessage}
        </p>
      </div>
    );
  }

  const form = (
    <form className="flex gap-2" onSubmit={handleSubmit}>
      <div className="relative flex-1">
        <Envelope className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          disabled={isSubmitting}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          type="email"
          value={email}
        />
      </div>
      <Button disabled={isSubmitting || !email.trim()} type="submit">
        <Bell className="mr-2 h-4 w-4" />
        Subscribe
      </Button>
    </form>
  );

  if (!isCard) {
    return <div className={className}>{form}</div>;
  }

  return (
    <div className={cn("rounded-lg border p-4", className)}>
      {title && <p className="mb-1 font-medium text-sm">{title}</p>}
      {description && (
        <p className="mb-2 text-muted-foreground text-xs">{description}</p>
      )}
      {form}
    </div>
  );
}
