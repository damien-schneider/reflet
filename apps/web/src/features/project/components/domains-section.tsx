"use client";

import { ArrowsClockwise, Globe, Trash } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { H2, Muted, Text } from "@/components/ui/typography";
import {
  DnsInstructions,
  DOMAIN_FORMAT_REGEX,
  DomainStatusBadge,
} from "@/features/project/components/domains-helpers";
import { cn } from "@/lib/utils";

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
      await addDomain({ organizationId, domain });
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <div>
        <H2 variant="card">Domains</H2>
        <Muted>Configure how people access your public feedback portal.</Muted>
      </div>

      {/* Auto Subdomain Card — always visible */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Automatic Subdomain</CardTitle>
          </div>
          <CardDescription>
            Your public portal is always available at this address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="rounded-md bg-muted px-3 py-1.5 text-sm">
              {orgSlug}.reflet.app
            </code>
            <Badge variant="default">Active</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Custom Domain Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Custom Domain</CardTitle>
          </div>
          <CardDescription>
            Use your own domain to serve your feedback portal (Pro feature).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isPro && (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Text className="mb-2 font-medium">Upgrade to Pro</Text>
              <Muted>
                Custom domains are available on the Pro plan. Upgrade to use
                your own domain like feedback.yourcompany.com.
              </Muted>
            </div>
          )}

          {isPro && hasDomain && (
            <div className="space-y-4">
              {/* Domain + Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <code className="rounded-md bg-muted px-3 py-1.5 text-sm">
                    {domainStatus.customDomain}
                  </code>
                  {domainStatus.customDomainStatus && (
                    <DomainStatusBadge
                      status={domainStatus.customDomainStatus}
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {domainStatus.customDomainStatus !== "active" &&
                    domainStatus.customDomainStatus !== "removing" && (
                      <Button
                        disabled={isChecking}
                        onClick={handleCheckVerification}
                        size="sm"
                        variant="outline"
                      >
                        <ArrowsClockwise
                          className={cn(
                            "h-4 w-4",
                            isChecking && "animate-spin"
                          )}
                        />
                        Check Verification
                      </Button>
                    )}
                  <AlertDialog>
                    <AlertDialogTrigger
                      className="inline-flex h-8 items-center justify-center gap-2 rounded-md bg-destructive px-3 text-destructive-foreground text-xs shadow-xs hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50"
                      disabled={
                        !isAdmin ||
                        domainStatus.customDomainStatus === "removing"
                      }
                    >
                      <Trash className="h-4 w-4" />
                      Remove
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Remove Custom Domain
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove {domainStatus.customDomain} from your
                          organization. Your portal will still be accessible via{" "}
                          {orgSlug}.reflet.app.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemoveDomain}>
                          Remove Domain
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Error message */}
              {domainStatus.customDomainError && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                  <Text className="text-destructive text-sm">
                    {domainStatus.customDomainError}
                  </Text>
                </div>
              )}

              {/* DNS Instructions */}
              {domainStatus.customDomainStatus !== "active" && (
                <DnsInstructions
                  domain={domainStatus.customDomain ?? ""}
                  onCopy={copyToClipboard}
                  verification={domainStatus.customDomainVerification}
                />
              )}

              {error && (
                <Text className="text-destructive text-sm">{error}</Text>
              )}

              {domainStatus.customDomainLastCheckedAt && (
                <Muted className="text-xs">
                  Last checked:{" "}
                  {new Date(
                    domainStatus.customDomainLastCheckedAt
                  ).toLocaleString()}
                </Muted>
              )}
            </div>
          )}

          {isPro && !hasDomain && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  disabled={!isAdmin}
                  onChange={(e) => {
                    setDomainInput(e.target.value);
                    setError(null);
                  }}
                  placeholder="feedback.example.com"
                  value={domainInput}
                />
                <Button
                  disabled={!isAdmin || isAdding || !domainInput.trim()}
                  onClick={handleAddDomain}
                >
                  {isAdding ? "Adding..." : "Add Domain"}
                </Button>
              </div>
              {error && (
                <Text className="text-destructive text-sm">{error}</Text>
              )}
              {!isAdmin && (
                <Muted>Only admins and owners can manage custom domains.</Muted>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
