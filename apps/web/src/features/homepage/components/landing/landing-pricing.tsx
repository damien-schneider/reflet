"use client";

/*
 * Pricing — 3 tiers with monthly/yearly toggle.
 * Redesigned with warm tones, editorial feel, and clear hierarchy.
 */

import NumberFlow from "@number-flow/react";
import { ArrowRight, Check } from "@phosphor-icons/react";
import { motion, useInView } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

type BillingInterval = "monthly" | "yearly";

const TIERS = [
  {
    name: "Starter",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "For open source projects and small teams getting started.",
    features: [
      "Unlimited feedback posts",
      "Public roadmap & changelog",
      "1 admin seat",
      "Community support",
      "Embeddable widget",
    ],
    cta: "Get started free",
    ctaVariant: "outline" as const,
    highlighted: false,
  },
  {
    name: "Growth",
    monthlyPrice: 15,
    yearlyPrice: 150,
    yearlySavings: 30,
    description: "For teams needing private boards and integrations.",
    features: [
      "Everything in Starter",
      "Private boards",
      "5 admin seats",
      "Slack & Discord integration",
      "Custom domain",
      "Priority support",
    ],
    cta: "Start 14-day free trial",
    ctaVariant: "default" as const,
    highlighted: true,
    badge: "Most popular",
  },
  {
    name: "Business",
    monthlyPrice: 49,
    yearlyPrice: 480,
    yearlySavings: 108,
    description: "Enterprise-grade control with unlimited access.",
    features: [
      "Everything in Growth",
      "Unlimited seats",
      "SSO (SAML)",
      "White-label branding",
      "Full API access",
      "Dedicated success manager",
    ],
    cta: "Talk to us",
    ctaVariant: "outline" as const,
    highlighted: false,
  },
] as const;

export default function LandingPricing() {
  const [interval, setInterval] = useState<BillingInterval>("yearly");
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });
  const isYearly = interval === "yearly";

  return (
    <section
      className="bg-[#f0efea] py-24 sm:py-32 dark:bg-[#151412]"
      id="pricing"
      ref={ref}
    >
      <div className="mx-auto max-w-300 px-5 sm:px-8">
        {/* Header */}
        <motion.div
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
        >
          <span className="mb-3 block font-semibold text-[11px] text-olive-600 uppercase tracking-[0.15em] dark:text-olive-400">
            Pricing
          </span>
          <h2 className="mb-4 max-w-120 font-display text-[clamp(1.8rem,4vw,3rem)] text-olive-950 leading-[1.1] tracking-[-0.02em] dark:text-olive-100">
            Free to start.{" "}
            <span className="text-muted-foreground">Scale when ready.</span>
          </h2>

          {/* Toggle */}
          <div className="flex items-center gap-2">
            <button
              className={cn(
                "rounded-lg px-3.5 py-1.5 font-medium text-[13px] transition-all",
                isYearly
                  ? "text-muted-foreground hover:text-foreground"
                  : "bg-[#faf9f7] text-foreground shadow-sm dark:bg-[#1e1d1a]"
              )}
              onClick={() => setInterval("monthly")}
              type="button"
            >
              Monthly
            </button>
            <button
              className={cn(
                "rounded-lg px-3.5 py-1.5 font-medium text-[13px] transition-all",
                isYearly
                  ? "bg-[#faf9f7] text-foreground shadow-sm dark:bg-[#1e1d1a]"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setInterval("yearly")}
              type="button"
            >
              Yearly
            </button>
            <span
              className={cn(
                "ml-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-medium text-[11px] text-emerald-600 transition-opacity dark:text-emerald-400",
                isYearly ? "opacity-100" : "opacity-0"
              )}
            >
              Save 2 months
            </span>
          </div>
        </motion.div>

        {/* Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {TIERS.map((tier, idx) => {
            const price = isYearly ? tier.yearlyPrice / 12 : tier.monthlyPrice;
            return (
              <motion.div
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                className={cn(
                  "relative flex flex-col overflow-hidden rounded-2xl border p-6 transition-all",
                  tier.highlighted
                    ? "border-olive-600/30 bg-[#faf9f7] shadow-lg dark:border-olive-400/30 dark:bg-[#1e1d1a]"
                    : "border-[#e8e6e1] bg-[#faf9f7] dark:border-[#ffffff0d] dark:bg-[#1e1d1a]"
                )}
                initial={{ opacity: 0, y: 24 }}
                key={tier.name}
                transition={{
                  delay: 0.15 + idx * 0.1,
                  duration: 0.6,
                  ease: EASE_OUT_EXPO,
                }}
              >
                {/* Badge */}
                {tier.highlighted && (
                  <div className="absolute top-0 right-0 rounded-bl-xl bg-olive-600 px-3 py-1 font-semibold text-[10px] text-olive-100">
                    {tier.badge}
                  </div>
                )}

                {/* Name */}
                <h3 className="mb-1 font-semibold text-[16px] text-foreground">
                  {tier.name}
                </h3>
                <p className="mb-5 text-[13px] text-muted-foreground">
                  {tier.description}
                </p>

                {/* Price */}
                <div className="mb-6 flex items-baseline gap-1">
                  <span className="font-display text-[2.5rem] text-olive-950 tracking-[-0.02em] dark:text-olive-100">
                    $<NumberFlow value={Math.round(price)} />
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    /month
                  </span>
                </div>

                {/* Features */}
                <ul className="mb-8 flex-1 space-y-2.5">
                  {tier.features.map((feature) => (
                    <li
                      className="flex items-start gap-2 text-[13px] text-foreground"
                      key={feature}
                    >
                      <Check
                        className="mt-0.5 shrink-0 text-olive-600 dark:text-olive-400"
                        size={14}
                        weight="bold"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link href="/dashboard">
                  <Button
                    className={cn(
                      "h-10 w-full rounded-xl text-[13px]",
                      tier.highlighted && "rounded-full"
                    )}
                    variant={tier.ctaVariant}
                  >
                    {tier.cta}
                    {tier.highlighted && (
                      <ArrowRight className="ml-1" size={14} />
                    )}
                  </Button>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
