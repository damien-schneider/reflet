"use client";

import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { PLANS } from "@/features/project/components/billing/billing-config";
import { BillingToggle } from "@/features/project/components/billing/billing-toggle";
import type {
  BillingInterval,
  PriceKey,
} from "@/features/project/components/billing/billing-types";
import { PlanCard } from "@/features/project/components/billing/plan-card";
import { UsageSection } from "@/features/project/components/billing/usage-card";
import { capture } from "@/lib/analytics";
import { SettingsPage, SettingsSection } from "./settings-page";

interface BillingSectionProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
}

const PRO_YEARLY_SAVINGS = PLANS.find((plan) => plan.id === "pro")?.prices.find(
  (price) => price.interval === "yearly"
)?.savings;

export function BillingSection({
  organizationId,
  orgSlug,
}: BillingSectionProps) {
  const subscriptionStatus = useQuery(api.billing.queries.getStatus, {
    organizationId,
  });
  const createCheckoutSession = useAction(
    api.billing.actions.createCheckoutSession
  );
  const createPortalSession = useAction(
    api.billing.actions.createCustomerPortalSession
  );
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("yearly");

  const redirectTo = async (
    key: string,
    open: () => Promise<{ url?: string | null }>
  ) => {
    setIsLoading(key);
    try {
      const result = await open();
      if (result.url) {
        window.location.href = result.url;
        return;
      }
    } catch {
      toast.error("Couldn’t open billing. Try again.");
    }
    setIsLoading(null);
  };

  const handleUpgrade = (priceKey: PriceKey) => {
    capture("plan_upgrade_clicked", {
      interval: priceKey === "proYearly" ? "yearly" : "monthly",
      plan: "pro",
    });
    return redirectTo(priceKey, () =>
      createCheckoutSession({
        cancelUrl: `${window.location.origin}/dashboard/${orgSlug}/project?canceled=true`,
        organizationId,
        priceKey,
        successUrl: `${window.location.origin}/dashboard/${orgSlug}/project?success=true`,
      })
    );
  };

  const handleManageSubscription = () =>
    redirectTo("portal", () =>
      createPortalSession({
        organizationId,
        returnUrl: `${window.location.origin}/dashboard/${orgSlug}/project/billing`,
      })
    );

  if (!subscriptionStatus) {
    return (
      <SettingsPage title="Billing">
        <div aria-busy="true" className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </SettingsPage>
    );
  }

  const currentTier = subscriptionStatus.tier === "pro" ? "pro" : "free";

  return (
    <SettingsPage
      description="Compare plans and manage your subscription."
      title="Billing"
    >
      <SettingsSection
        actions={
          <BillingToggle
            interval={billingInterval}
            onChange={setBillingInterval}
            yearlySavings={PRO_YEARLY_SAVINGS}
          />
        }
        title="Plans"
      >
        <div className="grid gap-6 md:grid-cols-2">
          {PLANS.map((plan) => (
            <PlanCard
              canManageBilling={subscriptionStatus.canManageBilling}
              canViewBilling={subscriptionStatus.canViewBilling}
              currentTier={currentTier}
              isLoading={isLoading}
              key={plan.id}
              onManageSubscription={handleManageSubscription}
              onUpgrade={handleUpgrade}
              plan={plan}
              selectedInterval={billingInterval}
              subscription={subscriptionStatus.subscription}
            />
          ))}
        </div>
      </SettingsSection>
      <UsageSection
        isPro={currentTier === "pro"}
        limits={subscriptionStatus.limits}
        usage={subscriptionStatus.usage}
      />
    </SettingsPage>
  );
}
