"use client";

import { IconCurrencyDollar } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/features/autopilot/components/settings/section-header";
import { UpgradeBanner } from "@/features/autopilot/components/upgrade-banner";

function getBillingTier(tier: string): "free" | "pro" {
  return tier === "pro" ? "pro" : "free";
}

export function BillingSection({
  orgSlug,
  tier,
}: {
  orgSlug: string;
  tier: string;
}) {
  const billingUrl = `/dashboard/${orgSlug}/settings/billing`;
  const isPro = tier === "pro";

  return (
    <section className="space-y-5">
      <SectionHeader
        badge={tier}
        description="Your current plan and usage limits"
        icon={IconCurrencyDollar}
        title="Plan"
      />
      <UpgradeBanner billingUrl={billingUrl} tier={getBillingTier(tier)} />
      <Card>
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="min-w-0">
            <p className="font-medium text-sm capitalize">{tier} Plan</p>
            <p className="text-muted-foreground text-xs">
              {isPro
                ? "Full access to all Autopilot features and agents."
                : "Limited access. Upgrade for higher limits and all agents."}
            </p>
          </div>
          <Button
            className="shrink-0"
            onClick={() => window.location.assign(billingUrl)}
            size="sm"
            variant={isPro ? "outline" : "default"}
          >
            {isPro ? "Manage Billing" : "Upgrade to Pro"}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

export function BillingSectionSkeleton() {
  return (
    <section className="space-y-5">
      <SectionHeader
        description="Your current plan and usage limits"
        icon={IconCurrencyDollar}
        title="Plan"
      />
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-20 rounded-xl" />
    </section>
  );
}

export function BillingUnavailableSection({ orgSlug }: { orgSlug: string }) {
  const billingUrl = `/dashboard/${orgSlug}/settings/billing`;

  return (
    <section className="space-y-5">
      <SectionHeader
        description="Your current plan and usage limits"
        icon={IconCurrencyDollar}
        title="Plan"
      />
      <Card>
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="min-w-0">
            <p className="font-medium text-sm">Billing unavailable</p>
            <p className="text-muted-foreground text-xs">
              Plan status could not be loaded. Autopilot settings remain
              editable for admins.
            </p>
          </div>
          <Button
            className="shrink-0"
            onClick={() => window.location.assign(billingUrl)}
            size="sm"
            variant="outline"
          >
            Open Billing
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
