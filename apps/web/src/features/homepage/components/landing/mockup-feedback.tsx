"use client";

/*
 * MOCKUP 1 — Feedback Board with AI sidebar
 * Shows the core product: a prioritized feedback list with live voting
 * and an AI analysis panel that slides over the selected item.
 */

import {
  ArrowUp,
  Brain,
  ChatCircleDots,
  Lightning,
  Sparkle,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { FEEDBACK_BOARD_DATA } from "./landing-data";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const priorityColorClass = (priority: string): string => {
  if (priority === "Critical") {
    return "text-red-500";
  }
  if (priority === "High") {
    return "text-amber-500";
  }
  return "text-emerald-500";
};

export default function FeedbackBoardMockup() {
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState("webhooks");
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

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

  const selected = FEEDBACK_BOARD_DATA.find((f) => f.id === selectedId);

  return (
    <motion.div
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      className="relative w-full overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.4)]"
      initial={{ opacity: 0, y: 32 }}
      ref={ref}
      transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between border-border border-b px-5 py-3">
        <div className="flex items-center gap-2.5">
          <ChatCircleDots
            className="text-olive-600 dark:text-olive-400"
            size={16}
            weight="fill"
          />
          <span className="font-semibold text-[13px] text-foreground">
            Feature Requests
          </span>
          <Badge color="gray">{FEEDBACK_BOARD_DATA.length} open</Badge>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="font-semibold text-foreground">Top voted</span>
          <span className="text-muted-foreground">Newest</span>
          <span className="text-muted-foreground">Trending</span>
        </div>
      </div>

      <div className="flex">
        {/* Feedback list */}
        <div className="flex-1">
          {FEEDBACK_BOARD_DATA.map((item, idx) => {
            const isVoted = votedIds.has(item.id);
            const isSelected = selectedId === item.id;
            return (
              <motion.div
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                className={cn(
                  "flex cursor-pointer items-start gap-3.5 border-border border-b px-5 py-3.5 transition-colors",
                  isSelected
                    ? "bg-olive-600/4 dark:bg-olive-400/6"
                    : "hover:bg-accent dark:hover:bg-accent"
                )}
                initial={{ opacity: 0, x: -16 }}
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                transition={{
                  delay: 0.15 + idx * 0.07,
                  duration: 0.5,
                  ease: EASE_OUT_EXPO,
                }}
              >
                {/* Vote button */}
                <button
                  className={cn(
                    "mt-0.5 flex h-12 w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border transition-all",
                    isVoted
                      ? "border-olive-600/40 bg-olive-600/10 text-olive-600 dark:border-olive-400/40 dark:bg-olive-400/10 dark:text-olive-400"
                      : "border-border text-muted-foreground hover:border-olive-600/30"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVote(item.id);
                  }}
                  type="button"
                >
                  <ArrowUp size={12} weight="bold" />
                  <span className="font-bold text-[11px] leading-none">
                    {isVoted ? item.votes + 1 : item.votes}
                  </span>
                </button>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="mb-1 font-semibold text-[13px] text-foreground leading-snug">
                    {item.title}
                  </p>
                  <div className="mb-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-full font-bold text-[7px] text-white",
                          item.authorColor
                        )}
                      >
                        {item.authorInitial}
                      </div>
                      {item.author}
                    </span>
                    <span>·</span>
                    <span>{item.timeAgo}</span>
                    <span>·</span>
                    <span>{item.comments} comments</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge color={item.statusColor}>{item.status}</Badge>
                    {item.tags.map((tag) => (
                      <Badge color={tag.color} key={tag.label}>
                        {tag.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* AI Analysis sidebar */}
        <div className="hidden w-70 shrink-0 border-border border-l lg:block">
          <AnimatePresence mode="wait">
            {selected && (
              <motion.div
                animate={{ opacity: 1 }}
                className="p-4"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key={selected.id}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-4">
                  <Badge color={selected.statusColor}>{selected.status}</Badge>
                  <p className="mt-2 font-semibold text-[13px] text-foreground">
                    {selected.title}
                  </p>
                </div>

                {/* AI Confidence */}
                <div className="mb-4">
                  <div className="mb-2 flex items-center gap-1.5">
                    <Sparkle
                      className="text-olive-600 dark:text-olive-400"
                      size={12}
                      weight="fill"
                    />
                    <span className="font-medium text-[11px] text-muted-foreground">
                      AI Analysis
                    </span>
                  </div>
                  <div className="space-y-2.5 rounded-lg bg-muted p-3 dark:bg-muted">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        Confidence
                      </span>
                      <span className="font-bold font-mono text-[12px] text-olive-600 dark:text-olive-400">
                        {selected.aiConfidence}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border dark:bg-border">
                      <motion.div
                        animate={{ width: `${selected.aiConfidence}%` }}
                        className="h-full rounded-full bg-olive-600 dark:bg-olive-400"
                        initial={{ width: 0 }}
                        transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        Priority
                      </span>
                      <div className="flex items-center gap-1">
                        <Lightning
                          className={cn(
                            "size-3",
                            priorityColorClass(selected.aiPriority)
                          )}
                          weight="fill"
                        />
                        <span className="font-medium text-[11px] text-foreground">
                          {selected.aiPriority}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="mb-4">
                  <span className="mb-1.5 block font-medium text-[11px] text-muted-foreground">
                    Auto-tagged
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.tags.map((t) => (
                      <Badge color={t.color} key={t.label}>
                        <Brain className="size-2.5" weight="fill" />
                        {t.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Draft reply */}
                <div className="rounded-lg border border-olive-600/20 border-dashed bg-olive-600/3 p-3 dark:border-olive-400/20 dark:bg-olive-400/4">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <Sparkle
                      className="text-olive-600 dark:text-olive-400"
                      size={10}
                      weight="fill"
                    />
                    <span className="font-medium text-[10px] text-olive-600 dark:text-olive-400">
                      AI Draft Reply
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Thanks for this request! We&apos;re actively working on
                    webhook support — expect it in our next release cycle...
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
