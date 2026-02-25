"use client";

/*
 * Product Tour — deep-dive feature blocks for Widget/SDK and AI.
 * Alternating layout with rich mockups in warm editorial style.
 */

import {
  ChatCircleDots,
  Code,
  GitMerge,
  Lightning,
  Sparkle,
  Tag,
} from "@phosphor-icons/react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// ─── Widget / SDK Mockup ─────────────────────────────────────────────────────

const CODE_LINES = [
  { text: "import { RefletProvider, FeedbackButton }", hl: true },
  { text: "  from 'reflet-sdk/react'", hl: true },
  { text: "", hl: false },
  { text: "export function App() {", hl: false },
  { text: "  return (", hl: false },
  { text: '    <RefletProvider publicKey="pk_live_…a3f">', hl: true },
  { text: "      <FeedbackButton />", hl: true },
  { text: "    </RefletProvider>", hl: true },
  { text: "  )", hl: false },
  { text: "}", hl: false },
] as const;

function WidgetMockup() {
  return (
    <div className="space-y-4">
      {/* Code editor */}
      <div className="overflow-hidden rounded-2xl border border-[#e8e6e1] bg-[#faf9f7] shadow-[0_20px_50px_-12px_rgba(45,59,66,0.1)] dark:border-[#ffffff0d] dark:bg-[#1e1d1a]">
        {/* Chrome */}
        <div className="flex items-center gap-3 border-[#e8e6e1] border-b bg-[#f0efea] px-4 py-2.5 dark:border-[#ffffff0d] dark:bg-[#151412]">
          <div className="flex gap-1.5">
            <div className="size-2.5 rounded-full bg-[#ff5f57]/60" />
            <div className="size-2.5 rounded-full bg-[#febc2e]/60" />
            <div className="size-2.5 rounded-full bg-[#28c840]/60" />
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">
            app.tsx
          </span>
        </div>

        {/* Code */}
        <div className="p-4">
          <pre className="font-mono text-[12px] leading-6">
            {CODE_LINES.map((line, i) => (
              <div
                className={cn(
                  "flex",
                  line.hl && "rounded bg-olive-600/5 dark:bg-olive-400/5"
                )}
                key={`code-${i.toString()}`}
              >
                <span className="mr-4 inline-block w-4 select-none text-right text-[11px] text-muted-foreground/40">
                  {i + 1}
                </span>
                <span
                  className={
                    line.hl
                      ? "text-olive-700 dark:text-olive-300"
                      : "text-foreground/80"
                  }
                >
                  {line.text}
                </span>
              </div>
            ))}
          </pre>
        </div>
      </div>

      {/* Widget preview */}
      <div className="flex items-center justify-end gap-3 pr-2">
        <span className="text-[13px] text-muted-foreground">Result →</span>
        <div className="flex h-10 items-center gap-2 rounded-full bg-olive-600 px-4 shadow-lg dark:bg-olive-500">
          <ChatCircleDots className="text-white" size={16} weight="fill" />
          <span className="font-medium text-[13px] text-white">Feedback</span>
        </div>
      </div>
    </div>
  );
}

// ─── AI Analysis Mockup ──────────────────────────────────────────────────────

const AI_AUTO_TAGS = [
  { label: "UX", color: "purple" as const },
  { label: "Productivity", color: "blue" as const },
];

function AIMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8e6e1] bg-[#faf9f7] shadow-[0_20px_50px_-12px_rgba(45,59,66,0.1)] dark:border-[#ffffff0d] dark:bg-[#1e1d1a]">
      {/* Header */}
      <div className="flex items-center justify-between border-[#e8e6e1] border-b px-5 py-3 dark:border-[#ffffff0d]">
        <div className="flex items-center gap-2">
          <Sparkle className="text-violet-500" size={15} weight="fill" />
          <span className="font-semibold text-[13px] text-foreground">
            AI Analysis
          </span>
        </div>
        <Badge color="green">94% confidence</Badge>
      </div>

      {/* Subject */}
      <div className="border-[#e8e6e1] border-b px-5 py-3 dark:border-[#ffffff0d]">
        <span className="mb-1 block text-[10px] text-muted-foreground uppercase tracking-wider">
          Analyzing
        </span>
        <span className="font-medium text-[13px] text-foreground">
          Add keyboard shortcuts for power users
        </span>
      </div>

      {/* Results */}
      <div className="divide-y divide-[#e8e6e1] dark:divide-[#ffffff0d]">
        {/* Tags */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Tag className="text-muted-foreground" size={13} />
            <span className="text-[12px] text-muted-foreground">Auto-tags</span>
          </div>
          <div className="flex gap-1.5">
            {AI_AUTO_TAGS.map((tag) => (
              <Badge color={tag.color} key={tag.label}>
                <Sparkle data-icon="inline-start" size={9} weight="fill" />
                {tag.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Lightning className="text-muted-foreground" size={13} />
            <span className="text-[12px] text-muted-foreground">Priority</span>
          </div>
          <Badge color="orange">Medium</Badge>
        </div>

        {/* Complexity */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Code className="text-muted-foreground" size={13} />
            <span className="text-[12px] text-muted-foreground">
              Complexity
            </span>
          </div>
          <span className="font-medium text-[12px] text-foreground">
            Simple · ~2h
          </span>
        </div>

        {/* Duplicate */}
        <div className="px-5 py-3">
          <div className="mb-2 flex items-center gap-2">
            <GitMerge className="text-muted-foreground" size={13} />
            <span className="text-[12px] text-muted-foreground">
              Duplicate detected
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[#e8e6e1] bg-[#f0efea]/50 px-3 py-2 dark:border-[#ffffff0d] dark:bg-[#151412]">
            <div className="flex items-center gap-2">
              <Badge color="yellow">87% match</Badge>
              <span className="text-[12px] text-foreground">
                Vim keybindings support
              </span>
            </div>
            <button
              className="rounded-md bg-olive-600 px-2 py-1 font-medium text-[10px] text-white transition-colors hover:bg-olive-700 dark:bg-olive-500"
              type="button"
            >
              Merge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Feature blocks ──────────────────────────────────────────────────────────

const TOUR_SECTIONS = [
  {
    id: "widget-sdk",
    badge: "Developer Experience",
    title: "Embed feedback anywhere with two lines",
    description:
      "Drop-in widget via script tag, or go deep with React hooks. TypeScript-first SDK with useFeedbackList(), useVote(), and more.",
    reverse: false,
    mockup: "widget" as const,
  },
  {
    id: "ai-features",
    badge: "AI-Powered Intelligence",
    title: "Let AI handle the busywork",
    description:
      "Automatic tagging, priority estimation, complexity scoring, and duplicate detection. Your team triages in minutes, not hours.",
    reverse: true,
    mockup: "ai" as const,
  },
];

export default function LandingProductTour() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <section className="py-24 sm:py-32" ref={ref}>
      <div className="mx-auto max-w-300 px-5 sm:px-8">
        {/* Section header */}
        <motion.div
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-20 text-center"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
        >
          <span className="mb-3 block font-semibold text-[11px] text-olive-600 uppercase tracking-[0.15em] dark:text-olive-400">
            Product Tour
          </span>
          <h2 className="mb-4 font-display text-[clamp(1.8rem,4vw,3rem)] text-olive-950 leading-[1.1] tracking-[-0.02em] dark:text-olive-100">
            See how Reflet works
          </h2>
          <p className="mx-auto max-w-120 text-[15px] text-muted-foreground leading-relaxed sm:text-[17px]">
            From collecting feedback to shipping features your users actually
            want.
          </p>
        </motion.div>

        {/* Feature blocks */}
        <div className="space-y-28">
          {TOUR_SECTIONS.map((section, idx) => (
            <motion.div
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20"
              initial={{ opacity: 0, y: 30 }}
              key={section.id}
              transition={{
                delay: 0.15 + idx * 0.15,
                duration: 0.7,
                ease: EASE_OUT_EXPO,
              }}
            >
              <div className={section.reverse ? "lg:order-2" : ""}>
                <span className="mb-4 inline-block rounded-full bg-olive-600/10 px-3.5 py-1 font-semibold text-[11px] text-olive-600 uppercase tracking-widest dark:bg-olive-400/10 dark:text-olive-400">
                  {section.badge}
                </span>
                <h3 className="mb-3 font-display text-[clamp(1.4rem,3vw,2rem)] text-olive-950 leading-[1.15] tracking-[-0.01em] dark:text-olive-100">
                  {section.title}
                </h3>
                <p className="max-w-md text-[15px] text-muted-foreground leading-relaxed">
                  {section.description}
                </p>
              </div>
              <div className={section.reverse ? "lg:order-1" : ""}>
                {section.mockup === "widget" ? <WidgetMockup /> : <AIMockup />}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
