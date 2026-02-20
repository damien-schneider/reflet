"use client";

import { CaretDown, CaretUp, Chat } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type VoteType = "upvote" | "downvote" | null;

interface VoteState {
  voteType: VoteType;
  upvotes: number;
  downvotes: number;
  vote: (type: "upvote" | "downvote") => void;
}

interface SweepCornerContextValue extends VoteState {}

// ─── Tag Color Map ──────────────────────────────────────────────────────────

const TAG_COLORS: Record<string, string> = {
  purple:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  gray: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
};

// ─── Context ────────────────────────────────────────────────────────────────

const SweepCornerContext = createContext<SweepCornerContextValue | null>(null);

function useSweepCornerContext(): SweepCornerContextValue {
  const context = useContext(SweepCornerContext);
  if (!context) {
    throw new Error(
      "SweepCorner sub-components must be used within a <SweepCorner> provider."
    );
  }
  return context;
}

// ─── Vote Hook ──────────────────────────────────────────────────────────────

function useVoteState(
  initialUp: number,
  initialDown: number,
  onVoteChange?: (voteType: VoteType) => void
): VoteState {
  const [voteType, setVoteType] = useState<VoteType>(null);
  const [upvotes, setUpvotes] = useState(initialUp);
  const [downvotes, setDownvotes] = useState(initialDown);

  const vote = useCallback(
    (type: "upvote" | "downvote") => {
      let nextVoteType: VoteType;

      if (voteType === type) {
        nextVoteType = null;
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
        nextVoteType = type;
        if (type === "upvote") {
          setUpvotes((v) => v + 1);
        } else {
          setDownvotes((v) => v + 1);
        }
      }

      setVoteType(nextVoteType);
      onVoteChange?.(nextVoteType);
    },
    [voteType, onVoteChange]
  );

  return { voteType, upvotes, downvotes, vote };
}

// ─── Animated Count Helper ──────────────────────────────────────────────────

function AnimatedCount({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        animate={{ y: 0, opacity: 1 }}
        className={cn("tabular-nums", className)}
        exit={{ y: -6, opacity: 0 }}
        initial={{ y: 6, opacity: 0 }}
        key={value}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  );
}

// ─── SweepCorner (Root Provider) ────────────────────────────────────────────

interface SweepCornerProps {
  defaultUpvotes: number;
  defaultDownvotes: number;
  onVoteChange?: (voteType: VoteType) => void;
  children: ReactNode;
  className?: string;
}

function SweepCorner({
  defaultUpvotes,
  defaultDownvotes,
  onVoteChange,
  children,
  className,
}: SweepCornerProps) {
  const voteState = useVoteState(
    defaultUpvotes,
    defaultDownvotes,
    onVoteChange
  );

  const contextValue = useMemo<SweepCornerContextValue>(
    () => voteState,
    [voteState]
  );

  return (
    <SweepCornerContext.Provider value={contextValue}>
      <div className={cn("relative", className)}>{children}</div>
    </SweepCornerContext.Provider>
  );
}

// ─── SweepCornerCard ────────────────────────────────────────────────────────

interface SweepCornerCardProps {
  children: ReactNode;
  className?: string;
}

function SweepCornerCard({ children, className }: SweepCornerCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card transition-all hover:border-border hover:shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── SweepCornerContent ─────────────────────────────────────────────────────

interface SweepCornerContentProps {
  children: ReactNode;
  className?: string;
}

function SweepCornerContent({ children, className }: SweepCornerContentProps) {
  return (
    <div className={cn("space-y-3 px-4 pt-4 pr-20", className)}>{children}</div>
  );
}

// ─── SweepCornerTitle ───────────────────────────────────────────────────────

interface SweepCornerTitleProps {
  children: ReactNode;
  className?: string;
}

function SweepCornerTitle({ children, className }: SweepCornerTitleProps) {
  return (
    <h3 className={cn("font-medium text-sm leading-snug", className)}>
      {children}
    </h3>
  );
}

// ─── SweepCornerTags ────────────────────────────────────────────────────────

interface SweepCornerTagsProps {
  children: ReactNode;
  className?: string;
}

function SweepCornerTags({ children, className }: SweepCornerTagsProps) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>{children}</div>
  );
}

// ─── SweepCornerTag ─────────────────────────────────────────────────────────

interface SweepCornerTagProps {
  children: ReactNode;
  color: string;
  className?: string;
}

function SweepCornerTag({ children, color, className }: SweepCornerTagProps) {
  const colorClasses =
    TAG_COLORS[color] ?? "bg-secondary text-secondary-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 font-normal text-[10px]",
        colorClasses,
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── SweepCornerBadge ───────────────────────────────────────────────────────

function SweepCornerBadge() {
  const { voteType, upvotes, downvotes, vote } = useSweepCornerContext();
  const net = upvotes - downvotes;

  return (
    <motion.div
      animate={{
        borderRadius: voteType ? "0 12px 0 16px" : "0 12px 0 12px",
      }}
      className="absolute top-0 right-0 flex items-center gap-0 overflow-hidden border-border/30 border-b border-l bg-card shadow-sm"
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <motion.button
        animate={{
          backgroundColor:
            voteType === "upvote" ? "var(--color-primary)" : "transparent",
        }}
        aria-label={voteType === "upvote" ? "Remove upvote" : "Upvote"}
        className={cn(
          "relative cursor-pointer px-2.5 py-2 text-xs transition-colors",
          voteType === "upvote"
            ? "text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        onClick={() => vote("upvote")}
        type="button"
        whileTap={{ scale: 0.85 }}
      >
        <CaretUp
          className="h-3.5 w-3.5"
          weight={voteType === "upvote" ? "bold" : "regular"}
        />
      </motion.button>

      <AnimatedCount
        className={cn(
          "px-2 py-1.5 font-bold text-xs",
          voteType === "upvote" && "text-primary",
          voteType === "downvote" && "text-destructive",
          !voteType && "text-foreground"
        )}
        value={net}
      />

      <motion.button
        animate={{
          backgroundColor:
            voteType === "downvote"
              ? "var(--color-destructive)"
              : "transparent",
        }}
        aria-label={voteType === "downvote" ? "Remove downvote" : "Downvote"}
        className={cn(
          "relative cursor-pointer px-2.5 py-2 text-xs transition-colors",
          voteType === "downvote"
            ? "text-destructive-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        onClick={() => vote("downvote")}
        type="button"
        whileTap={{ scale: 0.85 }}
      >
        <CaretDown
          className="h-3.5 w-3.5"
          weight={voteType === "downvote" ? "bold" : "regular"}
        />
      </motion.button>
    </motion.div>
  );
}

// ─── SweepCornerFooter ──────────────────────────────────────────────────────

interface SweepCornerFooterProps {
  comments: number;
  time: string;
  className?: string;
}

function SweepCornerFooter({
  comments,
  time,
  className,
}: SweepCornerFooterProps) {
  const { voteType, upvotes, downvotes } = useSweepCornerContext();
  const total = upvotes + downvotes;
  const upPercent = total > 0 ? Math.round((upvotes / total) * 100) : 50;

  return (
    <div
      className={cn(
        "relative mt-3 overflow-hidden border-border/30 border-t",
        className
      )}
    >
      <AnimatePresence>
        {voteType && (
          <motion.div
            animate={{ x: "100%", opacity: 0 }}
            className={cn(
              "absolute inset-0",
              voteType === "upvote"
                ? "bg-gradient-to-r from-transparent via-primary/12 to-transparent"
                : "bg-gradient-to-r from-transparent via-destructive/12 to-transparent"
            )}
            exit={{ opacity: 0 }}
            initial={{ x: "-100%", opacity: 1 }}
            key={voteType}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      <div className="relative flex items-center gap-2 px-4 py-2">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Chat className="h-3 w-3" />
            {comments}
          </span>
          <span className="opacity-70">{time}</span>
        </div>
        <span className="text-[9px] text-muted-foreground/30 tabular-nums">
          {upvotes}↑ {downvotes}↓
        </span>
        <span className="text-[9px] text-muted-foreground/30 tabular-nums">
          {upPercent}%
        </span>
      </div>
    </div>
  );
}

// ─── Exports ────────────────────────────────────────────────────────────────

export {
  SweepCorner,
  SweepCornerCard,
  SweepCornerContent,
  SweepCornerTitle,
  SweepCornerTags,
  SweepCornerTag,
  SweepCornerBadge,
  SweepCornerFooter,
};
