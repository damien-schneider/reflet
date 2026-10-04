"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { Field, FieldError, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import {
  ArrowSquareOut,
  CheckCircle,
  Hourglass,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { convexErrorMessage } from "@/lib/convex-error-message";

type SupportEmailSettings = FunctionReturnType<
  typeof api.support.email.settings.get
>;

interface ForwardingCardProps {
  organizationId: Id<"organizations">;
  settings: SupportEmailSettings;
}

export function ForwardingCard({
  organizationId,
  settings,
}: ForwardingCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-6">
        {settings.inboundAddress ? (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-label">Your Reflet support address</span>
              <div className="flex min-w-0 items-center gap-1">
                <code className="truncate font-mono text-label">
                  {settings.inboundAddress}
                </code>
                <CopyButton
                  label="Copy support address"
                  size="xs"
                  value={settings.inboundAddress}
                />
              </div>
            </div>
            <ForwardingAddressForm
              currentAddress={settings.forwardingAddress}
              organizationId={organizationId}
            />
            {settings.forwardingAddress ? (
              <ForwardingStatus
                forwardingVerifiedAt={settings.forwardingVerifiedAt}
                organizationId={organizationId}
              />
            ) : null}
            {settings.gmailConfirmation ? (
              <GmailConfirmation confirmation={settings.gmailConfirmation} />
            ) : null}
          </>
        ) : (
          <CreateAliasButton organizationId={organizationId} />
        )}
      </CardContent>
    </Card>
  );
}

function CreateAliasButton({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const createInboundAlias = useMutation(
    api.support.email.settings.createInboundAlias
  );
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);
    try {
      await createInboundAlias({ organizationId });
    } catch (err) {
      setError(convexErrorMessage(err, "Couldn’t create the support address"));
    }
    setIsCreating(false);
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        disabled={isCreating}
        onClick={handleCreate}
        tone="primary"
        variant="solid"
      >
        {isCreating ? (
          <Spinner aria-hidden data-icon="inline-start" size="xs" />
        ) : null}
        {isCreating ? "Creating…" : "Create support address"}
      </Button>
      {error ? (
        <p className="text-caption text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ForwardingAddressForm({
  currentAddress,
  organizationId,
}: {
  currentAddress: string | undefined;
  organizationId: Id<"organizations">;
}) {
  const setForwardingAddress = useMutation(
    api.support.email.settings.setForwardingAddress
  );
  const [address, setAddress] = useState(currentAddress ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmed = address.trim();
  const isUnchanged = trimmed.toLowerCase() === currentAddress;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await setForwardingAddress({ address: trimmed, organizationId });
    } catch (err) {
      setError(convexErrorMessage(err, "Couldn’t save the address"));
    }
    setIsSaving(false);
  };

  return (
    <form noValidate onSubmit={handleSubmit}>
      <Field>
        <FieldLabel htmlFor="forwarding-address">
          Mailbox that forwards here
        </FieldLabel>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-describedby="forwarding-address-error"
            aria-invalid={error ? true : undefined}
            autoCapitalize="none"
            autoComplete="email"
            id="forwarding-address"
            inputMode="email"
            onChange={(event) => {
              setAddress(event.target.value);
              setError(null);
            }}
            placeholder="support@example.com"
            spellCheck={false}
            type="email"
            value={address}
          />
          <Button
            disabled={isSaving || !trimmed || isUnchanged}
            type="submit"
            variant="surface"
          >
            {isSaving ? (
              <Spinner aria-hidden data-icon="inline-start" size="xs" />
            ) : null}
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
        <FieldError
          id="forwarding-address-error"
          match={error !== null}
          role="alert"
        >
          {error}
        </FieldError>
      </Field>
    </form>
  );
}

function ForwardingStatus({
  forwardingVerifiedAt,
  organizationId,
}: {
  forwardingVerifiedAt: number | undefined;
  organizationId: Id<"organizations">;
}) {
  const sendForwardingTest = useMutation(
    api.support.email.settings.sendForwardingTest
  );
  const [isSending, setIsSending] = useState(false);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSendTest = async () => {
    setIsSending(true);
    setError(null);
    try {
      await sendForwardingTest({ organizationId });
      setSentAt(Date.now());
    } catch (err) {
      setError(convexErrorMessage(err, "Couldn’t send the test email"));
    }
    setIsSending(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {forwardingVerifiedAt ? (
          <Badge color="green">
            <CheckCircle aria-hidden />
            Forwarding verified
          </Badge>
        ) : (
          <Badge color="yellow">
            <Hourglass aria-hidden />
            {sentAt ? "Waiting for the test email" : "Not verified"}
          </Badge>
        )}
        <Button
          disabled={isSending}
          onClick={handleSendTest}
          size="sm"
          variant="surface"
        >
          {isSending ? (
            <Spinner aria-hidden data-icon="inline-start" size="xs" />
          ) : (
            <PaperPlaneTilt aria-hidden />
          )}
          {isSending ? "Sending…" : "Send test"}
        </Button>
      </div>
      {error ? (
        <p className="text-caption text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function GmailConfirmation({
  confirmation,
}: {
  confirmation: NonNullable<SupportEmailSettings["gmailConfirmation"]>;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <span className="text-label">Gmail asks you to confirm forwarding</span>
      <p className="text-pretty text-body text-muted-foreground">
        {confirmation.subject}
      </p>
      <p className="line-clamp-3 text-pretty text-caption text-muted-foreground">
        {confirmation.excerpt}
      </p>
      {confirmation.confirmationUrl ? (
        <a
          className="inline-flex items-center gap-1 self-start text-label underline underline-offset-4"
          href={confirmation.confirmationUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          Confirm in Gmail
          <ArrowSquareOut aria-hidden />
        </a>
      ) : null}
    </div>
  );
}
