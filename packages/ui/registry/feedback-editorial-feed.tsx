"use client";

import { ArrowDown, ArrowUp } from "@phosphor-icons/react";
import { motion } from "motion/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { cn } from "@/lib/utils";

// ─── Vote Context ────────────────────────────────────────────────────────────

type VoteDirection = "upvote" | "downvote" | null;

interface VoteContextValue {
  voteType: VoteDirection;
  upvotes: number;
  downvotes: number;
  vote: (direction: "upvote" | "downvote") => void;
}

const VoteContext = createContext<VoteContextValue | null>(null);

function useVoteContext(): VoteContextValue {
  const context = useContext(VoteContext);
  if (!context) {
    throw new Error(
      "Editorial feed vote sub-components must be used within <EditorialFeedItem>"
    );
  }
  return context;
}

// ─── Status Color Map ────────────────────────────────────────────────────────

const STATUS_COLORS = {
  purple:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  gray: "bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400",
} as const;

type StatusColor = keyof typeof STATUS_COLORS;

// ─── EditorialFeed ───────────────────────────────────────────────────────────

interface EditorialFeedProps {
  children: ReactNode;
  className?: string;
}

function EditorialFeed({ children, className }: EditorialFeedProps) {
  return (
    <div className={cn("space-y-0 divide-y divide-border/20", className)}>
      {children}
    </div>
  );
}

// ─── EditorialFeedItem ───────────────────────────────────────────────────────

interface EditorialFeedItemProps {
  defaultUpvotes?: number;
  defaultDownvotes?: number;
  onVoteChange?: (upvotes: number, downvotes: number) => void;
  upvotes?: number;
  downvotes?: number;
  voteType?: VoteDirection;
  onVote?: (direction: "upvote" | "downvote") => void;
  children: ReactNode;
  className?: string;
}

function EditorialFeedItem({
  defaultUpvotes = 0,
  defaultDownvotes = 0,
  onVoteChange,
  upvotes: controlledUpvotes,
  downvotes: controlledDownvotes,
  voteType: controlledVoteType,
  onVote,
  children,
  className,
}: EditorialFeedItemProps) {
  const [internalVoteType, setInternalVoteType] = useState<VoteDirection>(null);
  const [internalUpvotes, setInternalUpvotes] = useState(defaultUpvotes);
  const [internalDownvotes, setInternalDownvotes] = useState(defaultDownvotes);

  const isControlled = controlledUpvotes !== undefined;

  const internalVote = useCallback(
    (direction: "upvote" | "downvote") => {
      setInternalVoteType((prev) => {
        const isToggleOff = prev === direction;
        const next = isToggleOff ? null : direction;

        setInternalUpvotes((u) => {
          let newUp = u;
          if (prev === "upvote") {
            newUp -= 1;
          }
          if (next === "upvote") {
            newUp += 1;
          }
          return newUp;
        });

        setInternalDownvotes((d) => {
          let newDown = d;
          if (prev === "downvote") {
            newDown -= 1;
          }
          if (next === "downvote") {
            newDown += 1;
          }
          return newDown;
        });

        return next;
      });

      setInternalUpvotes((currentUp) => {
        setInternalDownvotes((currentDown) => {
          onVoteChange?.(currentUp, currentDown);
          return currentDown;
        });
        return currentUp;
      });
    },
    [onVoteChange]
  );

  const contextValue = useMemo(
    () =>
      isControlled
        ? {
            voteType: controlledVoteType ?? null,
            upvotes: controlledUpvotes,
            downvotes: controlledDownvotes ?? 0,
            vote: (direction: "upvote" | "downvote") => onVote?.(direction),
          }
        : {
            voteType: internalVoteType,
            upvotes: internalUpvotes,
            downvotes: internalDownvotes,
            vote: internalVote,
          },
    [
      isControlled,
      controlledVoteType,
      controlledUpvotes,
      controlledDownvotes,
      onVote,
      internalVoteType,
      internalUpvotes,
      internalDownvotes,
      internalVote,
    ]
  );

  return (
    <VoteContext.Provider value={contextValue}>
      <div className={cn("relative py-4 pl-16", className)}>{children}</div>
    </VoteContext.Provider>
  );
}

// ─── EditorialFeedVote ───────────────────────────────────────────────────────

function EditorialFeedVote() {
  const { voteType, upvotes, downvotes, vote } = useVoteContext();

  return (
    <div className="absolute top-4 left-0 flex w-12 flex-col items-center gap-0.5">
      <motion.button
        aria-label={voteType === "upvote" ? "Remove upvote" : "Upvote"}
        className={cn(
          "transition-colors",
          voteType === "upvote"
            ? "text-primary"
            : "text-muted-foreground/30 hover:text-primary"
        )}
        onClick={(e) => {
          e.stopPropagation();
          vote("upvote");
        }}
        type="button"
        whileTap={{ scale: 0.8 }}
      >
        <ArrowUp
          className="h-3 w-3"
          weight={voteType === "upvote" ? "bold" : "regular"}
        />
      </motion.button>
      <span className="text-[9px] text-muted-foreground/40 tabular-nums">
        {upvotes}&uarr; {downvotes}&darr;
      </span>
      <motion.button
        aria-label={voteType === "downvote" ? "Remove downvote" : "Downvote"}
        className={cn(
          "transition-colors",
          voteType === "downvote"
            ? "text-destructive"
            : "text-muted-foreground/30 hover:text-destructive"
        )}
        onClick={(e) => {
          e.stopPropagation();
          vote("downvote");
        }}
        type="button"
        whileTap={{ scale: 0.8 }}
      >
        <ArrowDown
          className="h-3 w-3"
          weight={voteType === "downvote" ? "bold" : "regular"}
        />
      </motion.button>
    </div>
  );
}

// ─── EditorialFeedRule ───────────────────────────────────────────────────────

interface EditorialFeedRuleProps {
  className?: string;
}

function EditorialFeedRule({ className }: EditorialFeedRuleProps) {
  return (
    <div
      className={cn(
        "absolute top-0 bottom-0 left-14 w-px bg-border/20",
        className
      )}
    />
  );
}

// ─── EditorialFeedContent ────────────────────────────────────────────────────

interface EditorialFeedContentProps {
  children: ReactNode;
  className?: string;
}

function EditorialFeedContent({
  children,
  className,
}: EditorialFeedContentProps) {
  return <div className={className}>{children}</div>;
}

// ─── EditorialFeedTitle ──────────────────────────────────────────────────────

interface EditorialFeedTitleProps {
  children: ReactNode;
  className?: string;
}

function EditorialFeedTitle({ children, className }: EditorialFeedTitleProps) {
  return (
    <h3
      className={cn(
        "font-display text-base leading-snug tracking-tight",
        className
      )}
    >
      {children}
    </h3>
  );
}

// ─── EditorialFeedMeta ───────────────────────────────────────────────────────

interface EditorialFeedMetaProps {
  children: ReactNode;
  className?: string;
}

function EditorialFeedMeta({ children, className }: EditorialFeedMetaProps) {
  return (
    <div
      className={cn(
        "mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground/60",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── EditorialFeedStatus ─────────────────────────────────────────────────────

interface EditorialFeedStatusProps {
  children: ReactNode;
  color?: StatusColor;
  className?: string;
}

function EditorialFeedStatus({
  children,
  color = "gray",
  className,
}: EditorialFeedStatusProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 font-normal text-[10px]",
        STATUS_COLORS[color],
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── EditorialFeedTag ────────────────────────────────────────────────────────

interface EditorialFeedTagProps {
  children: ReactNode;
  className?: string;
}

function EditorialFeedTag({ children, className }: EditorialFeedTagProps) {
  return <span className={cn("italic", className)}>#{children}</span>;
}

// ─── EditorialFeedComments ───────────────────────────────────────────────────

interface EditorialFeedCommentsProps {
  count: number;
  className?: string;
}

function EditorialFeedComments({
  count,
  className,
}: EditorialFeedCommentsProps) {
  return (
    <>
      <span className={className}>&middot;</span>
      <span className={className}>
        {count} {count === 1 ? "comment" : "comments"}
      </span>
    </>
  );
}

// ─── EditorialFeedTime ───────────────────────────────────────────────────────

interface EditorialFeedTimeProps {
  children: ReactNode;
  className?: string;
}

function EditorialFeedTime({ children, className }: EditorialFeedTimeProps) {
  return <span className={cn("italic", className)}>{children}</span>;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export {
  EditorialFeed,
  EditorialFeedItem,
  EditorialFeedVote,
  EditorialFeedRule,
  EditorialFeedContent,
  EditorialFeedTitle,
  EditorialFeedMeta,
  EditorialFeedStatus,
  EditorialFeedTag,
  EditorialFeedComments,
  EditorialFeedTime,
};
