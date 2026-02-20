"use client";

import { ChatIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { MOCK } from "./mock-data";

// ─── Vote hook ────────────────────────────────────────────────────────────────

type VoteType = "upvote" | "downvote" | null;

export function useVoteState(initialUp: number, initialDown: number) {
  const [voteType, setVoteType] = useState<VoteType>(null);
  const [upvotes, setUpvotes] = useState(initialUp);
  const [downvotes, setDownvotes] = useState(initialDown);

  const vote = useCallback(
    (type: "upvote" | "downvote") => {
      if (voteType === type) {
        setVoteType(null);
        if (type === "upvote") {
          setUpvotes((v) => v - 1);
        } else {
          setDownvotes((v) => v - 1);
        }
      } else {
        if (voteType === "upvote") {
          setUpvotes((v) => v - 1);
        }
        if (voteType === "downvote") {
          setDownvotes((v) => v - 1);
        }
        setVoteType(type);
        if (type === "upvote") {
          setUpvotes((v) => v + 1);
        } else {
          setDownvotes((v) => v + 1);
        }
      }
    },
    [voteType]
  );

  return { voteType, upvotes, downvotes, vote };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function AnimatedCount({
  value,
  className,
  direction = "vertical",
}: {
  value: number;
  className?: string;
  direction?: "vertical" | "vertical-reverse";
}) {
  const exitY = direction === "vertical" ? -8 : 8;
  const initialY = direction === "vertical" ? 8 : -8;
  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        animate={{ y: 0, opacity: 1 }}
        className={cn("tabular-nums", className)}
        exit={{ y: exitY, opacity: 0 }}
        initial={{ y: initialY, opacity: 0 }}
        key={value}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

export function CardMeta() {
  return (
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <ChatIcon className="h-3 w-3" />
        {MOCK.commentCount}
      </span>
      <span className="opacity-70">{MOCK.timeAgo}</span>
    </div>
  );
}

export function CardTags() {
  return (
    <div className="flex flex-wrap gap-1">
      {MOCK.tags.map((tag) => (
        <Badge
          className="font-normal text-[10px]"
          color={tag.color}
          key={tag.id}
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}

export function CardTitle() {
  return (
    <div>
      <h3 className="font-medium text-sm leading-snug">{MOCK.title}</h3>
      <Badge
        className="mt-1.5 font-normal text-[10px]"
        color={MOCK.status.color}
      >
        {MOCK.status.name}
      </Badge>
    </div>
  );
}

export function MockCard({ voteSlot }: { voteSlot: React.ReactNode }) {
  return (
    <div className="group flex gap-3">
      <div className="flex-1 rounded-xl border border-border/50 bg-card px-4 py-4 transition-all hover:border-border hover:shadow-sm">
        <div className="space-y-3">
          <CardTitle />
          <CardTags />
          <CardMeta />
        </div>
      </div>
      {voteSlot}
    </div>
  );
}

export function FullCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card transition-all hover:border-border hover:shadow-sm">
      {children}
    </div>
  );
}
