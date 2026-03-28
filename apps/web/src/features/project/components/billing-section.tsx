"use client";

import {
  DEFAULT_LIMITS,
  PLANS,
} from "@app/(app)/dashboard/[orgSlug]/settings/billing/billing-config";
import { BillingToggle } from "@app/(app)/dashboard/[orgSlug]/settings/billing/billing-toggle";
import type {
  BillingInterval,
  PlanTier,
} from "@app/(app)/dashboard/[orgSlug]/settings/billing/billing-types";
import { PlanCard } from "@app/(app)/dashboard/[orgSlug]/settings/billing/plan-card";
import { UsageSection } from "@app/(app)/dashboard/[orgSlug]/settings/billing/usage-card";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { capture } from "@/lib/analytics";

interface BillingSectionProps {
  organizationId: Id<"organizations">;
  orgSlug: string;
}

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

  const currentTier: PlanTier =
    subscriptionStatus?.tier === "pro" ? "pro" : "free";
  const canManageBilling = subscriptionStatus?.canManageBilling ?? false;
  const canViewBilling = subscriptionStatus?.canViewBilling ?? false;
  const subscription = subscriptionStatus?.subscription ?? null;
  const usage = subscriptionStatus?.usage ?? { members: 0, feedback: 0 };
  const limits = subscriptionStatus?.limits ?? DEFAULT_LIMITS;

  const handleUpgrade = async (priceKey: string) => {
    if (!(organizationId && canManageBilling && priceKey)) {
      return;
    }

    setIsLoading(priceKey);
    capture("plan_upgrade_clicked", {
      plan: "pro",
      interval: priceKey.includes("Yearly") ? "yearly" : "monthly",
    });
    try {
      const result = await createCheckoutSession({
        organizationId,
        priceKey: priceKey as "proMonthly" | "proYearly",
        successUrl: `${window.location.origin}/dashboard/${orgSlug}/project?success=true`,
        cancelUrl: `${window.location.origin}/dashboard/${orgSlug}/project?canceled=true`,
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (_error) {
      // Billing checkout error — Stripe handles display
    } finally {
      setIsLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!(organizationId && canViewBilling)) {
      return;
    }

    setIsLoading("portal");
    try {
      const result = await createPortalSession({
        organizationId,
        returnUrl: `${window.location.origin}/dashboard/${orgSlug}/project`,
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (_error) {
      // Portal session error — Stripe handles display
    } finally {
      setIsLoading(null);
    }
  };

  const proYearlyPrice = PLANS.find((p) => p.id === "pro")?.prices.find(
    (p) => p.interval === "yearly"
  );

  return (
    <div className="space-y-8">
      <BillingToggle
        interval={billingInterval}
        onChange={setBillingInterval}
        yearlySavings={proYearlyPrice?.savings}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {PLANS.map((plan) => (
          <PlanCard
            canManageBilling={canManageBilling}
            canViewBilling={canViewBilling}
            currentTier={currentTier}
            isLoading={isLoading}
            key={plan.id}
            onManageSubscription={handleManageSubscription}
            onUpgrade={handleUpgrade}
            plan={plan}
            selectedInterval={billingInterval}
            subscription={subscription}
          />
        ))}
      </div>

      <UsageSection
        isPro={currentTier === "pro"}
        limits={limits}
        usage={usage}
      />
    </div>
  );
}
