"use client";

import {
  ArrowUp,
  CaretRight,
  CaretUp,
  ChatCircleDots,
  Check,
  Code,
  DotsSixVertical,
  GithubLogo,
  Lightning,
  Lock,
  MegaphoneSimple,
  Plugs,
  Sparkle,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { H2, H3 } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

// =============================================================================
// Shared — Intersection observer hook
// =============================================================================

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.unobserve(el);
  }, [threshold]);

  return { ref, isInView };
}

// =============================================================================
// Card 1 — Feedback Board (Minimal Notch style, matching real product)
// 2 cols × 2 rows — The hero card
// =============================================================================

const NOTCH_FEEDBACK = [
  {
    id: "dark-mode",
    title: "Dark mode support",
    desc: "Add a dark theme for late night sessions",
    votes: 248,
    notchColor: "bg-[#0f7b6c]",
    status: "green" as const,
    label: "Planned",
    tags: [
      { label: "UX", color: "purple" as const, ai: true },
      { label: "Design", color: "pink" as const, ai: false },
    ],
    comments: 14,
    time: "2d ago",
  },
  {
    id: "slack",
    title: "Slack Integration",
    desc: "Get feedback updates directly in Slack channels",
    votes: 186,
    notchColor: "bg-[#d9730d]",
    status: "orange" as const,
    label: "In Progress",
    tags: [{ label: "Integration", color: "blue" as const, ai: true }],
    comments: 8,
    time: "5d ago",
  },
  {
    id: "api",
    title: "Public API Access",
    desc: "Pull feedback data into your internal dashboard",
    votes: 142,
    notchColor: "bg-[#0b6e99]",
    status: "blue" as const,
    label: "Under Review",
    tags: [
      { label: "API", color: "blue" as const, ai: false },
      { label: "Dev", color: "gray" as const, ai: false },
    ],
    comments: 6,
    time: "1w ago",
  },
  {
    id: "csv",
    title: "CSV Export",
    desc: "Export feedback data for reporting and analysis",
    votes: 76,
    notchColor: "bg-[#6940a5]",
    status: "purple" as const,
    label: "Done",
    tags: [{ label: "Data", color: "yellow" as const, ai: true }],
    comments: 3,
    time: "2w ago",
  },
] as const;

function FeedbackBoardCard() {
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const { ref, isInView } = useInView();

  const toggleVote = (id: string) => {
    setVotedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-500 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
      ref={ref}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-border border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ChatCircleDots size={18} weight="fill" />
          </div>
          <div>
            <H3 className="text-sm" variant="cardBold">
              Feedback Board
            </H3>
            <p className="text-[11px] text-muted-foreground">
              Minimal Notch card style
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 dark:bg-emerald-500/20">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="font-semibold text-[10px] text-emerald-700 dark:text-emerald-400">
            Live
          </span>
        </div>
      </div>

      {/* Feed — Minimal Notch style cards */}
      <div className="flex-1 space-y-2 overflow-hidden p-3">
        <AnimatePresence>
          {NOTCH_FEEDBACK.map((item, i) => {
            const isVoted = votedIds.has(item.id);
            return (
              <motion.div
                animate={
                  isInView
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 0, scale: 0.95 }
                }
                className="relative rounded-xl border border-border/50 bg-card px-4 py-3.5 transition-all hover:border-border hover:shadow-sm"
                initial={{ opacity: 0, scale: 0.95 }}
                key={item.id}
                transition={{ delay: i * 0.1, duration: 0.2 }}
              >
                {/* Left notch indicator */}
                <div
                  className={cn(
                    "absolute top-1/2 left-0 h-8 w-[3px] -translate-y-1/2 rounded-r-full transition-all",
                    isVoted ? "h-10 bg-primary" : item.notchColor
                  )}
                />

                <div className="flex gap-3">
                  {/* Vote column */}
                  <button
                    className={cn(
                      "flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border transition-all",
                      isVoted
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                    )}
                    onClick={() => toggleVote(item.id)}
                    type="button"
                  >
                    <motion.div
                      animate={
                        isVoted ? { y: [0, -2, 0], scale: [1, 1.2, 1] } : {}
                      }
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 20,
                      }}
                    >
                      <CaretUp
                        size={14}
                        weight={isVoted ? "fill" : "regular"}
                      />
                    </motion.div>
                    <span className="font-semibold text-[10px] tabular-nums leading-none">
                      {isVoted ? item.votes + 1 : item.votes}
                    </span>
                  </button>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="mb-0.5 truncate font-semibold text-foreground text-sm">
                      {item.title}
                    </p>
                    <p className="mb-2 line-clamp-1 text-muted-foreground text-xs">
                      {item.desc}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge color={item.status}>{item.label}</Badge>
                      {item.tags.map((tag) => (
                        <Badge color={tag.color} key={tag.label}>
                          {tag.ai && (
                            <Sparkle
                              data-icon="inline-start"
                              size={10}
                              weight="fill"
                            />
                          )}
                          {tag.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                    <span className="text-[10px] text-muted-foreground">
                      {item.time}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <ChatCircleDots size={10} />
                      {item.comments}
                    </span>
                  </div>
                </div>

                {/* Vote glow effect */}
                <AnimatePresence>
                  {isVoted && (
                    <motion.div
                      animate={{ opacity: 0.6, scale: 1 }}
                      className="pointer-events-none absolute top-1/2 left-4 h-10 w-10 -translate-y-1/2 rounded-full bg-primary/20 blur-xl"
                      exit={{ opacity: 0, scale: 0.5 }}
                      initial={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-border border-t px-5 py-2">
        <div className="flex items-center -space-x-2">
          {["bg-violet-500", "bg-sky-500", "bg-emerald-500"].map((color) => (
            <div
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full border-2 border-card font-bold text-[7px] text-white",
                color
              )}
              key={color}
            >
              {color[3].toUpperCase()}
            </div>
          ))}
          <span className="pl-2 text-[10px] text-muted-foreground">
            +12 online
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground italic">Try voting</p>
      </div>
    </div>
  );
}

// =============================================================================
// Card 2 — AI Triage (hover-triggered step-by-step analysis)
// 1 col × 2 rows
// =============================================================================

function AITriageCard() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isAnalyzing || step >= 5) {
      return;
    }
    const timeout = setTimeout(() => setStep((s) => s + 1), 450);
    return () => clearTimeout(timeout);
  }, [isAnalyzing, step]);

  const handleMouseEnter = () => {
    setIsAnalyzing(true);
    setStep(0);
  };

  const handleMouseLeave = () => {
    setIsAnalyzing(false);
    setStep(0);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover animation trigger
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: decorative hover effect
    <div
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-500 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center justify-between border-border border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
            <Sparkle size={18} weight="fill" />
          </div>
          <H3 className="text-sm" variant="cardBold">
            AI-Powered Triage
          </H3>
        </div>
      </div>

      {/* Analysis input */}
      <div className="border-border border-b px-5 py-2.5">
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
          Analyzing
        </span>
        <p className="font-medium text-foreground text-xs">
          &ldquo;Add keyboard shortcuts for power users&rdquo;
        </p>
      </div>

      {/* Results */}
      <div className="flex-1 divide-y divide-border">
        {/* Auto-tags */}
        <div
          className={cn(
            "flex items-center justify-between px-5 py-2.5 transition-all duration-300",
            step >= 1 ? "opacity-100" : "opacity-20"
          )}
        >
          <span className="text-muted-foreground text-xs">Tags</span>
          <div className="flex gap-1.5">
            <Badge color="purple">
              <Sparkle data-icon="inline-start" size={10} weight="fill" />
              UX
            </Badge>
            <Badge color="blue">
              <Sparkle data-icon="inline-start" size={10} weight="fill" />
              Productivity
            </Badge>
          </div>
        </div>

        {/* Priority */}
        <div
          className={cn(
            "flex items-center justify-between px-5 py-2.5 transition-all duration-300",
            step >= 2 ? "opacity-100" : "opacity-20"
          )}
        >
          <span className="text-muted-foreground text-xs">Priority</span>
          <Badge color="orange">
            <Sparkle data-icon="inline-start" size={10} weight="fill" />
            Medium
          </Badge>
        </div>

        {/* Complexity */}
        <div
          className={cn(
            "flex items-center justify-between px-5 py-2.5 transition-all duration-300",
            step >= 3 ? "opacity-100" : "opacity-20"
          )}
        >
          <span className="text-muted-foreground text-xs">Complexity</span>
          <div className="flex items-center gap-2">
            <Badge color="green">
              <Sparkle data-icon="inline-start" size={10} weight="fill" />
              Simple
            </Badge>
            <span className="font-mono text-[10px] text-muted-foreground">
              ~2h
            </span>
          </div>
        </div>

        {/* Duplicate */}
        <div
          className={cn(
            "px-5 py-2.5 transition-all duration-300",
            step >= 4 ? "opacity-100" : "opacity-20"
          )}
        >
          <span className="mb-1.5 block text-muted-foreground text-xs">
            Duplicate detected
          </span>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
            <div className="flex items-center gap-2">
              <Badge color="yellow">87%</Badge>
              <span className="text-foreground text-xs">
                Vim keybindings support
              </span>
            </div>
            <span className="cursor-pointer font-semibold text-[10px] text-primary hover:underline">
              Merge
            </span>
          </div>
        </div>

        {/* AI Clarification */}
        <div
          className={cn(
            "px-5 py-2.5 transition-all duration-300",
            step >= 5 ? "opacity-100" : "opacity-20"
          )}
        >
          <span className="mb-1.5 block text-muted-foreground text-xs">
            AI Summary
          </span>
          <div className="rounded-lg bg-olive-50/50 px-3 py-2 dark:bg-olive-950/20">
            <p className="font-medium text-[11px] text-olive-700 leading-relaxed dark:text-olive-300">
              User requests keyboard shortcuts to speed up navigation and common
              actions for power users.
            </p>
          </div>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="border-border border-t px-5 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Confidence</span>
          <span className="font-mono font-semibold text-[10px] text-primary">
            {step >= 5 ? "94%" : "..."}
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
            style={{ width: step >= 5 ? "94%" : `${step * 16}%` }}
          />
        </div>
        {!isAnalyzing && step === 0 && (
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground italic">
            Hover to analyze
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Card 3 — Roadmap Kanban (mini drag-and-drop preview)
// =============================================================================

const KANBAN_COLS = [
  {
    id: "planned",
    title: "Planned",
    color: "green" as const,
    dotColor: "bg-[#0f7b6c]",
    items: [
      { id: "k1", title: "Dark mode", votes: 248 },
      { id: "k2", title: "Mobile app", votes: 98 },
    ],
  },
  {
    id: "progress",
    title: "In Progress",
    color: "orange" as const,
    dotColor: "bg-[#d9730d]",
    items: [{ id: "k3", title: "Slack integration", votes: 186 }],
  },
  {
    id: "done",
    title: "Done",
    color: "purple" as const,
    dotColor: "bg-[#6940a5]",
    items: [
      { id: "k5", title: "CSV Export", votes: 76 },
      { id: "k6", title: "Email digest", votes: 52 },
    ],
  },
] as const;

function RoadmapKanbanCard() {
  const [dragging, setDragging] = useState<string | null>(null);

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-500 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-center justify-between border-border border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
            <Lightning size={18} weight="fill" />
          </div>
          <H3 className="text-sm" variant="cardBold">
            Roadmap
          </H3>
        </div>
        <Badge variant="secondary">Kanban</Badge>
      </div>

      {/* Kanban columns */}
      <div className="flex flex-1 gap-2 overflow-x-auto p-3">
        {KANBAN_COLS.map((col) => (
          <div className="flex min-w-[140px] flex-1 flex-col" key={col.id}>
            {/* Column header */}
            <div className="mb-2 flex items-center gap-1.5">
              <div className={cn("h-2 w-2 rounded-full", col.dotColor)} />
              <span className="font-semibold text-[11px] text-foreground">
                {col.title}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {col.items.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-1 flex-col gap-1.5 rounded-lg bg-muted/30 p-1.5">
              {col.items.map((item) => (
                <motion.div
                  animate={
                    dragging === item.id
                      ? { scale: 1.05, rotate: 2, zIndex: 10 }
                      : { scale: 1, rotate: 0, zIndex: 0 }
                  }
                  className={cn(
                    "cursor-grab rounded-lg border border-border/50 bg-card p-2 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
                    dragging === item.id && "ring-2 ring-primary"
                  )}
                  key={item.id}
                  onPointerDown={() => setDragging(item.id)}
                  onPointerUp={() => setDragging(null)}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="truncate font-medium text-[11px] text-foreground">
                      {item.title}
                    </p>
                    <DotsSixVertical
                      className="shrink-0 text-muted-foreground/40"
                      size={10}
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                    <ArrowUp size={8} />
                    <span className="font-medium text-[9px]">{item.votes}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Card 4 — Widget SDK embed preview
// =============================================================================

function WidgetCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setIsOpen(false);
    }, 1500);
  };

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-500 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-center justify-between border-border border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
            <Code size={18} weight="bold" />
          </div>
          <H3 className="text-sm" variant="cardBold">
            Embed Widget
          </H3>
        </div>
        <Badge variant="secondary">SDK</Badge>
      </div>

      {/* Widget preview area */}
      <div className="relative flex flex-1 items-center justify-center bg-muted/20 p-4">
        {/* Simulated page background */}
        <div className="absolute inset-4 rounded-lg border border-border/30 bg-background">
          <div className="flex items-center gap-1 border-border/30 border-b px-3 py-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-red-400/40" />
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400/40" />
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400/40" />
            <span className="ml-2 font-mono text-[8px] text-muted-foreground/50">
              yourapp.com
            </span>
          </div>
          <div className="space-y-2 p-3">
            <div className="h-2 w-3/4 rounded bg-muted/50" />
            <div className="h-2 w-1/2 rounded bg-muted/30" />
            <div className="h-2 w-2/3 rounded bg-muted/40" />
          </div>
        </div>

        {/* Floating trigger button */}
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="absolute right-4 bottom-4 z-10 w-[200px] overflow-hidden rounded-xl border border-border bg-card shadow-xl"
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              key="dialog"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              {submitted ? (
                <div className="flex flex-col items-center gap-2 p-5">
                  <motion.div
                    animate={{ scale: [0, 1.2, 1] }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                    transition={{ duration: 0.4 }}
                  >
                    <Check size={16} weight="bold" />
                  </motion.div>
                  <span className="font-medium text-foreground text-xs">
                    Sent!
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between border-border border-b px-3 py-2">
                    <span className="font-semibold text-[11px] text-foreground">
                      Send Feedback
                    </span>
                    <button
                      className="text-muted-foreground text-xs hover:text-foreground"
                      onClick={() => setIsOpen(false)}
                      type="button"
                    >
                      &times;
                    </button>
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="flex gap-1">
                      {(["Feature", "Bug", "Question"] as const).map((cat) => (
                        <span
                          className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground first:border-primary first:bg-primary/10 first:text-primary"
                          key={cat}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                    <div className="h-12 rounded-md border border-border bg-muted/30 p-1.5">
                      <span className="text-[10px] text-muted-foreground/50">
                        Describe your feedback...
                      </span>
                    </div>
                    <button
                      className="w-full rounded-md bg-primary py-1.5 font-medium text-[10px] text-primary-foreground"
                      onClick={handleSubmit}
                      type="button"
                    >
                      Submit
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.button
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-6 bottom-6 z-10 flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 font-medium text-primary-foreground text-xs shadow-lg transition-shadow hover:shadow-xl"
              exit={{ opacity: 0, scale: 0.8 }}
              initial={{ opacity: 0, scale: 0.8 }}
              key="trigger"
              onClick={() => setIsOpen(true)}
              type="button"
            >
              <ChatCircleDots size={14} weight="fill" />
              Feedback
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// =============================================================================
// Card 5 — Changelog (timeline with real release-item style)
// =============================================================================

const RELEASES = [
  {
    id: "r1",
    version: "v2.4.0",
    title: "Public API & Webhooks",
    color: "blue" as const,
    shipped: ["REST API with CRUD", "Webhook events"],
  },
  {
    id: "r2",
    version: "v2.3.0",
    title: "AI-Powered Triage",
    color: "purple" as const,
    shipped: ["Auto-categorize feedback", "Duplicate detection"],
  },
] as const;

function ChangelogCard() {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-500 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-center justify-between border-border border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
            <MegaphoneSimple size={18} weight="fill" />
          </div>
          <H3 className="text-sm" variant="cardBold">
            Changelog
          </H3>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-4">
        {RELEASES.map((release) => (
          <div className="relative" key={release.id}>
            {/* Version header */}
            <div className="mb-2 flex items-center gap-2">
              <Badge color={release.color}>
                <span className="font-mono">{release.version}</span>
              </Badge>
            </div>

            <h4 className="mb-2 font-semibold text-foreground text-sm">
              {release.title}
            </h4>

            {/* Shipped features */}
            <div className="space-y-1.5">
              {release.shipped.map((item) => (
                <div className="flex items-center gap-2" key={item}>
                  <Check
                    className="shrink-0 text-olive-500"
                    size={12}
                    weight="bold"
                  />
                  <span className="text-muted-foreground text-xs">{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Subscriber notification */}
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 dark:bg-primary/10">
          <Lightning className="text-primary" size={12} weight="fill" />
          <span className="font-medium text-[10px] text-primary">
            142 subscribers notified
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Card 6 — Developer tools (code + integrations)
// 2 cols
// =============================================================================

function DeveloperCard() {
  return (
    <Link
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-500 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
      href="/integrations"
    >
      <div className="flex items-center justify-between border-border border-b px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
            <Plugs size={18} weight="bold" />
          </div>
          <div>
            <H3 className="text-sm" variant="cardBold">
              Built for Developers
            </H3>
            <p className="text-[11px] text-muted-foreground">
              SDK, REST API, webhooks &amp; GitHub sync
            </p>
          </div>
        </div>
        <CaretRight
          className="text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary"
          size={16}
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:flex-row">
        {/* Code snippet */}
        <div className="flex-1 overflow-hidden rounded-xl border border-border bg-muted/30">
          <div className="flex items-center gap-1.5 border-border border-b px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-red-400/50" />
            <div className="h-2 w-2 rounded-full bg-amber-400/50" />
            <div className="h-2 w-2 rounded-full bg-emerald-400/50" />
            <span className="ml-2 font-mono text-[10px] text-muted-foreground">
              app.tsx
            </span>
          </div>
          <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-5">
            <span className="text-muted-foreground">
              {"// 3 lines to embed\n"}
            </span>
            <span className="text-primary">{"<RefletProvider"}</span>
            <span className="text-foreground">{' publicKey="pk_..."'}</span>
            <span className="text-primary">{">"}</span>
            {"\n  "}
            <span className="text-primary">{"<FeedbackButton />"}</span>
            {"\n"}
            <span className="text-primary">{"</RefletProvider>"}</span>
          </pre>
        </div>

        {/* Integrations */}
        <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
          {[
            { icon: GithubLogo, label: "GitHub" },
            { icon: Code, label: "API" },
            { icon: Plugs, label: "Hooks" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/30 px-4 py-2.5 transition-colors group-hover:border-primary/20 group-hover:bg-primary/5 sm:px-6"
                key={item.label}
              >
                <Icon className="text-primary" size={18} />
                <span className="font-medium text-[10px] text-muted-foreground">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Link>
  );
}

// =============================================================================
// Card 7 — Open Source
// =============================================================================

function OpenSourceCard() {
  return (
    <a
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-primary bg-primary transition-all duration-500 hover:shadow-lg hover:shadow-primary/30"
      href="https://github.com/damien-schneider/reflet"
      rel="noopener noreferrer"
      target="_blank"
    >
      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/10 text-primary-foreground transition-transform duration-300 group-hover:scale-110">
            <Lock size={18} weight="fill" />
          </div>
          <H3
            className="mb-1.5 text-base text-primary-foreground"
            variant="cardBold"
          >
            Open Source
          </H3>
          <p className="text-primary-foreground/70 text-sm leading-relaxed">
            Audit our code, self-host, or contribute.
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2 font-medium text-primary-foreground/90 text-sm transition-colors group-hover:text-primary-foreground">
          <GithubLogo size={16} />
          <span className="underline underline-offset-4">View on GitHub</span>
          <CaretRight
            className="transition-transform duration-300 group-hover:translate-x-1"
            size={14}
          />
        </div>
      </div>

      <div className="pointer-events-none absolute right-4 bottom-4 opacity-10">
        <svg
          aria-hidden="true"
          className="h-20 w-20"
          fill="none"
          role="img"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 100 100"
        >
          <title>Decorative git branch</title>
          <circle cx="20" cy="20" r="5" />
          <circle cx="80" cy="20" r="5" />
          <circle cx="50" cy="80" r="5" />
          <path d="M20 25 L20 60 Q20 75 35 75 L50 75" />
          <path d="M80 25 L80 60 Q80 75 65 75 L50 75" />
        </svg>
      </div>
    </a>
  );
}

// =============================================================================
// Main — Bento grid
// =============================================================================

const GRID_ITEMS = [
  {
    id: "feedback",
    Component: FeedbackBoardCard,
    className: "md:col-span-2 md:row-span-2",
  },
  { id: "ai", Component: AITriageCard, className: "md:row-span-2" },
  { id: "roadmap", Component: RoadmapKanbanCard, className: "" },
  { id: "widget", Component: WidgetCard, className: "" },
  { id: "changelog", Component: ChangelogCard, className: "" },
  { id: "developer", Component: DeveloperCard, className: "md:col-span-2" },
  { id: "opensource", Component: OpenSourceCard, className: "" },
] as const;

export default function Features() {
  const { ref, isInView } = useInView(0.05);

  return (
    <section className="relative py-24" id="features" ref={ref}>
      <div className="relative z-10 mx-auto max-w-7xl px-4 text-left sm:px-6 lg:px-8">
        <motion.div
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-4"
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.4 }}
        >
          <span className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
            Why Reflet?
          </span>
        </motion.div>

        <motion.div
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          initial={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <H2 className="mb-14 max-w-2xl" variant="section">
            Everything you need to build products users love.
          </H2>
        </motion.div>

        {/* Bento grid — 3 cols on md+ */}
        <div className="grid grid-cols-1 gap-3 md:auto-rows-[minmax(240px,auto)] md:grid-cols-3">
          {GRID_ITEMS.map((item, i) => {
            const { Component } = item;
            return (
              <motion.div
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                className={item.className}
                initial={{ opacity: 0, y: 20 }}
                key={item.id}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.06 }}
              >
                <Component />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
