"use client";

/*
 * Features bento grid — visual-first, interaction-rich cards.
 * Showcasing Autopilot's autonomous AI agent capabilities.
 */

import {
  Brain,
  GitBranch,
  Robot,
  Shield,
  Sliders,
} from "@phosphor-icons/react";
import { motion, useInView } from "motion/react";
import type { JSX } from "react";
import { useRef } from "react";

import { H2, Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// ─── Mini UI: Agent Grid ─────────────────────────────────────────────────────

const AGENT_ROLES = [
  { name: "CEO", color: "bg-violet-500" },
  { name: "PM", color: "bg-blue-500" },
  { name: "CTO", color: "bg-sky-500" },
  { name: "Dev", color: "bg-emerald-500" },
  { name: "Growth", color: "bg-amber-500" },
  { name: "Sales", color: "bg-rose-500" },
  { name: "Support", color: "bg-teal-500" },
] as const;

function MiniAgentGrid() {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {AGENT_ROLES.map((agent, i) => (
        <div
          className="group/agent flex flex-col items-center gap-1 rounded-lg bg-muted/40 px-1 py-1.5 transition-all duration-300 hover:bg-muted/60 dark:bg-sidebar/50 dark:hover:bg-sidebar/70"
          key={agent.name}
          style={{ transitionDelay: `${i * 30}ms` }}
        >
          <div
            className={cn(
              "size-2 rounded-full transition-transform duration-500 group-hover:scale-110",
              agent.color
            )}
          />
          <span className="font-medium text-[7px] text-muted-foreground transition-colors group-hover/agent:text-foreground">
            {agent.name}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Mini UI: Shared Board ───────────────────────────────────────────────────

function MiniSharedBoard() {
  return (
    <div className="space-y-2">
      {[
        { agent: "PM", action: "Created initiative", color: "bg-blue-500" },
        { agent: "CTO", action: "Wrote spec", color: "bg-sky-500" },
        { agent: "Dev", action: "Opened PR #42", color: "bg-emerald-500" },
      ].map((item, i) => (
        <div
          className="flex items-center gap-2 rounded-lg bg-muted/40 px-2.5 py-1.5 transition-transform duration-300 group-hover:translate-x-0.5 dark:bg-sidebar/50"
          key={item.agent}
          style={{ transitionDelay: `${i * 60}ms` }}
        >
          <div className={cn("size-1.5 rounded-full", item.color)} />
          <span className="font-medium text-[9px] text-foreground">
            {item.agent}
          </span>
          <span className="text-[9px] text-muted-foreground">
            {item.action}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Mini UI: Autonomy Modes ─────────────────────────────────────────────────

function MiniAutonomyModes() {
  return (
    <div className="space-y-2">
      {[
        { mode: "Supervised", status: "Propose → Approve", active: false },
        { mode: "Full Auto", status: "Autonomous", active: true },
        { mode: "Stopped", status: "Paused", active: false },
      ].map((item) => (
        <div
          className={cn(
            "flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors duration-300",
            item.active
              ? "bg-emerald-50 dark:bg-emerald-500/10"
              : "bg-muted/40 dark:bg-sidebar/50"
          )}
          key={item.mode}
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "size-1.5 rounded-full",
                item.active ? "bg-emerald-500" : "bg-muted-foreground/30"
              )}
            />
            <span
              className={cn(
                "font-medium text-[9px]",
                item.active
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-muted-foreground"
              )}
            >
              {item.mode}
            </span>
          </div>
          <span className="text-[8px] text-muted-foreground">
            {item.status}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Mini UI: Knowledge Base ─────────────────────────────────────────────────

function MiniKnowledgeBase() {
  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-muted/40 p-2.5 dark:bg-sidebar/50">
        <div className="mb-1.5 flex items-center gap-1.5">
          <div className="size-2 rounded bg-violet-500/60" />
          <span className="font-medium text-[9px] text-foreground">
            Company Brief v3
          </span>
        </div>
        <div className="space-y-1">
          <div className="h-1 w-4/5 rounded bg-border/40 dark:bg-muted/40" />
          <div className="h-1 w-3/5 rounded bg-border/40 dark:bg-muted/40" />
        </div>
      </div>
      <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200/50 bg-emerald-50/50 px-2.5 py-1.5 dark:border-emerald-500/10 dark:bg-emerald-500/5">
        <span className="text-[8px] text-emerald-600 dark:text-emerald-400">
          ↻ Change cascaded to 4 agents
        </span>
      </div>
    </div>
  );
}

// ─── Mini UI: Cost Guards ────────────────────────────────────────────────────

function MiniCostGuards() {
  return (
    <div className="space-y-2">
      {[
        { agent: "Dev", used: 75, limit: "$50/day" },
        { agent: "Growth", used: 30, limit: "$20/day" },
        { agent: "Sales", used: 90, limit: "$30/day" },
      ].map((item) => (
        <div className="space-y-1" key={item.agent}>
          <div className="flex items-center justify-between">
            <span className="font-medium text-[9px] text-foreground">
              {item.agent}
            </span>
            <span className="text-[8px] text-muted-foreground">
              {item.limit}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-border/60 dark:bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 group-hover:opacity-100",
                item.used > 80 ? "bg-amber-500" : "bg-emerald-500"
              )}
              style={{ width: `${item.used}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Feature data ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    id: "agents",
    icon: Robot,
    accent: "text-violet-500",
    accentBg: "bg-violet-500/10 dark:bg-violet-500/15",
    title: "7 AI Agents",
    span: "sm:col-span-2",
  },
  {
    id: "board",
    icon: GitBranch,
    accent: "text-emerald-500",
    accentBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    title: "Shared Board",
    span: "",
  },
  {
    id: "autonomy",
    icon: Sliders,
    accent: "text-amber-500",
    accentBg: "bg-amber-500/10 dark:bg-amber-500/15",
    title: "Autonomy Modes",
    span: "",
  },
  {
    id: "knowledge",
    icon: Brain,
    accent: "text-sky-500",
    accentBg: "bg-sky-500/10 dark:bg-sky-500/15",
    title: "Knowledge Base",
    span: "",
  },
  {
    id: "cost",
    icon: Shield,
    accent: "text-rose-500",
    accentBg: "bg-rose-500/10 dark:bg-rose-500/15",
    title: "Cost Guards",
    span: "",
  },
] as const;

const MINI_UI_MAP: Record<string, () => JSX.Element> = {
  agents: MiniAgentGrid,
  board: MiniSharedBoard,
  autonomy: MiniAutonomyModes,
  knowledge: MiniKnowledgeBase,
  cost: MiniCostGuards,
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
            Your autonomous AI company
          </Text>
          <H2 className="mb-4" variant="landing">
            7 agents.{" "}
            <span className="text-muted-foreground">
              Zero employees needed.
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
