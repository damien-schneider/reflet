"use client";

import { CaretDown, CaretUp, Chat } from "@phosphor-icons/react";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  MotionConfig,
  m,
} from "motion/react";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { cn } from "@/lib/utils";

type VoteType = "upvote" | "downvote" | null;

interface VoteState {
  downvotes: number;
  upvotes: number;
  vote: (type: "upvote" | "downvote") => void;
  voteType: VoteType;
}

type SweepCornerContextValue = VoteState;

const NEUTRAL_TAG = "bg-muted text-muted-foreground";

const TAG_COLORS: Record<string, string> = {
  blue: "bg-tag-blue/15 text-tag-blue-text",
  brown: "bg-tag-brown/15 text-tag-brown-text",
  default: NEUTRAL_TAG,
  gray: NEUTRAL_TAG,
  green: "bg-tag-green/15 text-tag-green-text",
  orange: "bg-tag-orange/15 text-tag-orange-text",
  pink: "bg-tag-pink/15 text-tag-pink-text",
  purple: "bg-tag-purple/15 text-tag-purple-text",
  red: "bg-tag-red/15 text-tag-red-text",
  yellow: "bg-tag-yellow/15 text-tag-yellow-text",
};

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

  return { downvotes, upvotes, vote, voteType };
}

function AnimatedCount({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <AnimatePresence mode="popLayout">
      <m.span
        animate={{ opacity: 1, y: 0 }}
        aria-hidden
        className={cn("tabular-nums", className)}
        exit={{ opacity: 0, y: -6 }}
        initial={{ opacity: 0, y: 6 }}
        key={value}
        transition={{ damping: 20, stiffness: 400, type: "spring" }}
      >
        {value}
      </m.span>
    </AnimatePresence>
  );
}

interface SweepCornerProps {
  children: ReactNode;
  className?: string;
  defaultDownvotes?: number;
  defaultUpvotes?: number;
  downvotes?: number;
  onVote?: (direction: "upvote" | "downvote") => void;
  onVoteChange?: (voteType: VoteType) => void;
  upvotes?: number;
  voteType?: VoteType;
}

function SweepCorner({
  defaultUpvotes = 0,
  defaultDownvotes = 0,
  onVoteChange,
  upvotes: controlledUpvotes,
  downvotes: controlledDownvotes,
  voteType: controlledVoteType,
  onVote,
  children,
  className,
}: SweepCornerProps) {
  const internalState = useVoteState(
    defaultUpvotes,
    defaultDownvotes,
    onVoteChange
  );

  const isControlled = controlledUpvotes !== undefined;

  const controlledState = useMemo<SweepCornerContextValue>(
    () => ({
      downvotes: controlledDownvotes ?? 0,
      upvotes: controlledUpvotes ?? 0,
      vote: (type) => onVote?.(type),
      voteType: controlledVoteType ?? null,
    }),
    [controlledUpvotes, controlledDownvotes, controlledVoteType, onVote]
  );

  const contextValue = isControlled ? controlledState : internalState;

  return (
    <SweepCornerContext.Provider value={contextValue}>
      <LazyMotion features={domAnimation}>
        <MotionConfig reducedMotion="user">
          <div className={cn("relative", className)}>{children}</div>
        </MotionConfig>
      </LazyMotion>
    </SweepCornerContext.Provider>
  );
}

interface SweepCornerCardProps {
  children: ReactNode;
  className?: string;
}

function SweepCornerCard({ children, className }: SweepCornerCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card hover:border-border hover:shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

interface SweepCornerContentProps {
  children: ReactNode;
  className?: string;
}

function SweepCornerContent({ children, className }: SweepCornerContentProps) {
  return (
    <div className={cn("space-y-3 px-4 pt-4 pr-20", className)}>{children}</div>
  );
}

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

interface SweepCornerTagsProps {
  children: ReactNode;
  className?: string;
}

function SweepCornerTags({ children, className }: SweepCornerTagsProps) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>{children}</div>
  );
}

interface SweepCornerTagProps {
  children: ReactNode;
  className?: string;
  color: string;
}

function SweepCornerTag({ children, color, className }: SweepCornerTagProps) {
  const colorClasses = TAG_COLORS[color] ?? NEUTRAL_TAG;

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

function SweepCornerBadge() {
  const { voteType, upvotes, downvotes, vote } = useSweepCornerContext();
  const net = upvotes - downvotes;

  return (
    <m.div
      animate={{
        borderRadius: voteType ? "0 12px 0 16px" : "0 12px 0 12px",
      }}
      className="absolute top-0 right-0 z-20 flex items-center gap-0 overflow-hidden border-border/30 border-b border-l bg-card shadow-sm"
      transition={{ damping: 20, stiffness: 300, type: "spring" }}
    >
      <m.button
        aria-label={voteType === "upvote" ? "Remove upvote" : "Upvote"}
        aria-pressed={voteType === "upvote"}
        className={cn(
          "relative cursor-pointer px-2.5 py-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2",
          voteType === "upvote"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
      </m.button>

      <AnimatedCount
        className={cn(
          "px-2 py-1.5 font-bold text-xs",
          voteType === "upvote" && "text-primary",
          voteType === "downvote" && "text-destructive",
          !voteType && "text-foreground"
        )}
        value={net}
      />
      <span aria-live="polite" className="sr-only">
        {`${net} net votes`}
      </span>

      <m.button
        aria-label={voteType === "downvote" ? "Remove downvote" : "Downvote"}
        aria-pressed={voteType === "downvote"}
        className={cn(
          "relative cursor-pointer px-2.5 py-2 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2",
          voteType === "downvote"
            ? "bg-destructive text-destructive-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        onClick={(e) => {
          e.stopPropagation();
          vote("downvote");
        }}
        type="button"
      >
        <CaretDown
          aria-hidden
          className="h-3.5 w-3.5"
          weight={voteType === "downvote" ? "bold" : "regular"}
        />
      </m.button>
    </m.div>
  );
}

interface SweepCornerFooterProps {
  className?: string;
  comments: number;
  time: string;
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
          <m.div
            animate={{ opacity: 0, x: "100%" }}
            aria-hidden
            className={cn(
              "absolute inset-0",
              voteType === "upvote"
                ? "bg-gradient-to-r from-transparent via-primary/12 to-transparent"
                : "bg-gradient-to-r from-transparent via-destructive/12 to-transparent"
            )}
            exit={{ opacity: 0 }}
            initial={{ opacity: 1, x: "-100%" }}
            key={voteType}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      <div className="relative flex items-center gap-2 px-4 py-2">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Chat aria-hidden className="h-3 w-3" />
            {comments}
            <span className="sr-only"> comments</span>
          </span>
          <span className="opacity-70">{time}</span>
        </div>
        <span className="text-[10px] text-muted-foreground/70 tabular-nums">
          {upvotes}
          <span aria-hidden>↑</span>
          <span className="sr-only"> upvotes,</span> {downvotes}
          <span aria-hidden>↓</span>
          <span className="sr-only"> downvotes</span>
        </span>
        <span className="text-[10px] text-muted-foreground/70 tabular-nums">
          {upPercent}%<span className="sr-only"> upvoted</span>
        </span>
      </div>
    </div>
  );
}

export {
  SweepCorner,
  SweepCornerBadge,
  SweepCornerCard,
  SweepCornerContent,
  SweepCornerFooter,
  SweepCornerTag,
  SweepCornerTags,
  SweepCornerTitle,
};
