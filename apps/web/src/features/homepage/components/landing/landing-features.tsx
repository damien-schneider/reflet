"use client";

/*
 * Features bento grid — visual-first, interaction-rich cards.
 * Minimal text with animated mini-UI mockups and hover micro-interactions.
 */

import {
  Brain,
  ChatCircleDots,
  Code,
  GithubLogo,
  Lightning,
  Sparkle,
} from "@phosphor-icons/react";
import { motion, useInView } from "motion/react";
import type { JSX } from "react";
import { useRef } from "react";

import { H2, Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// ─── Mini UI: AI Triage ──────────────────────────────────────────────────────

function MiniAiTriage() {
  return (
    <div className="space-y-2.5">
      <div className="rounded-xl bg-muted/40 px-3 py-2.5 dark:bg-sidebar/50">
        <span className="font-medium text-[11px] text-foreground">
          &quot;Add keyboard shortcuts&quot;
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Sparkle
          className="shrink-0 text-violet-500 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"
          size={12}
          weight="fill"
        />
        <div className="flex gap-1">
          {[
            {
              label: "UX",
              style:
                "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
            },
            {
              label: "Productivity",
              style:
                "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
            },
            {
              label: "High",
              style:
                "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
            },
          ].map((tag, i) => (
            <span
              className={cn(
                "translate-y-px rounded-full px-1.5 py-px font-semibold text-[8px] transition-all duration-500 group-hover:translate-y-0",
                tag.style
              )}
              key={tag.label}
              style={{ transitionDelay: `${i * 75}ms` }}
            >
              {tag.label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-border/60 dark:bg-muted">
          <div className="h-full w-3/4 origin-left scale-x-[0.3] rounded-full bg-amber-500 transition-transform duration-700 ease-out group-hover:scale-x-100" />
        </div>
        <span className="font-medium text-[8px] text-amber-600 opacity-0 transition-opacity delay-300 duration-500 group-hover:opacity-100 dark:text-amber-400">
          High
        </span>
      </div>
    </div>
  );
}

// ─── Mini UI: Widget ─────────────────────────────────────────────────────────

function MiniWidget() {
  return (
    <div className="overflow-hidden rounded-lg border border-border/40">
      <div className="flex items-center gap-1 border-border/40 border-b px-2 py-1.5">
        <div className="size-1.5 rounded-full bg-rose-400/40" />
        <div className="size-1.5 rounded-full bg-amber-400/40" />
        <div className="size-1.5 rounded-full bg-emerald-400/40" />
      </div>
      <div className="relative bg-muted/20 p-4 dark:bg-sidebar/20">
        <div className="space-y-1.5">
          <div className="h-1.5 w-3/5 rounded bg-border/40 dark:bg-muted/40" />
          <div className="h-1.5 w-2/5 rounded bg-border/40 dark:bg-muted/40" />
          <div className="h-1.5 w-1/2 rounded bg-border/40 dark:bg-muted/40" />
        </div>
        <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1 rounded-full bg-olive-600 px-2 py-0.5 shadow-lg transition-transform duration-500 group-hover:scale-110 dark:bg-olive-500">
          <ChatCircleDots className="text-white" size={8} weight="fill" />
          <span className="font-semibold text-[7px] text-white">Feedback</span>
        </div>
      </div>
    </div>
  );
}

// ─── Mini UI: GitHub Sync ────────────────────────────────────────────────────

function MiniGithubSync() {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-full rounded-lg bg-muted/40 p-2.5 dark:bg-sidebar/50">
        <div className="flex items-center gap-1.5">
          <GithubLogo className="text-foreground" size={10} weight="fill" />
          <span className="font-medium text-[10px] text-foreground">
            PR #142 merged
          </span>
        </div>
      </div>
      <div className="h-3 w-px bg-olive-600/20 transition-all duration-500 group-hover:h-4 group-hover:bg-olive-600/40 dark:bg-olive-400/20 dark:group-hover:bg-olive-400/40" />
      <div className="w-full rounded-lg border border-emerald-200/50 bg-emerald-50/50 p-2.5 transition-colors duration-500 group-hover:border-emerald-300 group-hover:bg-emerald-50 dark:border-emerald-500/10 dark:bg-emerald-500/5 dark:group-hover:border-emerald-500/20">
        <div className="flex items-center gap-1.5">
          <div className="flex size-2.5 items-center justify-center rounded-full bg-emerald-500 transition-transform duration-500 group-hover:scale-110">
            <span className="text-[5px] text-white">&#10003;</span>
          </div>
          <span className="font-medium text-[10px] text-emerald-700 dark:text-emerald-300">
            Shipped
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Mini UI: Real-time ──────────────────────────────────────────────────────

function MiniRealtime() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="relative size-1.5">
            <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
            <div className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <span className="font-medium text-[10px] text-emerald-600 dark:text-emerald-400">
            Live
          </span>
        </div>
        <div className="flex -space-x-1.5">
          <div className="size-4 rounded-full border border-card bg-violet-400 transition-transform duration-300 group-hover:-translate-x-0.5" />
          <div className="size-4 rounded-full border border-card bg-sky-400" />
          <div className="size-4 rounded-full border border-card bg-rose-400 transition-transform duration-300 group-hover:translate-x-0.5" />
        </div>
      </div>
      <div className="space-y-1 rounded-lg bg-muted/30 p-2 dark:bg-sidebar/40">
        {[
          { color: "bg-violet-400", text: "Sarah voted" },
          { color: "bg-sky-400", text: "Mike commented" },
          { color: "bg-rose-400", text: "Priya updated" },
        ].map((item, i) => (
          <div
            className="flex items-center gap-1.5 transition-transform duration-300 group-hover:translate-x-0.5"
            key={item.text}
            style={{ transitionDelay: `${i * 50}ms` }}
          >
            <span className={cn("size-1 rounded-full", item.color)} />
            <span className="text-[9px] text-muted-foreground">
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Mini UI: API ────────────────────────────────────────────────────────────

function MiniApi() {
  return (
    <div className="overflow-hidden rounded-lg bg-olive-950 p-2.5 dark:bg-[#0d0d0b]">
      <pre className="font-mono text-[9px] leading-5">
        {[
          { method: "GET ", color: "text-emerald-400", path: "/api/feedback" },
          { method: "POST", color: "text-sky-400", path: " /api/feedback" },
          { method: "HOOK", color: "text-amber-400", path: " status.changed" },
        ].map((line, i) => (
          <div
            className="transition-transform duration-300 group-hover:translate-x-0.5"
            key={line.method}
            style={{ transitionDelay: `${i * 50}ms` }}
          >
            <span className={line.color}>{line.method}</span>
            <span className="text-olive-300/70">{line.path}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

// ─── Feature data ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    id: "ai",
    icon: Brain,
    accent: "text-violet-500",
    accentBg: "bg-violet-500/10 dark:bg-violet-500/15",
    title: "AI-Powered Triage",
    span: "sm:col-span-2",
  },
  {
    id: "widget",
    icon: ChatCircleDots,
    accent: "text-emerald-500",
    accentBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    title: "Embeddable Widget",
    span: "",
  },
  {
    id: "github",
    icon: GithubLogo,
    accent: "text-foreground",
    accentBg: "bg-muted dark:bg-muted",
    title: "Two-Way GitHub Sync",
    span: "",
  },
  {
    id: "realtime",
    icon: Lightning,
    accent: "text-amber-500",
    accentBg: "bg-amber-500/10 dark:bg-amber-500/15",
    title: "Real-Time Everything",
    span: "",
  },
  {
    id: "api",
    icon: Code,
    accent: "text-sky-500",
    accentBg: "bg-sky-500/10 dark:bg-sky-500/15",
    title: "REST API & Webhooks",
    span: "",
  },
] as const;

const MINI_UI_MAP: Record<string, () => JSX.Element> = {
  ai: MiniAiTriage,
  widget: MiniWidget,
  github: MiniGithubSync,
  realtime: MiniRealtime,
  api: MiniApi,
};

// ─── Main Component ──────────────────────────────────────────────────────────

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
          initial={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
        >
          <Text as="span" className="mb-3 block" variant="eyebrow">
            Built for product teams
          </Text>
          <H2 className="mb-4" variant="landing">
            Everything you need.{" "}
            <span className="text-muted-foreground">
              Nothing you don&apos;t.
            </span>
          </H2>
        </motion.div>

        {/* Bento grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            const MiniUI = MINI_UI_MAP[feature.id];
            return (
              <motion.div
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-border/40 bg-card/90 p-5 backdrop-blur-sm",
                  "transition-[border-color,box-shadow] duration-500 hover:border-border/80 hover:shadow-lg dark:hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.5)]",
                  feature.span
                )}
                initial={{ opacity: 0, y: 32 }}
                key={feature.id}
                transition={{
                  delay: 0.1 + idx * 0.07,
                  duration: 0.7,
                  ease: EASE_OUT_EXPO,
                }}
              >
                {/* Header */}
                <div className="mb-3 flex items-center gap-2">
                  <div
                    className={cn(
                      "flex size-6 items-center justify-center rounded-lg",
                      feature.accentBg
                    )}
                  >
                    <Icon
                      className={feature.accent}
                      size={13}
                      weight="duotone"
                    />
                  </div>
                  <h3 className="font-semibold text-[13px] text-foreground">
                    {feature.title}
                  </h3>
                </div>

                {/* Mini UI */}
                {MiniUI && <MiniUI />}

                {/* Hover glow */}
                <div
                  className={cn(
                    "pointer-events-none absolute -right-12 -bottom-12 size-32 rounded-full opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-50",
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
