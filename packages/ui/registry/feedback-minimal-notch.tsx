"use client";

import { CaretDown, CaretUp, Chat } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

import { cn } from "@/lib/utils";

// ─── Color Map ──────────────────────────────────────────────────────────────

type BadgeColor =
  | "purple"
  | "green"
  | "blue"
  | "red"
  | "amber"
  | "pink"
  | "gray";

const COLOR_MAP: Record<BadgeColor, string> = {
  purple:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  gray: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
};

// ─── Vote State ─────────────────────────────────────────────────────────────

type VoteType = "upvote" | "downvote" | null;

interface VoteState {
  voteType: VoteType;
  upvotes: number;
  downvotes: number;
  vote: (type: "upvote" | "downvote") => void;
}

function useVoteState(
  initialUp: number,
  initialDown: number,
  onVoteChange?: (
    voteType: VoteType,
    upvotes: number,
    downvotes: number
  ) => void
): VoteState {
  const [voteType, setVoteType] = useState<VoteType>(null);
  const [upvotes, setUpvotes] = useState(initialUp);
  const [downvotes, setDownvotes] = useState(initialDown);

  const vote = useCallback(
    (type: "upvote" | "downvote") => {
      let nextVoteType: VoteType;
      let nextUp = upvotes;
      let nextDown = downvotes;

      if (voteType === type) {
        nextVoteType = null;
        if (type === "upvote") {
          nextUp -= 1;
        } else {
          nextDown -= 1;
        }
      } else {
        if (voteType === "upvote") {
          nextUp -= 1;
        }
        if (voteType === "downvote") {
          nextDown -= 1;
        }
        nextVoteType = type;
        if (type === "upvote") {
          nextUp += 1;
        } else {
          nextDown += 1;
        }
      }

      setVoteType(nextVoteType);
      setUpvotes(nextUp);
      setDownvotes(nextDown);
      onVoteChange?.(nextVoteType, nextUp, nextDown);
    },
    [voteType, upvotes, downvotes, onVoteChange]
  );

  return { voteType, upvotes, downvotes, vote };
}

// ─── Context ────────────────────────────────────────────────────────────────

const MinimalNotchContext = createContext<VoteState | null>(null);

function useMinimalNotchContext(): VoteState {
  const context = useContext(MinimalNotchContext);
  if (!context) {
    throw new Error(
      "MinimalNotch sub-components must be used within <MinimalNotch>"
    );
  }
  return context;
}

// ─── Root Provider ──────────────────────────────────────────────────────────

interface MinimalNotchProps {
  defaultUpvotes: number;
  defaultDownvotes: number;
  onVoteChange?: (
    voteType: VoteType,
    upvotes: number,
    downvotes: number
  ) => void;
  children: ReactNode;
  className?: string;
}

function MinimalNotch({
  defaultUpvotes,
  defaultDownvotes,
  onVoteChange,
  children,
  className,
}: MinimalNotchProps) {
  const state = useVoteState(defaultUpvotes, defaultDownvotes, onVoteChange);

  return (
    <MinimalNotchContext.Provider value={state}>
      <div className={cn("group flex gap-3", className)}>{children}</div>
    </MinimalNotchContext.Provider>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────

interface MinimalNotchCardProps {
  children: ReactNode;
  className?: string;
}

function MinimalNotchCard({ children, className }: MinimalNotchCardProps) {
  return (
    <div
      className={cn(
        "flex-1 rounded-xl border border-border/50 bg-card px-4 py-4 transition-all hover:border-border hover:shadow-sm",
        className
      )}
    >
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ─── Title ──────────────────────────────────────────────────────────────────

interface MinimalNotchTitleProps {
  children: ReactNode;
  className?: string;
}

function MinimalNotchTitle({ children, className }: MinimalNotchTitleProps) {
  return (
    <h3 className={cn("font-medium text-sm leading-snug", className)}>
      {children}
    </h3>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────

interface MinimalNotchStatusProps {
  children: ReactNode;
  color?: BadgeColor;
  className?: string;
}

function MinimalNotchStatus({
  children,
  color = "blue",
  className,
}: MinimalNotchStatusProps) {
  return (
    <span
      className={cn(
        "mt-1.5 inline-flex items-center rounded-sm px-2 py-0.5 font-normal text-[10px]",
        COLOR_MAP[color],
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── Tags Container ─────────────────────────────────────────────────────────

interface MinimalNotchTagsProps {
  children: ReactNode;
  className?: string;
}

function MinimalNotchTags({ children, className }: MinimalNotchTagsProps) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>{children}</div>
  );
}

// ─── Individual Tag ─────────────────────────────────────────────────────────

interface MinimalNotchTagProps {
  children: ReactNode;
  color?: BadgeColor;
  className?: string;
}

function MinimalNotchTag({
  children,
  color = "gray",
  className,
}: MinimalNotchTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 font-normal text-[10px]",
        COLOR_MAP[color],
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── Meta ───────────────────────────────────────────────────────────────────

interface MinimalNotchMetaProps {
  comments: number;
  time: string;
  className?: string;
}

function MinimalNotchMeta({
  comments,
  time,
  className,
}: MinimalNotchMetaProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 text-[11px] text-muted-foreground",
        className
      )}
    >
      <span className="flex items-center gap-1">
        <Chat aria-hidden className="h-3 w-3" />
        {comments}
      </span>
      <span className="opacity-70">{time}</span>
    </div>
  );
}

// ─── Vote Column with Notch ─────────────────────────────────────────────────

function MinimalNotchVote() {
  const { voteType, upvotes, downvotes, vote } = useMinimalNotchContext();

  let notchColor = "var(--color-border)";
  if (voteType === "upvote") {
    notchColor = "var(--color-primary)";
  } else if (voteType === "downvote") {
    notchColor = "var(--color-destructive)";
  }

  return (
    <div className="relative flex flex-col items-center justify-center gap-0 self-stretch">
      <AnimatePresence>
        {voteType && (
          <motion.div
            animate={{ opacity: 0.5, scale: 1 }}
            className={cn(
              "absolute top-1/2 left-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl",
              voteType === "upvote" ? "bg-primary/25" : "bg-destructive/25"
            )}
            exit={{ opacity: 0, scale: 0.5 }}
            initial={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
      <button
        aria-label={
          voteType === "upvote" ? "Remove upvote" : "Upvote this feedback"
        }
        className={cn(
          "relative flex flex-1 flex-col items-center justify-end gap-0.5 pb-1 transition-colors duration-200",
          voteType === "upvote"
            ? "text-primary"
            : "text-muted-foreground/40 hover:text-muted-foreground"
        )}
        onClick={() => vote("upvote")}
        type="button"
      >
        <CaretUp
          aria-hidden
          className="h-3.5 w-3.5"
          weight={voteType === "upvote" ? "bold" : "regular"}
        />
        <span className="font-medium text-[10px] tabular-nums">{upvotes}</span>
      </button>
      <motion.div
        animate={{
          height: voteType ? 4 : 3,
          backgroundColor: notchColor,
          width: voteType ? 24 : 12,
          boxShadow: voteType
            ? `0 0 8px 1px ${notchColor}`
            : "0 0 0px 0px transparent",
        }}
        className="rounded-full"
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      />
      <button
        aria-label={
          voteType === "downvote" ? "Remove downvote" : "Downvote this feedback"
        }
        className={cn(
          "relative flex flex-1 flex-col items-center justify-start gap-0.5 pt-1 transition-colors duration-200",
          voteType === "downvote"
            ? "text-destructive"
            : "text-muted-foreground/40 hover:text-muted-foreground"
        )}
        onClick={() => vote("downvote")}
        type="button"
      >
        <span className="font-medium text-[10px] tabular-nums">
          {downvotes}
        </span>
        <CaretDown
          aria-hidden
          className="h-3.5 w-3.5"
          weight={voteType === "downvote" ? "bold" : "regular"}
        />
      </button>
    </div>
  );
}

// ─── Exports ────────────────────────────────────────────────────────────────

export {
  MinimalNotch,
  MinimalNotchCard,
  MinimalNotchTitle,
  MinimalNotchStatus,
  MinimalNotchTags,
  MinimalNotchTag,
  MinimalNotchMeta,
  MinimalNotchVote,
};
