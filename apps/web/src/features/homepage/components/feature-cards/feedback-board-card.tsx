"use client";

import { CaretUp, ChatCircleDots, Sparkle } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { H3 } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { useInView } from "../../hooks/use-in-view";

const NOTCH_FEEDBACK = [
  {
    comments: 14,
    desc: "Add a dark theme for late night sessions",
    id: "dark-mode",
    label: "Planned",
    notchColor: "bg-[#0f7b6c]",
    status: "green" as const,
    tags: [
      { ai: true, color: "purple" as const, label: "UX" },
      { ai: false, color: "pink" as const, label: "Design" },
    ],
    time: "2d ago",
    title: "Dark mode support",
    votes: 248,
  },
  {
    comments: 8,
    desc: "Get feedback updates directly in Slack channels",
    id: "slack",
    label: "In Progress",
    notchColor: "bg-[#d9730d]",
    status: "orange" as const,
    tags: [{ ai: true, color: "blue" as const, label: "Integration" }],
    time: "5d ago",
    title: "Slack Integration",
    votes: 186,
  },
  {
    comments: 6,
    desc: "Pull feedback data into your internal dashboard",
    id: "api",
    label: "Under Review",
    notchColor: "bg-[#0b6e99]",
    status: "blue" as const,
    tags: [
      { ai: false, color: "blue" as const, label: "API" },
      { ai: false, color: "gray" as const, label: "Dev" },
    ],
    time: "1w ago",
    title: "Public API Access",
    votes: 142,
  },
  {
    comments: 3,
    desc: "Export feedback data for reporting and analysis",
    id: "csv",
    label: "Done",
    notchColor: "bg-[#6940a5]",
    status: "purple" as const,
    tags: [{ ai: true, color: "yellow" as const, label: "Data" }],
    time: "2w ago",
    title: "CSV Export",
    votes: 76,
  },
] as const;

export function FeedbackBoardCard() {
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
                        isVoted ? { scale: [1, 1.2, 1], y: [0, -2, 0] } : {}
                      }
                      transition={{
                        damping: 20,
                        stiffness: 400,
                        type: "spring",
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
