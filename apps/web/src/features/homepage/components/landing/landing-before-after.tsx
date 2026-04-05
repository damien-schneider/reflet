"use client";

/*
 * Before / After — interactive toggle comparing workflow without vs with Reflet.
 * This is Interactive Moment #2 — a stateful toggle between two scenarios.
 */

import { motion, useInView } from "motion/react";
import { useRef, useState } from "react";

import { H2, Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const BEFORE_ITEMS = [
  {
    label: "Hiring 6 people costs $600K+/year — and takes 3+ months to ramp",
    icon: "💸",
  },
  {
    label: "PM, dev, sales, support — all competing for your attention",
    icon: "🤹",
  },
  { label: "You're the bottleneck for every decision and review", icon: "🔁" },
  { label: "Nights and weekends just to keep up with competitors", icon: "😵" },
  {
    label: "Great ideas die because there's no one to execute them",
    icon: "💠",
  },
];

const AFTER_ITEMS = [
  {
    label: "7 AI agents cost a fraction of one hire — and start in 5 minutes",
    icon: "⚡",
  },
  {
    label:
      "PM creates initiatives, CTO writes specs, Dev ships PRs — all autonomous",
    icon: "🤖",
  },
  {
    label: "You're the President — set strategy, approve key decisions",
    icon: "👑",
  },
  {
    label: "Agents work 24/7 — your product improves while you sleep",
    icon: "🌙",
  },
  {
    label:
      "Every opportunity discovered, every lead contacted, every user supported",
    icon: "🚀",
  },
];

export default function LandingBeforeAfter() {
  const [isAfter, setIsAfter] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const items = isAfter ? AFTER_ITEMS : BEFORE_ITEMS;

  return (
    <section
      className="relative overflow-hidden bg-muted py-24 sm:py-32 dark:bg-sidebar"
      ref={ref}
    >
      <div className="mx-auto max-w-300 px-5 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left — text + toggle */}
          <motion.div
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            initial={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
          >
            <Text as="span" className="mb-3 block" variant="eyebrow">
              The difference
            </Text>
            <H2 className="mb-6" variant="landing">
              {isAfter ? (
                <>
                  7 agents.{" "}
                  <span className="text-olive-600 dark:text-olive-400">
                    Zero employees.
                  </span>
                </>
              ) : (
                <>
                  6 hires. 3 months.{" "}
                  <span className="text-muted-foreground">$600K.</span>
                </>
              )}
            </H2>

            {/* Toggle switch */}
            <div className="mb-8 flex items-center gap-3">
              <button
                className={cn(
                  "rounded-lg px-3.5 py-1.5 font-medium text-[13px] transition-all",
                  isAfter
                    ? "text-muted-foreground hover:text-foreground"
                    : "bg-card text-foreground shadow-sm"
                )}
                onClick={() => setIsAfter(false)}
                type="button"
              >
                Without Autopilot
              </button>
              <button
                className={cn(
                  "rounded-lg px-3.5 py-1.5 font-medium text-[13px] transition-all",
                  isAfter
                    ? "bg-olive-600 text-olive-100 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setIsAfter(true)}
                type="button"
              >
                With Autopilot
              </button>
            </div>

            {/* Description */}
            <motion.p
              animate={{ opacity: 1, y: 0 }}
              className="text-[15px] text-muted-foreground leading-relaxed"
              initial={{ opacity: 0, y: 6 }}
              key={isAfter ? "after" : "before"}
              transition={{ duration: 0.3 }}
            >
              {isAfter
                ? "Reflet Autopilot provides 7 AI agents that run your product autonomously — from market research to shipped code to sales outreach. You stay in control as President."
                : "Building a product alone means wearing every hat. Hiring a team costs $600K+ and takes months. Most founders burn out before finding product-market fit."}
            </motion.p>
          </motion.div>

          {/* Right — animated list */}
          <motion.div
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            className="space-y-3"
            initial={{ opacity: 0, x: 24 }}
            transition={{ delay: 0.15, duration: 0.7, ease: EASE_OUT_EXPO }}
          >
            {items.map((item, idx) => (
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex items-start gap-3.5 rounded-xl border p-4 transition-all",
                  isAfter
                    ? "border-olive-600/10 bg-olive-600/3 dark:border-olive-400/10 dark:bg-olive-400/4"
                    : "border-border bg-card"
                )}
                initial={{ opacity: 0, x: 16 }}
                key={item.label}
                transition={{
                  delay: idx * 0.06,
                  duration: 0.4,
                  ease: EASE_OUT_EXPO,
                }}
              >
                <span className="mt-0.5 text-[18px]">{item.icon}</span>
                <p className="text-[14px] text-foreground leading-relaxed">
                  {item.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
