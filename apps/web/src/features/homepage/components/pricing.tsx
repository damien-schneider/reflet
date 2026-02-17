"use client";

import NumberFlow from "@number-flow/react";
import { Check } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { H2, H3 } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

type BillingInterval = "monthly" | "yearly";

const PRICING_TIERS = [
  {
    name: "Starter",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Perfect for open source projects and small startups.",
    features: [
      "Unlimited feedback posts",
      "Public roadmap",
      "1 Admin seat",
      "Changelog",
      "Community support",
    ],
    buttonText: "Get Started",
    buttonVariant: "outline" as const,
    highlighted: false,
  },
  {
    name: "Growth",
    monthlyPrice: 15,
    yearlyPrice: 150,
    yearlySavings: 30,
    description: "For growing teams needing privacy and integrations.",
    features: [
      "Everything in Starter",
      "Private boards",
      "5 Admin seats",
      "Slack & Discord integration",
      "Custom domain",
      "Priority support",
    ],
    buttonText: "Start Free Trial",
    buttonVariant: "secondary" as const,
    highlighted: true,
    badge: "Most popular",
  },
  {
    name: "Business",
    monthlyPrice: 49,
    yearlyPrice: 480,
    yearlySavings: 108,
    description: "Advanced control for larger organizations.",
    features: [
      "Everything in Growth",
      "Unlimited seats",
      "SSO (SAML)",
      "Remove Reflect branding",
      "API access",
      "Dedicated success manager",
    ],
    buttonText: "Contact Sales",
    buttonVariant: "outline" as const,
    highlighted: false,
  },
] as const;

function BillingToggle({
  interval,
  onChange,
}: {
  interval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
}) {
  return (
    <div className="mb-12 flex items-center justify-center gap-2">
      <Tabs
        onValueChange={(value) => {
          if (value === "monthly" || value === "yearly") {
            onChange(value);
          }
        }}
        value={interval}
      >
        <TabsList className="h-10">
          <TabsTrigger className="h-8 px-4" value="monthly">
            Monthly
          </TabsTrigger>
          <TabsTrigger className="h-8 px-4" value="yearly">
            Yearly
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <Badge
        className={cn(
          "ml-2 transition-opacity",
          interval === "yearly" ? "opacity-100" : "opacity-0"
        )}
        color="green"
      >
        Save 2 months
      </Badge>
    </div>
  );
}

export default function Pricing() {
  const [billingInterval, setBillingInterval] =
    useState<BillingInterval>("yearly");

  return (
    <section className="bg-background py-24" id="pricing">
      <div className="mx-auto max-w-7xl px-4 text-left sm:px-6 lg:px-8">
        <H2 className="mb-12" variant="section">
          Simple pricing for teams of all sizes.
        </H2>

        <BillingToggle
          interval={billingInterval}
          onChange={setBillingInterval}
        />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <PricingCard
              billingInterval={billingInterval}
              key={tier.name}
              tier={tier}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

interface PricingCardProps {
  tier: (typeof PRICING_TIERS)[number];
  billingInterval: BillingInterval;
}

function PricingCard({ tier, billingInterval }: PricingCardProps) {
  const isYearly = billingInterval === "yearly";
  const MONTHS_PER_YEAR = 12;
  const yearlyPrice = tier.yearlyPrice;
  const monthlyEquivalent = isYearly
    ? Math.round((yearlyPrice / MONTHS_PER_YEAR) * 100) / 100
    : tier.monthlyPrice;
  const displayPrice = monthlyEquivalent;
  const showSavings =
    isYearly && "yearlySavings" in tier && tier.yearlySavings > 0;

  if (tier.highlighted) {
    return (
      <div className="relative flex flex-col rounded-xl bg-primary p-8 text-primary-foreground shadow-xl">
        {"badge" in tier && (
          <div className="absolute top-8 right-8 rounded bg-primary-foreground/20 px-2 py-1 font-semibold text-primary-foreground text-xs">
            {tier.badge}
          </div>
        )}
        <H3 className="mb-2" variant="card">
          {tier.name}
        </H3>
        <div className="relative mb-1 flex items-baseline gap-1 pb-6">
          <span className="font-semibold text-2xl">
            {displayPrice === 0 ? (
              "Free"
            ) : (
              <>
                €
                <NumberFlow
                  transformTiming={{ duration: 400, easing: "ease-out" }}
                  value={displayPrice}
                />
              </>
            )}
          </span>
          {displayPrice > 0 && (
            <span className="text-primary-foreground/70">/mo</span>
          )}
          {"yearlySavings" in tier && tier.yearlySavings > 0 && (
            <Badge
              className={cn(
                "ml-2 transition-opacity",
                showSavings ? "opacity-100" : "opacity-0"
              )}
              color="green"
            >
              Save €
              <NumberFlow
                transformTiming={{ duration: 400, easing: "ease-out" }}
                value={tier.yearlySavings}
              />
              /yr
            </Badge>
          )}
          {displayPrice > 0 && (
            <p
              className={cn(
                "absolute bottom-0 left-0 text-primary-foreground/70 text-sm transition-opacity",
                isYearly ? "opacity-100" : "opacity-0"
              )}
            >
              Billed yearly (€{yearlyPrice})
            </p>
          )}
        </div>
        <p className="mb-8 min-h-[40px] text-primary-foreground/70 text-sm">
          {tier.description}
        </p>

        <ul className="mb-8 flex-1 space-y-4">
          {tier.features.map((item) => (
            <li
              className="flex items-start gap-3 text-primary-foreground/90 text-sm"
              key={item}
            >
              <Check
                className="mt-0.5 flex-shrink-0 text-primary-foreground"
                size={16}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <Link href="/dashboard">
          <Button
            className="w-full rounded-full"
            size="default"
            variant={tier.buttonVariant}
          >
            {tier.buttonText}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-transparent bg-secondary p-8 transition-colors hover:border-border">
      <H3 className="mb-2" variant="card">
        {tier.name}
      </H3>
      <div className="relative mb-1 flex items-baseline gap-1 pb-6">
        <span className="font-semibold text-2xl text-foreground">
          {displayPrice === 0 ? (
            "Free"
          ) : (
            <>
              €
              <NumberFlow
                transformTiming={{ duration: 400, easing: "ease-out" }}
                value={displayPrice}
              />
            </>
          )}
        </span>
        {displayPrice > 0 && <span className="text-muted-foreground">/mo</span>}
        {"yearlySavings" in tier && tier.yearlySavings > 0 && (
          <Badge
            className={cn(
              "ml-2 transition-opacity",
              showSavings ? "opacity-100" : "opacity-0"
            )}
            color="green"
          >
            Save €
            <NumberFlow
              transformTiming={{ duration: 400, easing: "ease-out" }}
              value={tier.yearlySavings}
            />
            /yr
          </Badge>
        )}
        {displayPrice > 0 && (
          <p
            className={cn(
              "absolute bottom-0 left-0 text-muted-foreground text-sm transition-opacity",
              isYearly ? "opacity-100" : "opacity-0"
            )}
          >
            Billed yearly (€{yearlyPrice})
          </p>
        )}
      </div>
      <p className="mb-8 min-h-[40px] text-muted-foreground text-sm">
        {tier.description}
      </p>

      <ul className="mb-8 flex-1 space-y-4">
        {tier.features.map((item) => (
          <li
            className="flex items-start gap-3 text-foreground text-sm"
            key={item}
          >
            <Check className="mt-0.5 flex-shrink-0 text-foreground" size={16} />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <Link href="/dashboard">
        <Button
          className="w-full rounded-full"
          size="default"
          variant={tier.buttonVariant}
        >
          {tier.buttonText}
        </Button>
      </Link>
    </div>
  );
}
