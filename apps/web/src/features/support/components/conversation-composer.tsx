"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Field, FieldError, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Textarea } from "@ctrl-ui/react/ui/textarea";
import { PaperPlaneRight } from "@phosphor-icons/react";
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ConversationComposerProps {
  className?: string;
  error?: string | null;
  guestEmail?: string;
  isGuest?: boolean;
  isSubmitting: boolean;
  onGuestEmailChange?: (email: string) => void;
  onSubmit: (data: {
    subject: string;
    message: string;
    email?: string;
  }) => void;
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export function ConversationComposer({
  className,
  error,
  guestEmail = "",
  isGuest = false,
  isSubmitting,
  onGuestEmailChange,
  onSubmit,
}: ConversationComposerProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const ids = { email: useId(), message: useId(), subject: useId() };

  const emailError =
    isGuest && !EMAIL_PATTERN.test(guestEmail.trim())
      ? "Enter your email so the team can reply."
      : null;
  const messageError = message.trim()
    ? null
    : "Describe what you need help with.";
  const visibleEmailError = hasAttemptedSubmit ? emailError : null;
  const visibleMessageError = hasAttemptedSubmit ? messageError : null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    setHasAttemptedSubmit(true);
    if (emailError) {
      emailRef.current?.focus();
      return;
    }
    if (messageError) {
      messageRef.current?.focus();
      return;
    }
    onSubmit({
      email: isGuest ? guestEmail.trim() : undefined,
      message: message.trim(),
      subject: subject.trim(),
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <form
      className={cn("flex flex-col gap-3", className)}
      noValidate
      onSubmit={handleSubmit}
    >
      {isGuest && (
        <Field invalid={Boolean(visibleEmailError)}>
          <FieldLabel htmlFor={ids.email}>Email</FieldLabel>
          <Input
            aria-describedby={
              visibleEmailError ? `${ids.email}-error` : undefined
            }
            aria-invalid={Boolean(visibleEmailError)}
            autoComplete="email"
            id={ids.email}
            onChange={(e) => onGuestEmailChange?.(e.target.value)}
            placeholder="you@example.com"
            ref={emailRef}
            type="email"
            value={guestEmail}
          />
          <FieldError
            id={`${ids.email}-error`}
            match={Boolean(visibleEmailError)}
          >
            {visibleEmailError}
          </FieldError>
        </Field>
      )}

      <Field>
        <FieldLabel htmlFor={ids.subject}>Subject (optional)</FieldLabel>
        <Input
          id={ids.subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Export stopped working"
          value={subject}
        />
      </Field>

      <Field invalid={Boolean(visibleMessageError)}>
        <FieldLabel htmlFor={ids.message}>Message</FieldLabel>
        <Textarea
          aria-describedby={
            visibleMessageError ? `${ids.message}-error` : undefined
          }
          aria-invalid={Boolean(visibleMessageError)}
          className="field-sizing-content max-h-64 min-h-24 resize-none"
          id={ids.message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What do you need help with?"
          ref={messageRef}
          rows={4}
          value={message}
        />
        <FieldError
          id={`${ids.message}-error`}
          match={Boolean(visibleMessageError)}
        >
          {visibleMessageError}
        </FieldError>
      </Field>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {error && (
          <p className="mr-auto text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
        <Button
          aria-busy={isSubmitting}
          disabled={isSubmitting}
          tone="primary"
          type="submit"
          variant="solid"
        >
          {isSubmitting ? (
            <Spinner aria-hidden data-icon="inline-start" size="xs" />
          ) : (
            <PaperPlaneRight aria-hidden weight="fill" />
          )}
          Send
        </Button>
      </div>
    </form>
  );
}
