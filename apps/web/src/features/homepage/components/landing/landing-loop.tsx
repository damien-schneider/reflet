"use client";

/*
 * The Loop — 4-step flow showing how feedback becomes shipped product.
 * Uses a horizontal timeline on desktop, vertical cards on mobile.
 * Interactive hover-to-expand with icon animations.
 */

import { Brain, Code, MegaphoneSimple, Tray } from "@phosphor-icons/react";
import { motion, useInView } from "motion/react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";

import { H2, Lead, Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import { LOOP_STEPS } from "./landing-data";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const ICON_MAP: Record<string, ReactNode> = {
  inbox: <Tray size={22} weight="duotone" />,
  brain: <Brain size={22} weight="duotone" />,
  code: <Code size={22} weight="duotone" />,
  megaphone: <MegaphoneSimple size={22} weight="duotone" />,
};

export default function LandingLoop() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <section className="py-24 sm:py-32" ref={ref}>
      <div className="mx-auto max-w-300 px-5 sm:px-8">
        {/* Section header */}
        <motion.div
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-16 max-w-135"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
        >
          <Text as="span" className="mb-3 block" variant="eyebrow">
            How it works
          </Text>
          <H2 className="mb-4" variant="landing">
            From noise to <span className="italic">shipped features</span>
          </H2>
          <Lead size="sm">
            Four steps. Fully automated where it matters, transparent where it
            counts.
          </Lead>
        </motion.div>

        {/* Steps grid — 4 columns on desktop, stacked on mobile */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LOOP_STEPS.map((step, idx) => (
            <motion.div
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300",
                hoveredIdx === idx
                  ? "border-olive-600/20 bg-olive-600/3 shadow-lg dark:border-olive-400/20 dark:bg-olive-400/4"
                  : "border-border bg-card"
              )}
              initial={{ opacity: 0, y: 24 }}
              key={step.step}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              transition={{
                delay: 0.15 + idx * 0.1,
                duration: 0.6,
                ease: EASE_OUT_EXPO,
              }}
            >
              {/* Step number */}
              <span className="mb-4 block font-bold font-mono text-[11px] text-muted-foreground/50">
                {String(step.step).padStart(2, "0")}
              </span>

              {/* Icon */}
              <div
                className={cn(
                  "mb-4 flex size-11 items-center justify-center rounded-xl transition-colors duration-300",
                  hoveredIdx === idx
                    ? "bg-olive-600/10 text-olive-600 dark:bg-olive-400/10 dark:text-olive-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {ICON_MAP[step.icon]}
              </div>

              {/* Title */}
              <h3 className="mb-2 font-semibold text-[16px] text-foreground">
                {step.title}
              </h3>

              {/* Description */}
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {step.description}
              </p>

              {/* Connector arrow (desktop only, not on last) */}
              {idx < LOOP_STEPS.length - 1 && (
                <div className="pointer-events-none absolute top-1/2 -right-3 hidden -translate-y-1/2 text-border lg:block">
                  <svg
                    aria-hidden="true"
                    fill="none"
                    height="12"
                    viewBox="0 0 12 12"
                    width="12"
                  >
                    <path
                      d="M2 6h8M7 3l3 3-3 3"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
