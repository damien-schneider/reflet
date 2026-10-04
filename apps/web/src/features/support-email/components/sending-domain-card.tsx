"use client";

import { Alert, AlertDescription, AlertTitle } from "@ctrl-ui/react/ui/alert";
import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { Field, FieldError, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  ArrowsClockwise,
  CheckCircle,
  Hourglass,
  Trash,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { useState } from "react";
import { DnsRecordsTable } from "@/components/dns-records-table";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { convexErrorMessage } from "@/lib/convex-error-message";

type SendingDomain = NonNullable<
  FunctionReturnType<typeof api.support.email.settings.get>["domain"]
>;

const STATUS_BADGES: Record<
  SendingDomain["status"],
  { color: "green" | "red" | "yellow"; icon: typeof CheckCircle; label: string }
> = {
  failed: { color: "red", icon: XCircle, label: "Verification failed" },
  not_started: { color: "yellow", icon: Hourglass, label: "Setting up" },
  partially_failed: {
    color: "red",
    icon: WarningCircle,
    label: "Some records failed",
  },
  partially_verified: {
    color: "yellow",
    icon: Hourglass,
    label: "Partially verified",
  },
  pending: { color: "yellow", icon: Hourglass, label: "Pending verification" },
  temporary_failure: {
    color: "yellow",
    icon: WarningCircle,
    label: "Temporary failure",
  },
  verified: { color: "green", icon: CheckCircle, label: "Verified" },
};

const RECORD_STATUS_COLORS: Record<string, "green" | "red" | "yellow"> = {
  failed: "red",
  verified: "green",
};

interface SendingDomainCardProps {
  domain: SendingDomain | null;
  isPro: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function SendingDomainCard({
  domain,
  isPro,
  organizationId,
  orgSlug,
}: SendingDomainCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {domain ? (
          <SendingDomainDetails
            domain={domain}
            organizationId={organizationId}
          />
        ) : null}
        {!domain && isPro ? (
          <AddSendingDomainForm organizationId={organizationId} />
        ) : null}
        {domain || isPro ? null : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-body text-muted-foreground">
              Sending from your own domain is part of Pro.
            </p>
            <ButtonLink
              render={<Link href={`/dashboard/${orgSlug}/project/billing`} />}
              size="sm"
              variant="surface"
            >
              Compare plans
            </ButtonLink>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddSendingDomainForm({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const addSendingDomain = useMutation(
    api.support.email.domains.mutations.addSendingDomain
  );
  const [domainInput, setDomainInput] = useState("");
  const [localPartInput, setLocalPartInput] = useState("support");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsAdding(true);
    setError(null);
    try {
      await addSendingDomain({
        domain: domainInput,
        fromLocalPart: localPartInput,
        organizationId,
      });
    } catch (err) {
      setError(convexErrorMessage(err, "Couldn’t add the domain"));
    }
    setIsAdding(false);
  };

  return (
    <form className="flex flex-col gap-3" noValidate onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Field className="sm:w-40">
          <FieldLabel htmlFor="sending-local-part">Sender</FieldLabel>
          <Input
            autoCapitalize="none"
            id="sending-local-part"
            onChange={(event) => {
              setLocalPartInput(event.target.value);
              setError(null);
            }}
            placeholder="support"
            spellCheck={false}
            value={localPartInput}
          />
        </Field>
        <Field className="flex-1">
          <FieldLabel htmlFor="sending-domain">Subdomain</FieldLabel>
          <Input
            aria-describedby="sending-domain-error"
            aria-invalid={error ? true : undefined}
            autoCapitalize="none"
            id="sending-domain"
            inputMode="url"
            onChange={(event) => {
              setDomainInput(event.target.value);
              setError(null);
            }}
            placeholder="support.example.com"
            spellCheck={false}
            value={domainInput}
          />
        </Field>
      </div>
      <FieldError id="sending-domain-error" match={error !== null} role="alert">
        {error}
      </FieldError>
      <Button
        className="self-start"
        disabled={isAdding || !domainInput.trim() || !localPartInput.trim()}
        tone="primary"
        type="submit"
        variant="solid"
      >
        {isAdding ? (
          <Spinner aria-hidden data-icon="inline-start" size="xs" />
        ) : null}
        {isAdding ? "Adding…" : "Add domain"}
      </Button>
    </form>
  );
}

function SendingDomainDetails({
  domain,
  organizationId,
}: {
  domain: SendingDomain;
  organizationId: Id<"organizations">;
}) {
  const checkSendingDomain = useMutation(
    api.support.email.domains.mutations.checkSendingDomain
  );
  const [isChecking, setIsChecking] = useState(false);
  const badge = STATUS_BADGES[domain.status];
  const BadgeIcon = badge.icon;

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      await checkSendingDomain({ organizationId });
    } catch (err) {
      toast.error(convexErrorMessage(err, "Couldn’t check the domain"));
    }
    setIsChecking(false);
  };

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <code className="break-all font-mono text-label">
            {domain.domain}
          </code>
          <Badge color={badge.color}>
            <BadgeIcon aria-hidden />
            {badge.label}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {domain.status === "verified" ? null : (
            <Button
              disabled={isChecking}
              onClick={handleCheck}
              size="sm"
              variant="surface"
            >
              {isChecking ? (
                <Spinner aria-hidden data-icon="inline-start" size="xs" />
              ) : (
                <ArrowsClockwise aria-hidden />
              )}
              {isChecking ? "Checking…" : "Check"}
            </Button>
          )}
          <RemoveSendingDomainButton
            domain={domain.domain}
            organizationId={organizationId}
          />
        </div>
      </div>

      <FromLocalPartForm
        domain={domain.domain}
        fromLocalPart={domain.fromLocalPart}
        organizationId={organizationId}
      />

      {domain.error ? (
        <Alert variant="destructive">
          <WarningCircle aria-hidden />
          <AlertTitle>Domain setup failed</AlertTitle>
          <AlertDescription>{domain.error}</AlertDescription>
        </Alert>
      ) : null}

      {domain.records.length > 0 && domain.status !== "verified" ? (
        <div className="flex flex-col gap-3">
          <p className="text-pretty text-body text-muted-foreground">
            Add these records at your DNS provider, then select Check. DNS
            changes can take a few hours to propagate.
          </p>
          <DnsRecordsTable
            records={domain.records.map((record) => ({
              name: record.name,
              priority: record.priority,
              status: (
                <Badge color={RECORD_STATUS_COLORS[record.status] ?? "yellow"}>
                  {record.status.replaceAll("_", " ")}
                </Badge>
              ),
              type: record.type,
              value: record.value,
            }))}
          />
        </div>
      ) : null}
    </>
  );
}

function FromLocalPartForm({
  domain,
  fromLocalPart,
  organizationId,
}: {
  domain: string;
  fromLocalPart: string;
  organizationId: Id<"organizations">;
}) {
  const updateFromLocalPart = useMutation(
    api.support.email.domains.mutations.updateFromLocalPart
  );
  const [value, setValue] = useState(fromLocalPart);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isUnchanged = value.trim().toLowerCase() === fromLocalPart;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await updateFromLocalPart({ fromLocalPart: value, organizationId });
    } catch (err) {
      setError(convexErrorMessage(err, "Couldn’t save the sender"));
    }
    setIsSaving(false);
  };

  return (
    <form noValidate onSubmit={handleSubmit}>
      <Field>
        <FieldLabel htmlFor="sending-from">Replies are sent from</FieldLabel>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-1">
            <Input
              aria-describedby="sending-from-error"
              aria-invalid={error ? true : undefined}
              autoCapitalize="none"
              className="sm:w-40"
              id="sending-from"
              onChange={(event) => {
                setValue(event.target.value);
                setError(null);
              }}
              spellCheck={false}
              value={value}
            />
            <span className="break-all font-mono text-label">@{domain}</span>
          </div>
          <Button
            disabled={isSaving || isUnchanged || !value.trim()}
            size="sm"
            type="submit"
            variant="surface"
          >
            {isSaving ? (
              <Spinner aria-hidden data-icon="inline-start" size="xs" />
            ) : null}
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
        <FieldError id="sending-from-error" match={error !== null} role="alert">
          {error}
        </FieldError>
      </Field>
    </form>
  );
}

function RemoveSendingDomainButton({
  domain,
  organizationId,
}: {
  domain: string;
  organizationId: Id<"organizations">;
}) {
  const removeSendingDomain = useMutation(
    api.support.email.domains.mutations.removeSendingDomain
  );
  const [open, setOpen] = useState(false);

  const handleRemove = async () => {
    try {
      await removeSendingDomain({ organizationId });
    } catch (err) {
      toast.error(convexErrorMessage(err, "Couldn’t remove the domain"));
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        tone="danger"
        variant="surface"
      >
        <Trash aria-hidden />
        Remove
      </Button>
      <DestructiveConfirmDialog
        confirmLabel="Remove domain"
        description={`Replies stop being emailed from ${domain}. Customers with a confirmed address get a link to your reply instead.`}
        onConfirm={handleRemove}
        onOpenChange={setOpen}
        open={open}
        title={`Remove ${domain}?`}
      />
    </>
  );
}
