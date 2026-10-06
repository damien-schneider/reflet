"use client";

import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import NumberFlow from "@number-flow/react";
import { ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PLANS } from "@/features/project/components/billing/billing-config";
import type {
  BillingInterval,
  Plan,
  PlanPrice,
} from "@/features/project/components/billing/billing-types";

function PublicPlan({
  plan,
  interval,
}: {
  plan: Plan;
  interval: BillingInterval;
}) {
  const price =
    plan.prices.find((candidate) => candidate.interval === interval) ??
    plan.prices[0];
  if (!price) {
    return null;
  }
  return (
    <article className="marketing-plan" data-plan={plan.id}>
      <h3>{plan.name}</h3>
      <p>{plan.description}</p>
      <PlanPriceDisplay planId={plan.id} price={price} />
      <ButtonLink
        className="w-full"
        render={<Link href="/dashboard" />}
        size="lg"
        tone={plan.id === "pro" ? "primary" : "neutral"}
        variant={plan.id === "pro" ? "solid" : "surface"}
      >
        {plan.id === "free" ? "Start for free" : "Get started with Pro"}{" "}
        <ArrowUpRight aria-hidden="true" size={15} />
      </ButtonLink>
      <ul>
        {plan.features.map((feature) =>
          feature.included ? (
            <li key={feature.label}>
              <Check aria-hidden="true" size={14} />
              {feature.label}
            </li>
          ) : null
        )}
      </ul>
    </article>
  );
}

export function MarketingPricing({
  standalone = false,
}: {
  standalone?: boolean;
}) {
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("yearly");
  const Heading = standalone ? "h1" : "h2";

  return (
    <section
      className="marketing-pricing marketing-section"
      data-testid="marketing-pricing"
      id="pricing"
    >
      <div className="marketing-section-intro">
        <span className="marketing-kicker">Pricing</span>
        <Heading>
          Great products.
          <br />
          <span>Down-to-earth pricing.</span>
        </Heading>
        <p>
          Start collecting feedback for free. Upgrade when your team needs more
          room or your own branding.
        </p>
      </div>
      <BillingToggle interval={billingInterval} onChange={setBillingInterval} />
      <div className="marketing-plans">
        {PLANS.map((plan) => (
          <PublicPlan interval={billingInterval} key={plan.id} plan={plan} />
        ))}
      </div>
      <div className="marketing-open-source">
        <div>
          <strong>Open source</strong>
          <p>Read the code, contribute, or host Reflet yourself.</p>
        </div>
        <a href="https://github.com/damien-schneider/reflet">
          View on GitHub <ArrowUpRight aria-hidden="true" size={14} />
        </a>
      </div>
    </section>
  );
}

function PlanPriceDisplay({
  price,
  planId,
}: {
  price: PlanPrice;
  planId: Plan["id"];
}) {
  const monthlyAmount =
    price.interval === "yearly" ? price.amount / 12 : price.amount;
  const formattedAmount = Number.isInteger(monthlyAmount)
    ? String(monthlyAmount)
    : monthlyAmount.toFixed(2);

  return (
    <>
      <div className="marketing-plan-price">
        <strong data-testid={`${planId}-price`}>
          <span className="sr-only">
            {price.currency}
            {formattedAmount}
          </span>
          <NumberFlow
            aria-hidden="true"
            format={{
              maximumFractionDigits: 2,
              minimumFractionDigits: Number.isInteger(monthlyAmount) ? 0 : 2,
            }}
            prefix={price.currency}
            value={monthlyAmount}
          />
        </strong>
        <span>/ month</span>
      </div>
      <p className="marketing-plan-billing">
        {price.interval === "yearly"
          ? `${price.currency}${price.amount} billed yearly`
          : "No annual commitment"}
      </p>
    </>
  );
}

function BillingToggle({
  interval,
  onChange,
}: {
  interval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
}) {
  return (
    <fieldset
      aria-label="Billing interval"
      className="marketing-billing-toggle"
      data-interval={interval}
    >
      <span aria-hidden="true" className="marketing-billing-indicator" />
      {(["monthly", "yearly"] as const).map((value) => (
        <Button
          aria-pressed={interval === value}
          key={value}
          onClick={() => onChange(value)}
          size="sm"
          variant="ghost"
        >
          {value === "monthly" ? "Monthly" : "Yearly"}
        </Button>
      ))}
    </fieldset>
  );
}
