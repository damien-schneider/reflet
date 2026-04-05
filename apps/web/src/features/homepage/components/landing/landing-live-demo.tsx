"use client";

/*
 * "Try the real thing" CTA — mid-page call-to-action with condensed
 * product previews using the same components as the real app.
 * Each preview links to the live public board.
 */

import {
  ArrowSquareOut,
  ChatCircleDots,
  Kanban,
  MegaphoneSimple,
} from "@phosphor-icons/react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { H2, Text } from "@/components/ui/typography";

import {
  CompactChangelogPreview,
  CompactFeedbackPreview,
  CompactRoadmapPreview,
} from "./landing-compact-previews";

const REFLET_BASE = "https://www.reflet.app/reflet";
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// ─── Main Section ────────────────────────────────────────────────────────────

export default function LandingLiveDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section
      className="relative overflow-hidden bg-muted py-24 sm:py-32 dark:bg-sidebar"
      ref={ref}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(120,113,80,0.06),transparent)]" />

      <div className="relative mx-auto max-w-300 px-5 sm:px-8">
        {/* Header */}
        <motion.div
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
        >
          <Text as="span" className="mb-3 block" variant="eyebrow">
            See the real product
          </Text>
          <H2 className="mx-auto mb-4 max-w-135" variant="landing">
            Try the{" "}
            <span className="text-olive-600 italic dark:text-olive-400">
              real
            </span>{" "}
            product
          </H2>
          <p className="mx-auto max-w-100 text-[15px] text-muted-foreground leading-relaxed sm:text-[17px]">
            This isn&apos;t a mockup. Click through Reflet&apos;s live board
            where AI agents and users collaborate in real time.
          </p>
        </motion.div>

        {/* Primary CTA — Feedback Board */}
        <motion.a
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="group relative mb-5 block overflow-hidden rounded-2xl border border-border/80 bg-card/50 p-5 backdrop-blur-sm transition-all hover:border-olive-600/30 hover:shadow-xl sm:p-7 dark:border-border/50 dark:bg-card/30 dark:hover:border-olive-400/20 dark:hover:shadow-[0_8px_40px_-8px_rgba(0,0,0,0.5)]"
          href={REFLET_BASE}
          initial={{ opacity: 0, y: 28 }}
          rel="noopener noreferrer"
          target="_blank"
          transition={{ delay: 0.15, duration: 0.7, ease: EASE_OUT_EXPO }}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-olive-600/[0.03] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:from-olive-400/[0.04]" />

          <div className="relative grid items-center gap-6 sm:grid-cols-2 sm:gap-10">
            {/* Text side */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-olive-600/10 text-olive-600 dark:bg-olive-400/10 dark:text-olive-400">
                  <ChatCircleDots size={20} weight="duotone" />
                </div>
                <div>
                  <h3 className="font-display text-[1.25rem] text-olive-950 tracking-[-0.01em] dark:text-olive-100">
                    Feedback Board
                  </h3>
                  <span className="text-[12px] text-muted-foreground">
                    reflet.app/reflet
                  </span>
                </div>
              </div>

              <p className="mb-6 max-w-80 text-[14px] text-muted-foreground leading-relaxed sm:text-[15px]">
                Browse real feature requests and AI-discovered opportunities.
                Upvote ideas, see agent activity, and watch AI triage in action.
              </p>

              <span className="inline-flex items-center gap-2 rounded-full bg-olive-600 px-5 py-2.5 font-medium text-[14px] text-olive-100 shadow-[0_2px_12px_rgba(120,113,80,0.25)] transition-all group-hover:bg-olive-700 group-hover:shadow-[0_4px_20px_rgba(120,113,80,0.35)]">
                Open feedback board
                <ArrowSquareOut size={14} weight="bold" />
              </span>
            </div>

            {/* Product preview */}
            <div className="relative transition-transform duration-500 group-hover:scale-[1.01]">
              <CompactFeedbackPreview />
            </div>
          </div>
        </motion.a>

        {/* Secondary CTAs — Roadmap & Changelog */}
        <div className="grid gap-5 sm:grid-cols-2">
          {/* Roadmap */}
          <motion.a
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            className="group relative block overflow-hidden rounded-2xl border border-border/80 bg-card/50 p-5 backdrop-blur-sm transition-all hover:border-olive-600/30 hover:shadow-lg dark:border-border/50 dark:bg-card/30 dark:hover:border-olive-400/20 dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)]"
            href={`${REFLET_BASE}?view=roadmap`}
            initial={{ opacity: 0, y: 24 }}
            rel="noopener noreferrer"
            target="_blank"
            transition={{ delay: 0.25, duration: 0.7, ease: EASE_OUT_EXPO }}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:from-amber-400/[0.05]" />

            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
                    <Kanban size={16} weight="duotone" />
                  </div>
                  <h3 className="font-display text-[1.05rem] text-olive-950 tracking-[-0.01em] dark:text-olive-100">
                    Roadmap
                  </h3>
                </div>
                <ArrowSquareOut
                  className="text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                  size={16}
                />
              </div>

              <p className="mb-4 text-[13px] text-muted-foreground leading-relaxed">
                Planned, in progress, shipped — see what&apos;s coming next.
              </p>

              <div className="transition-transform duration-500 group-hover:scale-[1.01]">
                <CompactRoadmapPreview />
              </div>
            </div>
          </motion.a>

          {/* Changelog */}
          <motion.a
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            className="group relative block overflow-hidden rounded-2xl border border-border/80 bg-card/50 p-5 backdrop-blur-sm transition-all hover:border-olive-600/30 hover:shadow-lg dark:border-border/50 dark:bg-card/30 dark:hover:border-olive-400/20 dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)]"
            href={`${REFLET_BASE}?view=changelog`}
            initial={{ opacity: 0, y: 24 }}
            rel="noopener noreferrer"
            target="_blank"
            transition={{ delay: 0.3, duration: 0.7, ease: EASE_OUT_EXPO }}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.03] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:from-violet-400/[0.05]" />

            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400">
                    <MegaphoneSimple size={16} weight="duotone" />
                  </div>
                  <h3 className="font-display text-[1.05rem] text-olive-950 tracking-[-0.01em] dark:text-olive-100">
                    Changelog
                  </h3>
                </div>
                <ArrowSquareOut
                  className="text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
                  size={16}
                />
              </div>

              <p className="mb-4 text-[13px] text-muted-foreground leading-relaxed">
                Every release documented. Feedback turns into shipped features.
              </p>

              <div className="transition-transform duration-500 group-hover:scale-[1.01]">
                <CompactChangelogPreview />
              </div>
            </div>
          </motion.a>
        </div>
      </div>
    </section>
  );
}
