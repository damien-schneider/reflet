"use client";

import { Alert, AlertDescription, AlertTitle } from "@ctrl-ui/react/ui/alert";
import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { Field, FieldError, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  ArrowsClockwise,
  CheckCircle,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import {
  DnsInstructions,
  type DomainStatus,
  DomainStatusBadge,
} from "./domain-status";
import { SettingsPage, SettingsSection } from "./settings-page";

const DOMAIN_FORMAT_REGEX =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

interface DomainsSectionProps {
  isAdmin: boolean;
  organizationId: Id<"organizations">;
  orgSlug: string;
}

export function DomainsSection({
  isAdmin,
  organizationId,
  orgSlug,
}: DomainsSectionProps) {
  const domainStatus = useQuery(api.domains.queries.getDomainStatus, {
    organizationId,
  });
  const billingStatus = useQuery(api.billing.queries.getStatus, {
    organizationId,
  });
  const subdomain = `${orgSlug}.reflet.app`;
  const isLoading = domainStatus === undefined || billingStatus === undefined;
  const isPro = billingStatus?.tier === "pro";
  const customDomain = domainStatus?.customDomain;

  return (
    <SettingsPage
      description="Where your public roadmap, changelog and feedback board live."
      title="Domains"
    >
      <SettingsSection title="Subdomain">
        <Card>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-1">
              <code className="truncate font-mono text-label">{subdomain}</code>
              <CopyButton label="Copy subdomain" size="xs" value={subdomain} />
            </div>
            <Badge color="green">
              <CheckCircle aria-hidden />
              Active
            </Badge>
          </CardContent>
        </Card>
      </SettingsSection>

      <SettingsSection
        description="Serve your portal from a domain you own, like feedback.example.com."
        title="Custom domain"
      >
        <Card>
          <CardContent className="flex flex-col gap-4">
            {isLoading ? <Skeleton aria-busy="true" className="h-9" /> : null}
            {isLoading || isPro ? null : <ProUpsell orgSlug={orgSlug} />}
            {!isLoading && isPro && customDomain && domainStatus ? (
              <CustomDomainDetails
                domain={customDomain}
                error={domainStatus.customDomainError}
                isAdmin={isAdmin}
                organizationId={organizationId}
                status={domainStatus.customDomainStatus}
                subdomain={subdomain}
                verification={domainStatus.customDomainVerification}
              />
            ) : null}
            {!isLoading && isPro && !customDomain ? (
              <AddDomainForm
                isAdmin={isAdmin}
                organizationId={organizationId}
              />
            ) : null}
          </CardContent>
        </Card>
      </SettingsSection>
    </SettingsPage>
  );
}

function ProUpsell({ orgSlug }: { orgSlug: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-body text-muted-foreground">
        Custom domains are part of Pro.
      </p>
      <ButtonLink
        render={<Link href={`/dashboard/${orgSlug}/project/billing`} />}
        size="sm"
        variant="surface"
      >
        Compare plans
      </ButtonLink>
    </div>
  );
}

function AddDomainForm({
  isAdmin,
  organizationId,
}: {
  isAdmin: boolean;
  organizationId: Id<"organizations">;
}) {
  const addDomain = useMutation(api.domains.publicMutations.addDomain);
  const [domainInput, setDomainInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const domain = domainInput.toLowerCase().trim();
    if (!DOMAIN_FORMAT_REGEX.test(domain)) {
      setError("Enter a domain like feedback.example.com");
      return;
    }
    setIsAdding(true);
    setError(null);
    try {
      await addDomain({ domain, organizationId });
      setDomainInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn’t add the domain");
    }
    setIsAdding(false);
  };

  return (
    <form noValidate onSubmit={handleSubmit}>
      <Field>
        <FieldLabel htmlFor="custom-domain">Domain</FieldLabel>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-describedby="custom-domain-error"
            aria-invalid={error ? true : undefined}
            autoCapitalize="none"
            disabled={!isAdmin}
            id="custom-domain"
            inputMode="url"
            onChange={(event) => {
              setDomainInput(event.target.value);
              setError(null);
            }}
            placeholder="feedback.example.com"
            spellCheck={false}
            value={domainInput}
          />
          <Button
            disabled={!isAdmin || isAdding || !domainInput.trim()}
            tone="primary"
            type="submit"
            variant="solid"
          >
            {isAdding ? (
              <Spinner aria-hidden data-icon="inline-start" size="xs" />
            ) : null}
            {isAdding ? "Adding…" : "Add domain"}
          </Button>
        </div>
        <FieldError
          id="custom-domain-error"
          match={error !== null}
          role="alert"
        >
          {error}
        </FieldError>
        {isAdmin ? null : (
          <p className="text-caption text-muted-foreground">
            Only admins and owners can manage custom domains.
          </p>
        )}
      </Field>
    </form>
  );
}

interface CustomDomainDetailsProps {
  domain: string;
  error?: string;
  isAdmin: boolean;
  organizationId: Id<"organizations">;
  status?: DomainStatus;
  subdomain: string;
  verification?: Array<{ domain: string; type: string; value: string }>;
}

function CustomDomainDetails({
  domain,
  error,
  isAdmin,
  organizationId,
  status,
  subdomain,
  verification,
}: CustomDomainDetailsProps) {
  const checkVerification = useMutation(
    api.domains.publicMutations.checkVerification
  );
  const [isChecking, setIsChecking] = useState(false);
  const isVerifiable = status !== "active" && status !== "removing";

  const handleCheckVerification = async () => {
    setIsChecking(true);
    try {
      await checkVerification({ organizationId });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn’t check verification"
      );
    }
    setIsChecking(false);
  };

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <code className="break-all font-mono text-label">{domain}</code>
          {status ? <DomainStatusBadge status={status} /> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isVerifiable ? (
            <Button
              disabled={isChecking}
              onClick={handleCheckVerification}
              size="sm"
              variant="surface"
            >
              {isChecking ? (
                <Spinner aria-hidden data-icon="inline-start" size="xs" />
              ) : (
                <ArrowsClockwise aria-hidden />
              )}
              {isChecking ? "Checking…" : "Check verification"}
            </Button>
          ) : null}
          <RemoveDomainButton
            disabled={!isAdmin || status === "removing"}
            domain={domain}
            organizationId={organizationId}
            subdomain={subdomain}
          />
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <WarningCircle aria-hidden />
          <AlertTitle>Domain configuration problem</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {status === "active" ? null : (
        <DnsInstructions domain={domain} verification={verification} />
      )}
    </>
  );
}

function RemoveDomainButton({
  disabled,
  domain,
  organizationId,
  subdomain,
}: {
  disabled: boolean;
  domain: string;
  organizationId: Id<"organizations">;
  subdomain: string;
}) {
  const removeDomain = useMutation(api.domains.publicMutations.removeDomain);
  const [open, setOpen] = useState(false);

  const handleRemove = async () => {
    try {
      await removeDomain({ organizationId });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn’t remove the domain"
      );
    }
  };

  return (
    <>
      <Button
        disabled={disabled}
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
        description={`Links to ${domain} stop working. Your portal stays available at ${subdomain}.`}
        onConfirm={handleRemove}
        onOpenChange={setOpen}
        open={open}
        title={`Remove ${domain}?`}
      />
    </>
  );
}
