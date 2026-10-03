import { cn } from "@ctrl-ui/react/lib/cn";
import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button } from "@ctrl-ui/react/ui/button";
import { Card } from "@ctrl-ui/react/ui/card";
import NumberFlow from "@number-flow/react";
import { Check, Crown, Minus, Sparkle, Warning } from "@phosphor-icons/react";
import { TagBadge } from "@/components/tag-badge";

import type {
  BillingInterval,
  Plan,
  PlanPrice,
  PlanTier,
  PriceKey,
  SubscriptionData,
} from "./billing-types";

const PRICE_TIMING = { duration: 300, easing: "ease-out" } as const;

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
    <li className="flex items-center gap-2 text-body">
      {included ? (
        <Check
          aria-hidden
          className={cn(
            "size-4 shrink-0",
            highlight ? "text-success-text" : "text-muted-foreground"
          )}
          weight="bold"
        />
      ) : (
        <Minus aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className={included ? undefined : "text-muted-foreground"}>
        {label}
        {included ? null : <span className="sr-only"> (not included)</span>}
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
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-heading-1">Free</span>
        <span className="text-caption text-muted-foreground">Free forever</span>
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
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline gap-1">
        <span className="font-semibold text-heading-1 tabular-nums">
          {price.currency}
          <NumberFlow transformTiming={PRICE_TIMING} value={displayAmount} />
        </span>
        <span className="text-body text-muted-foreground">/mo</span>
        {price.savings && (
          <TagBadge
            aria-hidden={!showYearlyDetails}
            className={cn(
              "ml-2 transition-opacity duration-(--duration-base) ease-(--ease-standard) motion-reduce:transition-none",
              showYearlyDetails ? "opacity-100" : "opacity-0"
            )}
            color="green"
          >
            Save {price.currency}
            <NumberFlow transformTiming={PRICE_TIMING} value={price.savings} />
            /yr
          </TagBadge>
        )}
      </div>
      <span className="text-caption text-muted-foreground tabular-nums">
        {isYearly
          ? `Billed yearly (${price.currency}${price.amount})`
          : "Billed monthly"}
      </span>
    </div>
  );
}

function PlanActions({
  canManageBilling,
  isCurrentPlan,
  isUpgrade,
  isLoading,
  planId,
  priceKey,
  onUpgrade,
  onManageSubscription,
}: {
  canManageBilling: boolean;
  isCurrentPlan: boolean;
  isUpgrade: boolean;
  isLoading: string | null;
  planId: PlanTier;
  priceKey: PriceKey | null;
  onUpgrade: () => void;
  onManageSubscription: () => void;
}) {
  if (isCurrentPlan && planId === "pro" && canManageBilling) {
    return (
      <div className="mt-auto">
        <Button
          className="w-full"
          disabled={isLoading === "portal"}
          onClick={onManageSubscription}
          variant="surface"
        >
          {isLoading === "portal" ? "Opening…" : "Manage subscription"}
        </Button>
      </div>
    );
  }

  if (!canManageBilling) {
    if (isUpgrade) {
      return (
        <div className="mt-auto">
          <p className="text-center text-body text-muted-foreground">
            Only the organization owner can upgrade
          </p>
        </div>
      );
    }
    return null;
  }

  if (isCurrentPlan && planId === "free") {
    return (
      <div className="mt-auto">
        <Button className="w-full" disabled variant="surface">
          Current plan
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
          tone="primary"
          variant="solid"
        >
          {isLoading === priceKey ? (
            "Redirecting…"
          ) : (
            <>
              <Crown aria-hidden data-icon="inline-start" weight="fill" />
              Upgrade to Pro
            </>
          )}
        </Button>
      </div>
    );
  }

  return null;
}

export function PlanCard({
  plan,
  currentTier,
  selectedInterval,
  isLoading,
  canManageBilling,
  subscription,
  onUpgrade,
  onManageSubscription,
}: {
  plan: Plan;
  currentTier: PlanTier;
  selectedInterval: BillingInterval;
  isLoading: string | null;
  canManageBilling: boolean;
  subscription: SubscriptionData | null;
  onUpgrade: (priceKey: PriceKey) => void;
  onManageSubscription: () => void;
}) {
  const isCurrentPlan = plan.id === currentTier;
  const price =
    plan.prices.find((p) => p.interval === selectedInterval) ?? plan.prices[0];
  const isUpgrade = plan.id === "pro" && currentTier === "free";

  return (
    <Card
      aria-current={isCurrentPlan ? "true" : undefined}
      className={cn(
        "relative flex flex-col gap-6 p-6",
        plan.highlighted && "ring-2 ring-ring"
      )}
    >
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="default">{plan.badge}</Badge>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {plan.id === "pro" ? (
            <Crown
              aria-hidden
              className="size-5 text-warning-text"
              weight="fill"
            />
          ) : (
            <Sparkle aria-hidden className="size-5 text-muted-foreground" />
          )}
          <h3 className="text-balance text-heading-4">{plan.name}</h3>
          {isCurrentPlan && (
            <Badge className="ml-auto" color="green" size="sm">
              Current plan
            </Badge>
          )}
        </div>
        <p className="text-pretty text-body text-muted-foreground">
          {plan.description}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-6">
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

        {isCurrentPlan && plan.id === "pro" && subscription && (
          <div className="rounded-(--radius-field) border bg-muted/30 p-3 text-body">
            {subscription.cancelAtPeriodEnd ? (
              <div className="flex items-center gap-2 text-warning-text">
                <Warning aria-hidden className="size-4" weight="fill" />
                <p>
                  Cancels on{" "}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Renews on{" "}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        <PlanActions
          canManageBilling={canManageBilling}
          isCurrentPlan={isCurrentPlan}
          isLoading={isLoading}
          isUpgrade={isUpgrade}
          onManageSubscription={onManageSubscription}
          onUpgrade={() => {
            if (price.priceKey) {
              onUpgrade(price.priceKey);
            }
          }}
          planId={plan.id}
          priceKey={price.priceKey}
        />
      </div>
    </Card>
  );
}
