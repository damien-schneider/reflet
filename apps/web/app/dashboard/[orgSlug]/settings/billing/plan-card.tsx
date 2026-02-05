import NumberFlow from "@number-flow/react";
import { Check, Crown, Sparkle, Warning } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Text } from "@/components/ui/typography";

import type {
  BillingInterval,
  Plan,
  PlanPrice,
  PlanTier,
  SubscriptionData,
} from "./billing-types";

// ============================================
// SUB-COMPONENTS
// ============================================

function FeatureItem({
  label,
  included,
  highlight,
}: {
  label: string;
  included: boolean;
  highlight?: boolean;
}) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {included ? (
        <Check
          className={`h-4 w-4 shrink-0 ${highlight ? "text-green-500" : "text-muted-foreground"}`}
          weight="bold"
        />
      ) : (
        <span className="h-4 w-4 shrink-0" />
      )}
      <span className={included ? "" : "text-muted-foreground/50"}>
        {label}
      </span>
    </li>
  );
}

function PriceDisplay({
  price,
  isSelected,
}: {
  price: PlanPrice;
  isSelected?: boolean;
}) {
  if (price.amount === 0) {
    return (
      <div className="relative flex flex-col gap-1 pb-6">
        <div className="flex items-baseline gap-1">
          <span className="font-bold text-3xl">Free</span>
        </div>
        <span className="absolute bottom-0 left-0 text-muted-foreground text-sm opacity-0">
          Placeholder
        </span>
      </div>
    );
  }

  const isYearly = price.interval === "yearly";
  const MONTHS_PER_YEAR = 12;
  const displayAmount = isYearly
    ? Math.round((price.amount / MONTHS_PER_YEAR) * 100) / 100
    : price.amount;

  const showYearlyDetails = isYearly && price.savings && isSelected;

  return (
    <div className="relative flex flex-col gap-1 pb-6">
      <div className="flex items-baseline gap-1">
        <span className="font-bold text-3xl">
          {price.currency}
          <NumberFlow
            transformTiming={{ duration: 400, easing: "ease-out" }}
            value={displayAmount}
          />
        </span>
        <span className="text-muted-foreground">/mo</span>
        {price.savings && (
          <Badge
            className={`ml-2 transition-opacity ${showYearlyDetails ? "opacity-100" : "opacity-0"}`}
            color="green"
          >
            Save {price.currency}
            <NumberFlow
              transformTiming={{ duration: 400, easing: "ease-out" }}
              value={price.savings}
            />
            /yr
          </Badge>
        )}
      </div>
      <span
        className={`absolute bottom-0 left-0 text-muted-foreground text-sm transition-opacity ${
          isYearly ? "opacity-100" : "opacity-0"
        }`}
      >
        Billed yearly ({price.currency}
        {price.amount})
      </span>
    </div>
  );
}

function PlanActions({
  canManageBilling,
  canViewBilling,
  isCurrentPlan,
  isUpgrade,
  isLoading,
  planId,
  priceKey,
  onUpgrade,
  onManageSubscription,
}: {
  canManageBilling: boolean;
  canViewBilling: boolean;
  isCurrentPlan: boolean;
  isUpgrade: boolean;
  isLoading: string | null;
  planId: PlanTier;
  priceKey: string;
  onUpgrade: () => void;
  onManageSubscription: () => void;
}) {
  // Show manage subscription button for Pro plan - any member can view the portal
  if (isCurrentPlan && planId === "pro" && canViewBilling) {
    return (
      <div className="mt-auto">
        <Button
          className="w-full"
          disabled={isLoading === "portal"}
          onClick={onManageSubscription}
          variant="outline"
        >
          {isLoading === "portal" ? "Opening..." : "Manage Subscription"}
        </Button>
      </div>
    );
  }

  // Only owners can upgrade
  if (!canManageBilling) {
    if (isUpgrade) {
      return (
        <div className="mt-auto">
          <Text
            className="text-center text-muted-foreground"
            variant="bodySmall"
          >
            Only the organization owner can upgrade
          </Text>
        </div>
      );
    }
    return null;
  }

  if (isCurrentPlan && planId === "free") {
    return (
      <div className="mt-auto">
        <Button className="w-full" disabled variant="outline">
          Current Plan
        </Button>
      </div>
    );
  }

  if (isUpgrade) {
    return (
      <div className="mt-auto">
        <Button
          className="w-full"
          disabled={isLoading !== null}
          onClick={onUpgrade}
        >
          {isLoading === priceKey ? (
            "Redirecting..."
          ) : (
            <>
              <Crown className="mr-2 h-4 w-4" weight="fill" />
              Upgrade to Pro
            </>
          )}
        </Button>
      </div>
    );
  }

  return null;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PlanCard({
  plan,
  currentTier,
  selectedInterval,
  isLoading,
  canManageBilling,
  canViewBilling,
  subscription,
  onUpgrade,
  onManageSubscription,
}: {
  plan: Plan;
  currentTier: PlanTier;
  selectedInterval: BillingInterval;
  isLoading: string | null;
  canManageBilling: boolean;
  canViewBilling: boolean;
  subscription: SubscriptionData | null;
  onUpgrade: (priceKey: string) => void;
  onManageSubscription: () => void;
}) {
  const isCurrentPlan = plan.id === currentTier;
  const price =
    plan.prices.find((p) => p.interval === selectedInterval) ?? plan.prices[0];
  const isUpgrade = plan.id === "pro" && currentTier === "free";

  return (
    <Card
      className={`relative flex flex-col ${
        plan.highlighted ? "ring-2 ring-olive-600 dark:ring-olive-500" : ""
      }`}
    >
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="default">{plan.badge}</Badge>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {plan.id === "pro" ? (
            <Crown className="h-5 w-5 text-amber-500" weight="fill" />
          ) : (
            <Sparkle className="h-5 w-5 text-muted-foreground" />
          )}
          <CardTitle>{plan.name}</CardTitle>
          {isCurrentPlan && (
            <Badge className="ml-auto" variant="outline">
              Current Plan
            </Badge>
          )}
        </div>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-6">
        <PriceDisplay
          isSelected={selectedInterval === "yearly"}
          price={price}
        />

        <ul className="flex-1 space-y-2">
          {plan.features.map((feature) => (
            <FeatureItem
              highlight={feature.highlight}
              included={feature.included}
              key={feature.label}
              label={feature.label}
            />
          ))}
        </ul>

        {/* Subscription status for current Pro plan */}
        {isCurrentPlan && plan.id === "pro" && subscription && (
          <div className="rounded-lg border bg-muted/30 p-3">
            {subscription.cancelAtPeriodEnd ? (
              <div className="flex items-center gap-2 text-amber-600">
                <Warning className="h-4 w-4" weight="fill" />
                <Text variant="bodySmall">
                  Cancels on{" "}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </Text>
              </div>
            ) : (
              <Text className="text-muted-foreground" variant="bodySmall">
                Renews on{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </Text>
            )}
          </div>
        )}

        {/* Actions */}
        <PlanActions
          canManageBilling={canManageBilling}
          canViewBilling={canViewBilling}
          isCurrentPlan={isCurrentPlan}
          isLoading={isLoading}
          isUpgrade={isUpgrade}
          onManageSubscription={onManageSubscription}
          onUpgrade={() => onUpgrade(price.priceKey)}
          planId={plan.id}
          priceKey={price.priceKey}
        />
      </CardContent>
    </Card>
  );
}
