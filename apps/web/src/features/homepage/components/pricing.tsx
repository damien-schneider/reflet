"use client";

import { Check } from "@phosphor-icons/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { H2, H3 } from "@/components/ui/typography";

const PRICING_TIERS = [
  {
    name: "Starter",
    price: "$0",
    period: "/mo",
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
    price: "$29",
    period: "/mo",
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
    price: "$99",
    period: "/mo",
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

export default function Pricing() {
  return (
    <section className="bg-background py-24" id="pricing">
      <div className="mx-auto max-w-7xl px-4 text-left sm:px-6 lg:px-8">
        <H2 className="mb-20" variant="section">
          Simple pricing for teams of all sizes.
        </H2>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <PricingCard key={tier.name} tier={tier} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface PricingCardProps {
  tier: (typeof PRICING_TIERS)[number];
}

function PricingCard({ tier }: PricingCardProps) {
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
        <div className="mb-2 flex items-baseline gap-1">
          <span className="font-semibold text-2xl">{tier.price}</span>
          <span className="text-primary-foreground/70">{tier.period}</span>
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
      <div className="mb-2 flex items-baseline gap-1">
        <span className="font-semibold text-2xl text-foreground">
          {tier.price}
        </span>
        <span className="text-muted-foreground">{tier.period}</span>
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
