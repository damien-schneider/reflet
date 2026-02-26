"use client";

/*
 * "Try the real thing" CTA — mid-page call-to-action with condensed
 * product previews using the same components as the real app.
 * Each preview links to the live public board.
 */

import {
  ArrowSquareOut,
  ArrowUp,
  CalendarBlank,
  ChatCircleDots,
  CheckCircle,
  DotsSixVertical,
  Kanban,
  LinkSimple,
  MegaphoneSimple,
} from "@phosphor-icons/react";
import { motion, useInView } from "motion/react";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { H2, Text } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

import {
  CHANGELOG_ITEMS_DATA,
  FEEDBACK_BOARD_DATA,
  ROADMAP_COLUMNS_DATA,
} from "./landing-data";

const REFLET_BASE = "https://www.reflet.app/reflet";
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// Show first 3 items only for a compact preview
const PREVIEW_FEEDBACK = FEEDBACK_BOARD_DATA.slice(0, 3);
const PREVIEW_CHANGELOG = CHANGELOG_ITEMS_DATA.slice(0, 2);

// ─── Compact Feedback Preview ────────────────────────────────────────────────

function CompactFeedbackPreview() {
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

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
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Toolbar — matches real product */}
      <div className="flex items-center justify-between border-border border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <ChatCircleDots
            className="text-olive-600 dark:text-olive-400"
            size={14}
            weight="fill"
          />
          <span className="font-semibold text-[12px] text-foreground">
            Feature Requests
          </span>
          <Badge color="gray">{FEEDBACK_BOARD_DATA.length} open</Badge>
        </div>
        <div className="hidden items-center gap-2 text-[10px] sm:flex">
          <span className="font-semibold text-foreground">Top voted</span>
          <span className="text-muted-foreground">Newest</span>
        </div>
      </div>

      {/* Items */}
      {PREVIEW_FEEDBACK.map((item) => {
        const isVoted = votedIds.has(item.id);
        return (
          <div
            className="flex items-start gap-3 border-border border-b px-4 py-3 last:border-b-0"
            key={item.id}
          >
            {/* Vote button — real pattern */}
            <button
              className={cn(
                "mt-0.5 flex h-10 w-8 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border transition-all",
                isVoted
                  ? "border-olive-600/40 bg-olive-600/10 text-olive-600 dark:border-olive-400/40 dark:bg-olive-400/10 dark:text-olive-400"
                  : "border-border text-muted-foreground hover:border-olive-600/30"
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleVote(item.id);
              }}
              type="button"
            >
              <ArrowUp size={10} weight="bold" />
              <span className="font-bold text-[10px] leading-none">
                {isVoted ? item.votes + 1 : item.votes}
              </span>
            </button>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="mb-1 font-semibold text-[12px] text-foreground leading-snug">
                {item.title}
              </p>
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div
                  className={cn(
                    "flex size-3.5 items-center justify-center rounded-full font-bold text-[6px] text-white",
                    item.authorColor
                  )}
                >
                  {item.authorInitial}
                </div>
                <span>{item.author}</span>
                <span>·</span>
                <span>{item.timeAgo}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Badge color={item.statusColor}>{item.status}</Badge>
                {item.tags.map((tag) => (
                  <Badge color={tag.color} key={tag.label}>
                    {tag.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Compact Roadmap Preview ─────────────────────────────────────────────────

function CompactRoadmapPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Window chrome — matches roadmap mockup */}
      <div className="flex items-center gap-2 bg-[#2a2924] px-3 py-2 dark:bg-sidebar">
        <div className="flex gap-1.5">
          <div className="size-2 rounded-full bg-[#ff5f57]" />
          <div className="size-2 rounded-full bg-[#febc2e]" />
          <div className="size-2 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex flex-1 items-center justify-center gap-1.5">
          <Kanban className="text-[#999] dark:text-[#666]" size={10} />
          <span className="font-medium text-[#999] text-[10px] dark:text-[#666]">
            Roadmap — Reflet
          </span>
        </div>
        <div className="w-10" />
      </div>

      {/* Board columns */}
      <div className="flex gap-3 overflow-x-auto bg-accent p-3 dark:bg-background">
        {ROADMAP_COLUMNS_DATA.map((col) => (
          <div className="w-44 shrink-0" key={col.id}>
            {/* Column header */}
            <div className="mb-2 flex items-center gap-1.5">
              <div className={cn("size-1.5 rounded-full", col.dotColor)} />
              <span className="font-semibold text-[10px] text-foreground">
                {col.title}
              </span>
              <span className="font-medium text-[9px] text-muted-foreground">
                {col.items.length}
              </span>
            </div>

            {/* Cards — first 2 only */}
            <div className="space-y-1.5">
              {col.items.slice(0, 2).map((item) => (
                <div
                  className="group rounded-md border border-border bg-card p-2 shadow-sm"
                  key={item.id}
                >
                  <div className="mb-1.5 flex items-start justify-between">
                    <p className="font-medium text-[10px] text-foreground leading-snug">
                      {item.title}
                    </p>
                    <DotsSixVertical
                      className="mt-0.5 shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100"
                      size={10}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ArrowUp size={8} />
                      <span className="font-medium text-[9px]">
                        {item.votes}
                      </span>
                    </div>
                    <div className="flex -space-x-1">
                      {item.assignees.map((initial, i) => (
                        <div
                          className={cn(
                            "flex size-4 items-center justify-center rounded-full border-2 border-card font-bold text-[6px] text-white",
                            item.colors[i]
                          )}
                          key={initial}
                        >
                          {initial}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Compact Changelog Preview ───────────────────────────────────────────────

function CompactChangelogPreview() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-border border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <MegaphoneSimple
            className="text-olive-600 dark:text-olive-400"
            size={14}
            weight="fill"
          />
          <span className="font-semibold text-[12px] text-foreground">
            Changelog
          </span>
        </div>
      </div>

      {/* Entries */}
      <div className="divide-y divide-border">
        {PREVIEW_CHANGELOG.map((entry) => (
          <div className="px-4 py-3" key={entry.id}>
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <Badge color={entry.tagColor}>{entry.version}</Badge>
              <Badge color={entry.tagColor}>{entry.tag}</Badge>
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <CalendarBlank size={8} />
                {entry.date}
              </span>
            </div>
            <p className="mb-1 font-semibold text-[12px] text-foreground leading-snug">
              {entry.title}
            </p>
            <p className="mb-2 line-clamp-1 text-[10px] text-muted-foreground leading-relaxed">
              {entry.description}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-olive-600 dark:text-olive-400">
              <LinkSimple size={10} weight="bold" />
              <span className="font-medium">
                {entry.linkedFeedback} resolved feedback items
              </span>
              <CheckCircle size={10} weight="fill" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
            No demo video needed
          </Text>
          <H2 className="mx-auto mb-4 max-w-135" variant="landing">
            Try the{" "}
            <span className="text-olive-600 italic dark:text-olive-400">
              real
            </span>{" "}
            product
          </H2>
          <p className="mx-auto max-w-100 text-[15px] text-muted-foreground leading-relaxed sm:text-[17px]">
            This isn&apos;t a mockup. Click through Reflet&apos;s live public
            board, roadmap, and changelog.
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
                Browse real feature requests from our community. Upvote ideas,
                explore priorities, and see AI triage in action.
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
