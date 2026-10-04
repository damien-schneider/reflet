"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ctrl-ui/react/ui/dialog";
import { Field, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Textarea } from "@ctrl-ui/react/ui/textarea";
import { PencilSimple } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { ComposeBlocker } from "@reflet/backend/convex/support/email/compose";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import {
  convexErrorMessage,
  isRateLimitedError,
} from "@/lib/convex-error-message";

export interface EmailDraft {
  body: string;
  subject: string;
  to: string;
}

const FORM_ID = "new-email-form";
const SEND_FAILED_MESSAGE =
  "Email not sent. Check your connection and try again.";
const RATE_LIMITED_MESSAGE =
  "Your team has started many email conversations today. Try again tomorrow.";

const BLOCKER_COPY: Record<ComposeBlocker, string> = {
  no_verified_domain:
    "Verify a sending domain to email customers who haven’t written to you yet.",
  not_pro:
    "Starting email conversations is part of Pro and needs a verified sending domain.",
  paused:
    "Customer emails are paused for your organization. Contact Reflet support to resume sending.",
};

export function NewEmailDialog({
  composeBlocker,
  onStart,
  orgSlug,
}: {
  composeBlocker: ComposeBlocker | null | undefined;
  onStart: (draft: EmailDraft) => Promise<Id<"supportConversations">>;
  orgSlug: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        disabled={composeBlocker === undefined}
        onClick={() => setOpen(true)}
        size="sm"
        variant="surface"
      >
        <PencilSimple aria-hidden />
        New email
      </Button>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New email</DialogTitle>
            <DialogDescription>
              {composeBlocker
                ? BLOCKER_COPY[composeBlocker]
                : "The customer gets it from your sending domain. Their reply lands in this inbox."}
            </DialogDescription>
          </DialogHeader>
          {composeBlocker ? (
            <DialogFooter>
              <ButtonLink
                render={
                  <Link href={`/dashboard/${orgSlug}/project/support-email`} />
                }
                tone="primary"
                variant="solid"
              >
                Open support email settings
              </ButtonLink>
            </DialogFooter>
          ) : (
            <EmailForm
              onCancel={() => setOpen(false)}
              onStart={async (draft) => {
                await onStart(draft);
                setOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function EmailForm({
  onCancel,
  onStart,
}: {
  onCancel: () => void;
  onStart: (draft: EmailDraft) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const sendEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsSending(true);
    setError(null);
    try {
      await onStart({
        body: String(form.get("body") ?? ""),
        subject: String(form.get("subject") ?? ""),
        to: String(form.get("to") ?? ""),
      });
    } catch (startError) {
      setError(
        isRateLimitedError(startError)
          ? RATE_LIMITED_MESSAGE
          : convexErrorMessage(startError, SEND_FAILED_MESSAGE)
      );
    }
    setIsSending(false);
  };

  return (
    <>
      <form className="flex flex-col gap-4" id={FORM_ID} onSubmit={sendEmail}>
        <Field>
          <FieldLabel htmlFor="new-email-to">To</FieldLabel>
          <Input
            autoComplete="email"
            disabled={isSending}
            id="new-email-to"
            name="to"
            placeholder="name@example.com"
            required
            type="email"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="new-email-subject">Subject</FieldLabel>
          <Input
            disabled={isSending}
            id="new-email-subject"
            maxLength={200}
            name="subject"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="new-email-body">Message</FieldLabel>
          <Textarea
            disabled={isSending}
            id="new-email-body"
            maxLength={10_000}
            name="body"
            required
            rows={8}
          />
        </Field>
        {error && (
          <p className="text-caption text-destructive" role="alert">
            {error}
          </p>
        )}
      </form>
      <DialogFooter>
        <Button onClick={onCancel} type="button" variant="surface">
          Cancel
        </Button>
        <Button
          disabled={isSending}
          form={FORM_ID}
          tone="primary"
          type="submit"
          variant="solid"
        >
          {isSending ? "Sending…" : "Send email"}
        </Button>
      </DialogFooter>
    </>
  );
}
