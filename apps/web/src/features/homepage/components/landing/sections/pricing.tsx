"use client";

import NumberFlow from "@number-flow/react";
import { ArrowRight, Check } from "@phosphor-icons/react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { H2, Lead } from "@/components/ui/typography";
import { capture } from "@/lib/analytics";
import { cn } from "@/lib/utils";

import { SNAP } from "../../../lib/motion";

const INTERVALS = [
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
] as const;

type BillingInterval = (typeof INTERVALS)[number]["id"];

const TIERS = [
  {
    cta: "Get started free",
    ctaVariant: "outline" as const,
    description: "For open source and small teams.",
    features: [
      "Unlimited feedback posts",
      "Public roadmap & changelog",
      "1 admin seat",
      "Embeddable widget",
    ],
    highlighted: false,
    monthlyPrice: 0,
    name: "Starter",
    yearlyPrice: 0,
  },
  {
    cta: "Start 14-day trial",
    ctaVariant: "default" as const,
    description: "For teams that need private boards.",
    features: [
      "Everything in Starter",
      "Private boards",
      "5 admin seats",
      "Slack & Discord",
      "Custom domain",
      "Priority support",
    ],
    highlighted: true,
    monthlyPrice: 15,
    name: "Growth",
    yearlyPrice: 144,
  },
  {
    cta: "Talk to us",
    ctaVariant: "outline" as const,
    description: "Enterprise control, unlimited access.",
    features: [
      "Everything in Growth",
      "Unlimited seats",
      "SSO (SAML)",
      "White-label branding",
      "Full API access",
    ],
    highlighted: false,
    monthlyPrice: 50,
    name: "Business",
    yearlyPrice: 480,
  },
] as const;

function monthlyOf(tier: (typeof TIERS)[number], isYearly: boolean): number {
  return Math.round(isYearly ? tier.yearlyPrice / 12 : tier.monthlyPrice);
}

export default function LandingPricing() {
  const [billing, setBilling] = useState<BillingInterval>("yearly");
  const isYearly = billing === "yearly";

  return (
    <section
      className="waterline relative pt-32 pb-40 sm:pt-40 sm:pb-52"
      id="pricing"
    >
      <div className="mx-auto max-w-220 px-5 sm:px-8">
        <div className="mb-16">
          <H2 className="mb-5 max-w-120" variant="landing">
            Free to start. Scale when ready.
          </H2>
          <Lead className="mb-9 max-w-105" size="sm">
            No seat minimums, no per-request billing. Cancel whenever.
          </Lead>

          <div className="flex items-center gap-3">
            <div className="relative flex rounded-full border border-border/80 bg-muted p-1 dark:bg-sidebar">
              {INTERVALS.map((option) => (
                <button
                  aria-pressed={billing === option.id}
                  className={cn(
                    "relative flex h-9 cursor-pointer items-center rounded-full px-4 font-medium text-[13px] transition-colors",
                    billing === option.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  key={option.id}
                  onClick={() => {
                    setBilling(option.id);
                    capture("pricing_billing_toggled", {
                      interval: option.id,
                    });
                  }}
                  type="button"
                >
                  {billing === option.id && (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-card shadow-[0_1px_2px_rgba(20,18,11,0.1)] dark:bg-olive-800 dark:shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
                      layoutId="pricing-interval"
                      transition={SNAP}
                    />
                  )}
                  <span className="relative">{option.label}</span>
                </button>
              ))}
            </div>

            <motion.span
              animate={{ opacity: isYearly ? 1 : 0 }}
              className="font-medium text-[13px] text-olive-600 dark:text-olive-400"
              transition={{ duration: 0.3 }}
            >
              Save 20%
            </motion.span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 md:gap-x-16">
          {TIERS.map((tier) => (
            <div
              className={cn(
                "group relative flex flex-col border border-transparent border-b-border/70 px-0 py-10 transition-colors duration-500 ease-out md:border-b-transparent",
                tier.highlighted &&
                  "-mx-5 rounded-2xl border border-border/70 bg-card px-5 py-9 shadow-[0_2px_10px_-2px_rgba(20,18,11,0.07)] md:-mx-7 md:rounded-2xl md:border-t-border/70 md:border-r-border/70 md:border-b-border/70 md:border-l-border/70 md:bg-card md:px-7 md:py-10 md:shadow-[0_2px_10px_-2px_rgba(20,18,11,0.07),0_36px_70px_-28px_rgba(20,18,11,0.3)] dark:md:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_28px_70px_-26px_rgba(0,0,0,0.9)]"
              )}
              key={tier.name}
            >
              <h3
                className={cn(
                  "mb-1 font-semibold text-[15px]",
                  tier.highlighted
                    ? "text-olive-700 dark:text-olive-300"
                    : "text-foreground"
                )}
              >
                {tier.name}
              </h3>
              <p className="mb-8 min-h-5 text-[13px] text-muted-foreground">
                {tier.description}
              </p>

              <div className="mb-9">
                <div aria-hidden="true" className="flex items-baseline gap-1.5">
                  <span className="font-display text-[2.75rem] text-olive-950 leading-none tracking-[-0.02em] dark:text-olive-100">
                    $
                    <NumberFlow value={monthlyOf(tier, isYearly)} />
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    /month
                  </span>
                </div>
                <p
                  aria-hidden="true"
                  className="mt-2 min-h-5 text-[13px] text-muted-foreground"
                >
                  {isYearly &&
                    tier.monthlyPrice > 0 &&
                    `$${tier.yearlyPrice} billed yearly`}
                </p>
                <span className="sr-only">
                  ${monthlyOf(tier, isYearly)} per month
                  {isYearly && tier.monthlyPrice > 0
                    ? `, $${tier.yearlyPrice} billed yearly`
                    : ""}
                </span>
              </div>

              <ul className="mb-10 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li
                    className="flex items-start gap-2 text-[13px] text-foreground"
                    key={feature}
                  >
                    <Check
                      className="mt-0.5 shrink-0 text-olive-600 dark:text-olive-400"
                      size={13}
                      weight="bold"
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className="h-10 w-full rounded-full text-[13px]"
                onClick={() =>
                  capture("pricing_tier_clicked", {
                    interval: billing,
                    tier: tier.name,
                  })
                }
                render={<Link href="/dashboard" />}
                variant={tier.ctaVariant}
              >
                {tier.cta}
                {tier.highlighted && <ArrowRight className="ml-1" size={13} />}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
