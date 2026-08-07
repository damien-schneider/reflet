"use client";

import { ArrowsClockwise, Trash } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Muted, Text } from "@/components/ui/typography";
import { DnsInstructions, DomainStatusBadge } from "./domain-status";

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

  const addDomain = useMutation(api.domains.publicMutations.addDomain);
  const removeDomainMutation = useMutation(
    api.domains.publicMutations.removeDomain
  );
  const checkVerification = useMutation(
    api.domains.publicMutations.checkVerification
  );

  const [domainInput, setDomainInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPro = billingStatus?.tier === "pro";
  const hasDomain = !!domainStatus?.customDomain;

  const handleAddDomain = async () => {
    const domain = domainInput.toLowerCase().trim();

    if (!DOMAIN_FORMAT_REGEX.test(domain)) {
      setError("Please enter a valid domain (e.g. feedback.example.com).");
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      await addDomain({ domain, organizationId });
      setDomainInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add domain.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveDomain = async () => {
    try {
      await removeDomainMutation({ organizationId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove domain.");
    }
  };

  const handleCheckVerification = async () => {
    setIsChecking(true);
    try {
      await checkVerification({ organizationId });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to check verification."
      );
    } finally {
      setIsChecking(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8">
      <h1 className="font-semibold text-lg">Domains</h1>

      <section className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <h2 className="font-medium text-sm">Subdomain</h2>
          <code className="inline-block rounded-md bg-muted px-3 py-1.5 text-sm">
            {orgSlug}.reflet.app
          </code>
        </div>
        <Badge variant="default">Active</Badge>
      </section>

      <section className="space-y-4 border-t pt-8">
        <h2 className="font-medium text-sm">Custom domain</h2>
        {isPro ? null : (
          <div className="flex items-center justify-between gap-4">
            <Muted>Available on Pro</Muted>
            <Link
              className={buttonVariants({ size: "sm", variant: "outline" })}
              href={`/dashboard/${orgSlug}/project/billing`}
            >
              Upgrade
            </Link>
          </div>
        )}
        {isPro && hasDomain && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <code className="max-w-full overflow-x-auto rounded-md bg-muted px-3 py-1.5 text-sm">
                  {domainStatus.customDomain}
                </code>
                {domainStatus.customDomainStatus && (
                  <DomainStatusBadge status={domainStatus.customDomainStatus} />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {domainStatus.customDomainStatus !== "active" &&
                  domainStatus.customDomainStatus !== "removing" && (
                    <Button
                      disabled={isChecking}
                      onClick={handleCheckVerification}
                      size="sm"
                      variant="outline"
                    >
                      <ArrowsClockwise
                        className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`}
                      />
                      Check verification
                    </Button>
                  )}
                <AlertDialog>
                  <AlertDialogTrigger
                    className="inline-flex h-8 items-center justify-center gap-2 rounded-md bg-destructive px-3 text-destructive-foreground text-xs shadow-xs hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50"
                    disabled={
                      !isAdmin || domainStatus.customDomainStatus === "removing"
                    }
                  >
                    <Trash className="h-4 w-4" />
                    Remove
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove custom domain</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove {domainStatus.customDomain} from your
                        organization. Your portal will still be accessible via{" "}
                        {orgSlug}.reflet.app.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRemoveDomain}>
                        Remove domain
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {domainStatus.customDomainError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                <Text className="text-destructive text-sm">
                  {domainStatus.customDomainError}
                </Text>
              </div>
            )}

            {domainStatus.customDomainStatus !== "active" && (
              <DnsInstructions
                domain={domainStatus.customDomain ?? ""}
                onCopy={copyToClipboard}
                verification={domainStatus.customDomainVerification}
              />
            )}

            {error && <Text className="text-destructive text-sm">{error}</Text>}
          </div>
        )}

        {isPro && !hasDomain ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                disabled={!isAdmin}
                onChange={(event) => {
                  setDomainInput(event.target.value);
                  setError(null);
                }}
                placeholder="feedback.example.com"
                value={domainInput}
              />
              <Button
                disabled={!isAdmin || isAdding || !domainInput.trim()}
                onClick={handleAddDomain}
              >
                {isAdding ? "Adding..." : "Add domain"}
              </Button>
            </div>
            {error ? (
              <Text className="text-destructive text-sm">{error}</Text>
            ) : null}
            {isAdmin ? null : (
              <Muted>Only admins and owners can manage custom domains.</Muted>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
