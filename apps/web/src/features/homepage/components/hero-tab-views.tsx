"use client";

import {
  ArrowUp,
  CalendarBlank,
  MegaphoneSimple,
  Sparkle,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  CHANGELOG_ENTRIES,
  FEEDBACK_ITEMS,
  ROADMAP_COLUMNS,
} from "@/features/homepage/components/hero-data";
import { cn } from "@/lib/utils";

// Feedback Board View

export function FeedbackView() {
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
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full"
      exit={{ opacity: 0, y: -8 }}
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* Feedback list */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-border border-b px-4 py-2.5 sm:px-6">
          <span className="font-semibold text-foreground text-sm">
            Feature Requests
          </span>
          <div className="flex gap-2 text-xs">
            <span className="font-medium text-foreground">Top</span>
            <span className="text-muted-foreground">New</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {FEEDBACK_ITEMS.map((item) => (
            <div
              className="flex items-start gap-3 border-border border-b px-4 py-3 transition-colors hover:bg-muted/20 sm:px-6"
              key={item.id}
            >
              <button
                className={cn(
                  "mt-0.5 flex h-11 w-9 shrink-0 flex-col items-center justify-center rounded-lg border transition-all",
                  votedIds.has(item.id)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                )}
                onClick={() => toggleVote(item.id)}
                type="button"
              >
                <ArrowUp size={12} weight="bold" />
                <span className="font-bold text-[10px] leading-none">
                  {votedIds.has(item.id) ? item.votes + 1 : item.votes}
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <p className="mb-1 font-semibold text-foreground text-sm">
                  {item.title}
                </p>
                <p className="mb-2 line-clamp-1 text-muted-foreground text-xs">
                  {item.desc}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge color={item.color}>{item.label}</Badge>
                  {item.tags.map((tag) => (
                    <Badge color={tag.color} key={tag.label}>
                      {tag.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail sidebar - hidden on small screens */}
      <div className="hidden w-[340px] flex-col border-border border-l lg:flex">
        <div className="border-border border-b p-5">
          <div className="mb-3 flex items-center gap-2">
            <Badge color="green">Planned</Badge>
            <span className="text-muted-foreground text-xs">Oct 24, 2024</span>
          </div>
          <h3 className="mb-1 font-semibold text-base text-foreground">
            Dark mode support
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-olive-600/20 font-bold text-[10px] text-olive-600">
              A
            </div>
            <span className="text-muted-foreground text-xs">
              by{" "}
              <span className="font-medium text-foreground">Alex Morgan</span>
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <span className="mb-2 block font-medium text-muted-foreground text-xs">
              AI Analysis
            </span>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <Sparkle className="text-primary" size={14} weight="fill" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground text-xs">
                    Confidence
                  </span>
                  <span className="font-mono font-semibold text-primary text-xs">
                    94%
                  </span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[94%] rounded-full bg-primary" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <span className="mb-2 block font-medium text-muted-foreground text-xs">
              Tags
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Badge color="purple">UX</Badge>
              <Badge color="pink">Design</Badge>
              <Badge color="blue">Accessibility</Badge>
            </div>
          </div>

          {/* Activity */}
          <div>
            <span className="mb-2 block font-medium text-muted-foreground text-xs">
              Activity
            </span>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 font-bold text-[8px] text-violet-600">
                  TM
                </div>
                <div>
                  <p className="text-foreground text-xs">
                    <span className="font-semibold">Team</span>{" "}
                    <span className="text-muted-foreground">
                      added to roadmap
                    </span>
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    2h ago
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 font-bold text-[8px] text-sky-600">
                  S
                </div>
                <div>
                  <p className="text-foreground text-xs">
                    <span className="font-semibold">Sarah</span>{" "}
                    <span className="text-muted-foreground">
                      +1 system sync!
                    </span>
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    1h ago
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Roadmap Kanban View

export function RoadmapView() {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full gap-4 overflow-x-auto p-4 sm:p-6"
      exit={{ opacity: 0, y: -8 }}
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {ROADMAP_COLUMNS.map((col, colIdx) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex w-[260px] shrink-0 flex-col sm:w-[288px]"
          initial={{ opacity: 0, y: 12 }}
          key={col.id}
          transition={{ delay: colIdx * 0.08, duration: 0.3 }}
        >
          {/* Column header */}
          <div className="mb-3 flex items-center gap-2">
            <Badge color={col.color}>{col.title}</Badge>
            <span className="font-medium text-muted-foreground text-xs">
              {col.items.length}
            </span>
          </div>

          {/* Cards */}
          <div className="flex flex-1 flex-col gap-2">
            {col.items.map((item, idx) => (
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                className="cursor-grab rounded-xl border border-border bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
                initial={{ opacity: 0, scale: 0.96 }}
                key={item.id}
                transition={{
                  delay: colIdx * 0.08 + idx * 0.05,
                  duration: 0.3,
                }}
              >
                <p className="mb-2 font-medium text-foreground text-sm">
                  {item.title}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <ArrowUp size={10} />
                    <span className="font-medium text-xs">{item.votes}</span>
                  </div>
                  <div className="flex -space-x-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-violet-500 font-bold text-[7px] text-white">
                      S
                    </div>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-sky-500 font-bold text-[7px] text-white">
                      M
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Add card placeholder */}
            <div className="flex items-center justify-center rounded-xl border border-border border-dashed py-3 text-muted-foreground/50 transition-colors hover:border-primary/30 hover:text-primary/50">
              <span className="text-xs">+ Add item</span>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// Changelog View

export function ChangelogView() {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="h-full overflow-y-auto p-4 sm:p-6"
      exit={{ opacity: 0, y: -8 }}
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="mx-auto max-w-2xl space-y-6">
        {CHANGELOG_ENTRIES.map((entry, idx) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="relative"
            initial={{ opacity: 0, y: 12 }}
            key={entry.id}
            transition={{ delay: idx * 0.1, duration: 0.3 }}
          >
            {/* Timeline connector */}
            {idx < CHANGELOG_ENTRIES.length - 1 && (
              <div className="absolute top-10 left-[18px] h-[calc(100%+8px)] w-px bg-border" />
            )}

            <div className="flex gap-4">
              {/* Version dot */}
              <div className="relative z-10 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
                <MegaphoneSimple className="text-primary" size={16} />
              </div>

              <div className="flex-1 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge color={entry.color}>{entry.version}</Badge>
                  <span className="flex items-center gap-1 text-muted-foreground text-xs">
                    <CalendarBlank size={10} />
                    {entry.date}
                  </span>
                </div>
                <p className="mb-2 font-semibold text-foreground text-sm">
                  {entry.title}
                </p>
                <ul className="space-y-1">
                  {entry.items.map((item) => (
                    <li
                      className="flex items-center gap-2 text-muted-foreground text-xs"
                      key={item}
                    >
                      <div className="h-1 w-1 shrink-0 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
