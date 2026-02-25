"use client";

/*
 * Features bento grid — rich mini-UI mockups per card.
 * Webflow-quality asymmetric layout with visual-first cards.
 */

import {
  Brain,
  ChatCircleDots,
  Code,
  GithubLogo,
  GitMerge,
  Lightning,
  Sparkle,
} from "@phosphor-icons/react";
import { motion, useInView } from "motion/react";
import type { JSX } from "react";
import { useRef } from "react";

import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// ─── Mini UI: AI Triage ──────────────────────────────────────────────────────

function MiniAiTriage() {
  return (
    <div className="space-y-2.5">
      <div className="rounded-lg border border-[#e8e6e1] bg-[#f0efea]/60 p-2.5 dark:border-[#ffffff0d] dark:bg-[#151412]">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Sparkle className="text-violet-500" size={10} weight="fill" />
          <span className="text-[10px] text-muted-foreground">Analyzing…</span>
        </div>
        <span className="font-medium text-[11px] text-foreground">
          &quot;Add keyboard shortcuts for power users&quot;
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        <span className="rounded-full bg-violet-100 px-2 py-0.5 font-medium text-[9px] text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
          UX
        </span>
        <span className="rounded-full bg-blue-100 px-2 py-0.5 font-medium text-[9px] text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
          Productivity
        </span>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-[9px] text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          Enhancement
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-10 text-[9px] text-muted-foreground">Priority</span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#e8e6e1] dark:bg-[#ffffff0d]">
          <div className="h-full w-3/4 rounded-full bg-amber-500" />
        </div>
        <span className="font-medium text-[9px] text-amber-600 dark:text-amber-400">
          High
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-10 text-[9px] text-muted-foreground">Effort</span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#e8e6e1] dark:bg-[#ffffff0d]">
          <div className="h-full w-1/3 rounded-full bg-emerald-500" />
        </div>
        <span className="font-medium text-[9px] text-emerald-600 dark:text-emerald-400">
          Low
        </span>
      </div>
      <div className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 p-2 dark:border-amber-500/20 dark:bg-amber-500/5">
        <GitMerge
          className="shrink-0 text-amber-600 dark:text-amber-400"
          size={10}
        />
        <span className="text-[9px] text-amber-700 dark:text-amber-300">
          87% match — &quot;Vim keybindings&quot;
        </span>
      </div>
    </div>
  );
}

// ─── Mini UI: GitHub Sync ────────────────────────────────────────────────────

function MiniGithubSync() {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-[#e8e6e1] bg-[#f0efea]/60 p-2.5 dark:border-[#ffffff0d] dark:bg-[#151412]">
        <div className="mb-1 flex items-center gap-1.5">
          <GithubLogo className="text-foreground" size={11} weight="fill" />
          <span className="font-medium text-[10px] text-foreground">
            PR #142 merged
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground">
          feat: add dark mode support
        </span>
      </div>
      <div className="flex justify-center">
        <div className="h-4 w-px bg-olive-600/30 dark:bg-olive-400/30" />
      </div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 dark:border-emerald-500/20 dark:bg-emerald-500/5">
        <div className="flex items-center gap-1.5">
          <div className="flex size-3 items-center justify-center rounded-full bg-emerald-500">
            <span className="text-[6px] text-white">✓</span>
          </div>
          <span className="font-medium text-[10px] text-emerald-700 dark:text-emerald-300">
            Dark mode → Shipped
          </span>
        </div>
        <span className="mt-0.5 block text-[9px] text-emerald-600/70 dark:text-emerald-400/70">
          Changelog v2.4.0 auto-generated
        </span>
      </div>
    </div>
  );
}

// ─── Mini UI: Widget ─────────────────────────────────────────────────────────

function MiniWidget() {
  return (
    <div className="relative overflow-hidden rounded-lg border border-[#e8e6e1] dark:border-[#ffffff0d]">
      <div className="flex items-center gap-1.5 border-[#e8e6e1] border-b bg-[#f0efea]/60 px-2.5 py-1.5 dark:border-[#ffffff0d] dark:bg-[#151412]">
        <div className="size-1.5 rounded-full bg-[#ff5f57]/40" />
        <div className="size-1.5 rounded-full bg-[#febc2e]/40" />
        <div className="size-1.5 rounded-full bg-[#28c840]/40" />
        <div className="ml-1.5 h-3 flex-1 rounded bg-[#e8e6e1] dark:bg-[#ffffff08]" />
      </div>
      <div className="relative bg-[#f0efea]/30 p-4 dark:bg-[#151412]/30">
        <div className="space-y-2">
          <div className="h-1.5 w-3/4 rounded bg-[#e8e6e1] dark:bg-[#ffffff08]" />
          <div className="h-1.5 w-1/2 rounded bg-[#e8e6e1] dark:bg-[#ffffff08]" />
          <div className="h-1.5 w-2/3 rounded bg-[#e8e6e1] dark:bg-[#ffffff08]" />
          <div className="h-1.5 w-1/3 rounded bg-[#e8e6e1] dark:bg-[#ffffff08]" />
        </div>
        <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-full bg-olive-600 px-2.5 py-1 shadow-lg dark:bg-olive-500">
          <ChatCircleDots className="text-white" size={9} weight="fill" />
          <span className="font-medium text-[8px] text-white">Feedback</span>
        </div>
      </div>
    </div>
  );
}

// ─── Mini UI: Real-time ──────────────────────────────────────────────────────

function MiniRealtime() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="relative size-1.5">
            <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
            <div className="relative size-1.5 rounded-full bg-emerald-500" />
          </div>
          <span className="font-medium text-[10px] text-emerald-600 dark:text-emerald-400">
            Live
          </span>
        </div>
        <div className="flex -space-x-1">
          <div className="size-5 rounded-full border border-[#faf9f7] bg-violet-500 dark:border-[#1e1d1a]" />
          <div className="size-5 rounded-full border border-[#faf9f7] bg-sky-500 dark:border-[#1e1d1a]" />
          <div className="size-5 rounded-full border border-[#faf9f7] bg-rose-500 dark:border-[#1e1d1a]" />
        </div>
      </div>
      <div className="space-y-1.5 rounded-lg border border-[#e8e6e1] bg-[#f0efea]/60 p-2.5 dark:border-[#ffffff0d] dark:bg-[#151412]">
        <div className="flex items-center gap-1.5">
          <span className="size-1 rounded-full bg-violet-400" />
          <span className="text-[9px] text-muted-foreground">
            Sarah voted on &quot;Dark mode&quot;
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-1 rounded-full bg-sky-400" />
          <span className="text-[9px] text-muted-foreground">
            Mike added a comment
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-1 rounded-full bg-rose-400" />
          <span className="text-[9px] text-muted-foreground">
            Priya changed status
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Mini UI: API ────────────────────────────────────────────────────────────

function MiniApi() {
  return (
    <div className="overflow-hidden rounded-lg bg-olive-950 p-3 dark:bg-[#0d0d0b]">
      <pre className="font-mono text-[9px] leading-5">
        <div>
          <span className="text-emerald-400">GET </span>
          <span className="text-olive-300/70">/api/feedback</span>
        </div>
        <div>
          <span className="text-sky-400">POST</span>
          <span className="text-olive-300/70"> /api/feedback</span>
        </div>
        <div>
          <span className="text-amber-400">PATCH</span>
          <span className="text-olive-300/70"> /api/feedback/:id</span>
        </div>
        <div className="mt-1.5 border-olive-700/30 border-t pt-1.5">
          <span className="text-violet-400">HOOK </span>
          <span className="text-olive-300/70">status.changed</span>
        </div>
      </pre>
    </div>
  );
}

// ─── Mini UI: Integrations ───────────────────────────────────────────────────

function MiniIntegrations() {
  return (
    <div className="grid gap-2.5 sm:grid-cols-3">
      <div className="rounded-lg border border-[#e8e6e1] bg-[#f0efea]/60 p-2.5 dark:border-[#ffffff0d] dark:bg-[#151412]">
        <div className="mb-1 flex items-center gap-1.5">
          <div className="flex size-4 items-center justify-center rounded bg-[#4A154B]">
            <span className="font-bold text-[7px] text-white">S</span>
          </div>
          <span className="font-medium text-[10px] text-foreground">
            #feedback
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground">
          New request: &quot;Add dark mode&quot;
        </span>
      </div>
      <div className="rounded-lg border border-[#e8e6e1] bg-[#f0efea]/60 p-2.5 dark:border-[#ffffff0d] dark:bg-[#151412]">
        <div className="mb-1 flex items-center gap-1.5">
          <div className="flex size-4 items-center justify-center rounded bg-[#5865F2]">
            <span className="font-bold text-[7px] text-white">D</span>
          </div>
          <span className="font-medium text-[10px] text-foreground">
            #updates
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground">
          New vote on &quot;Dark mode support&quot;
        </span>
      </div>
      <div className="rounded-lg border border-[#e8e6e1] bg-[#f0efea]/60 p-2.5 dark:border-[#ffffff0d] dark:bg-[#151412]">
        <div className="mb-1 flex items-center gap-1.5">
          <div className="flex size-4 items-center justify-center rounded bg-olive-600 dark:bg-olive-500">
            <Lightning className="text-white" size={7} weight="fill" />
          </div>
          <span className="font-medium text-[10px] text-foreground">
            Webhook
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground">
          POST api.your-app.com/hooks
        </span>
      </div>
    </div>
  );
}

// ─── Feature card data ───────────────────────────────────────────────────────

const FEATURES = [
  {
    id: "ai",
    icon: Brain,
    accent: "text-violet-500",
    accentBg: "bg-violet-500/10 dark:bg-violet-500/15",
    title: "AI-Powered Triage",
    description:
      "Auto-tag, score priority, estimate complexity, and detect duplicates — all in milliseconds.",
    span: "sm:col-span-2",
  },
  {
    id: "widget",
    icon: ChatCircleDots,
    accent: "text-emerald-500",
    accentBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    title: "Embeddable Widget",
    description:
      "Drop a script tag into your app. Users submit feedback without leaving your product.",
    span: "",
  },
  {
    id: "github",
    icon: GithubLogo,
    accent: "text-foreground",
    accentBg: "bg-[#f0efea] dark:bg-[#ffffff08]",
    title: "Two-Way GitHub Sync",
    description:
      "Link feedback to issues. When a PR merges, the linked request moves to shipped.",
    span: "",
  },
  {
    id: "realtime",
    icon: Lightning,
    accent: "text-amber-500",
    accentBg: "bg-amber-500/10 dark:bg-amber-500/15",
    title: "Real-Time Everything",
    description:
      "Built on Convex — votes, comments, and status changes sync instantly.",
    span: "",
  },
  {
    id: "api",
    icon: Code,
    accent: "text-sky-500",
    accentBg: "bg-sky-500/10 dark:bg-sky-500/15",
    title: "REST API & Webhooks",
    description: "Full CRUD API. Webhooks fire on every status transition.",
    span: "",
  },
  {
    id: "integrations",
    icon: Lightning,
    accent: "text-rose-500",
    accentBg: "bg-rose-500/10 dark:bg-rose-500/15",
    title: "Integrations",
    description:
      "Slack, Discord, and more. Get notified, create feedback from messages.",
    span: "sm:col-span-2 lg:col-span-3",
  },
] as const;

const MINI_UI_MAP: Record<string, () => JSX.Element> = {
  ai: MiniAiTriage,
  widget: MiniWidget,
  github: MiniGithubSync,
  realtime: MiniRealtime,
  api: MiniApi,
  integrations: MiniIntegrations,
};

export default function LandingFeatures() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

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
          <span className="mb-3 block font-semibold text-[11px] text-olive-600 uppercase tracking-[0.15em] dark:text-olive-400">
            Built for product teams
          </span>
          <h2 className="mb-4 font-display text-[clamp(1.8rem,4vw,3rem)] text-olive-950 leading-[1.1] tracking-[-0.02em] dark:text-olive-100">
            Everything you need.{" "}
            <span className="text-muted-foreground">
              Nothing you don&apos;t.
            </span>
          </h2>
        </motion.div>

        {/* Bento grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            const MiniUI = MINI_UI_MAP[feature.id];
            return (
              <motion.div
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-[#e8e6e1] bg-[#faf9f7] p-5 transition-all hover:shadow-lg dark:border-[#ffffff0d] dark:bg-[#1e1d1a] dark:hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)]",
                  feature.span
                )}
                initial={{ opacity: 0, y: 24 }}
                key={feature.id}
                transition={{
                  delay: 0.08 + idx * 0.06,
                  duration: 0.6,
                  ease: EASE_OUT_EXPO,
                }}
              >
                {/* Icon + Title header */}
                <div className="mb-1 flex items-center gap-2.5">
                  <div
                    className={cn(
                      "flex size-7 items-center justify-center rounded-lg",
                      feature.accentBg,
                      feature.accent
                    )}
                  >
                    <Icon size={14} weight="duotone" />
                  </div>
                  <h3 className="font-semibold text-[14px] text-foreground">
                    {feature.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="mb-3 text-[12px] text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>

                {/* Mini UI mockup */}
                {MiniUI && <MiniUI />}

                {/* Hover glow */}
                <div
                  className={cn(
                    "pointer-events-none absolute -right-12 -bottom-12 size-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100",
                    feature.accentBg
                  )}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
