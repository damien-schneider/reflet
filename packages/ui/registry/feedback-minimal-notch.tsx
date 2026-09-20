"use client";

import { CaretDown, CaretUp, Chat } from "@phosphor-icons/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

import { cn } from "@/lib/utils";

type BadgeColor =
  | "blue"
  | "brown"
  | "default"
  | "gray"
  | "green"
  | "orange"
  | "pink"
  | "purple"
  | "red"
  | "yellow";

const NEUTRAL_BADGE = "bg-muted text-muted-foreground";

const COLOR_MAP: Record<BadgeColor, string> = {
  blue: "bg-tag-blue/15 text-tag-blue-text",
  brown: "bg-tag-brown/15 text-tag-brown-text",
  default: NEUTRAL_BADGE,
  gray: NEUTRAL_BADGE,
  green: "bg-tag-green/15 text-tag-green-text",
  orange: "bg-tag-orange/15 text-tag-orange-text",
  pink: "bg-tag-pink/15 text-tag-pink-text",
  purple: "bg-tag-purple/15 text-tag-purple-text",
  red: "bg-tag-red/15 text-tag-red-text",
  yellow: "bg-tag-yellow/15 text-tag-yellow-text",
};

type VoteType = "upvote" | "downvote" | null;

interface VoteState {
  downvotes: number;
  upvotes: number;
  vote: (type: "upvote" | "downvote") => void;
  voteType: VoteType;
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

  return { downvotes, upvotes, vote, voteType };
}

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

interface MinimalNotchProps {
  children: ReactNode;
  className?: string;
  defaultDownvotes?: number;
  defaultUpvotes?: number;
  downvotes?: number;
  onVote?: (direction: "upvote" | "downvote") => void;
  onVoteChange?: (
    voteType: VoteType,
    upvotes: number,
    downvotes: number
  ) => void;
  upvotes?: number;
  voteType?: VoteType;
}

function MinimalNotch({
  defaultUpvotes = 0,
  defaultDownvotes = 0,
  onVoteChange,
  upvotes: controlledUpvotes,
  downvotes: controlledDownvotes,
  voteType: controlledVoteType,
  onVote,
  children,
  className,
}: MinimalNotchProps) {
  const internalState = useVoteState(
    defaultUpvotes,
    defaultDownvotes,
    onVoteChange
  );

  const isControlled = controlledUpvotes !== undefined;

  const state: VoteState = isControlled
    ? {
        downvotes: controlledDownvotes ?? 0,
        upvotes: controlledUpvotes,
        vote: (type) => onVote?.(type),
        voteType: controlledVoteType ?? null,
      }
    : internalState;

  return (
    <MinimalNotchContext.Provider value={state}>
      <MotionConfig reducedMotion="user">
        <div className={cn("group flex gap-3", className)}>{children}</div>
      </MotionConfig>
    </MinimalNotchContext.Provider>
  );
}

interface MinimalNotchCardProps {
  children: ReactNode;
  className?: string;
}

function MinimalNotchCard({ children, className }: MinimalNotchCardProps) {
  return (
    <div
      className={cn(
        "flex-1 rounded-xl border border-border/50 bg-card px-4 py-4 transition-[border-color,box-shadow] hover:border-border hover:shadow-sm",
        className
      )}
    >
      <div className="space-y-3">{children}</div>
    </div>
  );
}

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

interface MinimalNotchStatusProps {
  children: ReactNode;
  className?: string;
  color?: BadgeColor;
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
        COLOR_MAP[color] ?? NEUTRAL_BADGE,
        className
      )}
    >
      {children}
    </span>
  );
}

interface MinimalNotchTagsProps {
  children: ReactNode;
  className?: string;
}

function MinimalNotchTags({ children, className }: MinimalNotchTagsProps) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>{children}</div>
  );
}

interface MinimalNotchTagProps {
  children: ReactNode;
  className?: string;
  color?: BadgeColor;
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
        COLOR_MAP[color] ?? NEUTRAL_BADGE,
        className
      )}
    >
      {children}
    </span>
  );
}

interface MinimalNotchMetaProps {
  className?: string;
  comments: number;
  time: string;
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
        onClick={(e) => {
          e.stopPropagation();
          vote("upvote");
        }}
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
          backgroundColor: notchColor,
          boxShadow: voteType
            ? `0 0 8px 1px ${notchColor}`
            : `0 0 0px 0px ${notchColor}`,
          height: voteType ? 4 : 3,
          width: voteType ? 24 : 12,
        }}
        className="rounded-full"
        transition={{ damping: 20, stiffness: 400, type: "spring" }}
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
        onClick={(e) => {
          e.stopPropagation();
          vote("downvote");
        }}
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

export {
  MinimalNotch,
  MinimalNotchCard,
  MinimalNotchMeta,
  MinimalNotchStatus,
  MinimalNotchTag,
  MinimalNotchTags,
  MinimalNotchTitle,
  MinimalNotchVote,
};
