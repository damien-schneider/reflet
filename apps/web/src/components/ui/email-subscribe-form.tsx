"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import { InputGroup, InputGroupAddon } from "@ctrl-ui/react/ui/input-group";
import { Bell, Envelope } from "@phosphor-icons/react";
import { type FormEvent, useId, useState } from "react";
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
  placeholder = "you@company.com",
  successMessage = "Subscribed. You’ll get an email when there’s news.",
  title,
  variant = "card",
}: EmailSubscribeFormProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubscribe(email.trim());
      setEmail("");
      setIsSubscribed(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Couldn’t subscribe. Check the address and try again."
      );
    }
    setIsSubmitting(false);
  };

  const isCard = variant === "card";
  const cardClassName = "rounded-(--radius-panel) border border-border p-4";

  if (isSubscribed) {
    return (
      <p
        className={cn(
          "text-body text-success-text",
          isCard && cardClassName,
          className
        )}
        role="status"
      >
        {successMessage}
      </p>
    );
  }

  const form = (
    <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <InputGroup className="min-w-0 flex-1">
          <InputGroupAddon>
            <Envelope aria-hidden className="size-4 text-muted-foreground" />
          </InputGroupAddon>
          <Input
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? true : undefined}
            aria-label="Email address"
            autoComplete="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder={placeholder}
            readOnly={isSubmitting}
            required
            type="email"
            value={email}
          />
        </InputGroup>
        <Button
          disabled={isSubmitting}
          tone="primary"
          type="submit"
          variant="solid"
        >
          <Bell aria-hidden data-icon="inline-start" />
          {isSubmitting ? "Subscribing…" : "Subscribe"}
        </Button>
      </div>
      {error ? (
        <p
          className="text-body text-destructive-text"
          id={errorId}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </form>
  );

  if (!isCard) {
    return <div className={className}>{form}</div>;
  }

  return (
    <div className={cn(cardClassName, className)}>
      {title ? <p className="mb-1 font-medium text-body">{title}</p> : null}
      {description ? (
        <p className="mb-3 text-label text-muted-foreground">{description}</p>
      ) : null}
      {form}
    </div>
  );
}
