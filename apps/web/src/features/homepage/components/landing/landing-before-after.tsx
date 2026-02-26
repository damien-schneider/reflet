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
    label: "Feedback scattered across Slack, email, and Intercom",
    icon: "😵",
  },
  { label: "No way to know which features users want most", icon: "🤷" },
  { label: "Same requests reported 5 times by different people", icon: "🔁" },
  { label: "Users never know if their request was heard", icon: "📢" },
  {
    label: "Roadmap decisions made on gut, not data",
    icon: "🎲",
  },
];

const AFTER_ITEMS = [
  {
    label: "Every request in one board — widget, API, or public portal",
    icon: "📥",
  },
  {
    label: "Vote counts surface the most-wanted features instantly",
    icon: "📊",
  },
  {
    label: "AI detects and merges duplicates automatically (91% accuracy)",
    icon: "🤖",
  },
  {
    label: "Voters get notified the moment you ship their request",
    icon: "🔔",
  },
  {
    label: "Roadmap backed by real demand, visible to your whole team",
    icon: "🗺️",
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
                  Every voice heard.{" "}
                  <span className="text-olive-600 dark:text-olive-400">
                    Every ship celebrated.
                  </span>
                </>
              ) : (
                <>
                  Feedback gets lost.{" "}
                  <span className="text-muted-foreground">
                    Users feel ignored.
                  </span>
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
                Without Reflet
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
                With Reflet
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
                ? "Reflet transforms scattered feedback into a prioritized, AI-triaged pipeline that closes the loop every time you ship."
                : "Without a feedback system, teams rely on memory, spreadsheets, and guesswork. Critical signals fall through the cracks."}
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
