"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import { use, useState } from "react";

import { H1, H2, Muted, Text } from "@/components/ui/typography";

import { DEFAULT_LIMITS, PLANS } from "./billing-config";
import { BillingToggle } from "./billing-toggle";
import type { BillingInterval, PlanTier } from "./billing-types";
import { PlanCard } from "./plan-card";
import { UsageCard } from "./usage-card";

export default function BillingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const org = useQuery(api.organizations.getBySlug, { slug: orgSlug });
  const subscriptionStatus = useQuery(
    api.subscriptions.getStatus,
    org?._id ? { organizationId: org._id as Id<"organizations"> } : "skip"
  );

  const createCheckoutSession = useAction(
    api.subscriptions_actions.createCheckoutSession
  );
  const createPortalSession = useAction(
    api.subscriptions_actions.createCustomerPortalSession
  );

  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("yearly");

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <H2 variant="card">Organization not found</H2>
          <Muted className="mt-2">
            The organization you&apos;re looking for doesn&apos;t exist.
          </Muted>
        </div>
      </div>
    );
  }

  const currentTier: PlanTier =
    subscriptionStatus?.tier === "pro" ? "pro" : "free";
  const canManageBilling = subscriptionStatus?.canManageBilling ?? false;
  const canViewBilling = subscriptionStatus?.canViewBilling ?? false;
  const subscription = subscriptionStatus?.subscription ?? null;
  const usage = subscriptionStatus?.usage ?? { members: 0, feedback: 0 };
  const limits = subscriptionStatus?.limits ?? DEFAULT_LIMITS;

  const handleUpgrade = async (priceKey: string) => {
    if (!(org._id && canManageBilling && priceKey)) {
      return;
    }

    setIsLoading(priceKey);
    try {
      const result = await createCheckoutSession({
        organizationId: org._id as Id<"organizations">,
        priceKey: priceKey as "proMonthly" | "proYearly",
        successUrl: `${window.location.origin}/dashboard/${orgSlug}/settings/billing?success=true`,
        cancelUrl: `${window.location.origin}/dashboard/${orgSlug}/settings/billing?canceled=true`,
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
    } finally {
      setIsLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!(org._id && canViewBilling)) {
      return;
    }

    setIsLoading("portal");
    try {
      const result = await createPortalSession({
        organizationId: org._id as Id<"organizations">,
        returnUrl: `${window.location.origin}/dashboard/${orgSlug}/settings/billing`,
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Failed to create portal session:", error);
    } finally {
      setIsLoading(null);
    }
  };

  // Get yearly savings for the toggle
  const proYearlyPrice = PLANS.find((p) => p.id === "pro")?.prices.find(
    (p) => p.interval === "yearly"
  );

  return (
    <div>
      <div className="mb-8">
        <H1>Billing</H1>
        <Text className="text-muted-foreground" variant="bodySmall">
          Manage your organization&apos;s subscription and usage
        </Text>
      </div>

      <div className="space-y-8">
        {/* Billing Interval Toggle */}
        <BillingToggle
          interval={billingInterval}
          onChange={setBillingInterval}
          yearlySavings={proYearlyPrice?.savings}
        />

        {/* Plan Cards */}
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

        {/* Usage Section */}
        <UsageCard
          isPro={currentTier === "pro"}
          limits={limits}
          usage={usage}
        />
      </div>
    </div>
  );
}
