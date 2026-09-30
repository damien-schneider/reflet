"use client";

import { ArrowDown, ArrowUp } from "@phosphor-icons/react";
import { domAnimation, LazyMotion, MotionConfig, m } from "motion/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { cn } from "@/lib/utils";

type VoteDirection = "upvote" | "downvote" | null;

interface VoteContextValue {
  downvotes: number;
  upvotes: number;
  vote: (direction: "upvote" | "downvote") => void;
  voteType: VoteDirection;
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

const NEUTRAL_STATUS = "bg-muted text-muted-foreground";

const STATUS_COLORS = {
  blue: "bg-tag-blue/15 text-tag-blue-text",
  brown: "bg-tag-brown/15 text-tag-brown-text",
  default: NEUTRAL_STATUS,
  gray: NEUTRAL_STATUS,
  green: "bg-tag-green/15 text-tag-green-text",
  orange: "bg-tag-orange/15 text-tag-orange-text",
  pink: "bg-tag-pink/15 text-tag-pink-text",
  purple: "bg-tag-purple/15 text-tag-purple-text",
  red: "bg-tag-red/15 text-tag-red-text",
  yellow: "bg-tag-yellow/15 text-tag-yellow-text",
} as const;

type StatusColor = keyof typeof STATUS_COLORS;

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

interface EditorialFeedItemProps {
  children: ReactNode;
  className?: string;
  defaultDownvotes?: number;
  defaultUpvotes?: number;
  downvotes?: number;
  onVote?: (direction: "upvote" | "downvote") => void;
  onVoteChange?: (upvotes: number, downvotes: number) => void;
  upvotes?: number;
  voteType?: VoteDirection;
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
      const next = internalVoteType === direction ? null : direction;
      let nextUp = internalUpvotes;
      let nextDown = internalDownvotes;

      if (internalVoteType === "upvote") {
        nextUp -= 1;
      }
      if (internalVoteType === "downvote") {
        nextDown -= 1;
      }
      if (next === "upvote") {
        nextUp += 1;
      }
      if (next === "downvote") {
        nextDown += 1;
      }

      setInternalVoteType(next);
      setInternalUpvotes(nextUp);
      setInternalDownvotes(nextDown);
      onVoteChange?.(nextUp, nextDown);
    },
    [internalVoteType, internalUpvotes, internalDownvotes, onVoteChange]
  );

  const contextValue = useMemo(
    () =>
      isControlled
        ? {
            downvotes: controlledDownvotes ?? 0,
            upvotes: controlledUpvotes,
            vote: (direction: "upvote" | "downvote") => onVote?.(direction),
            voteType: controlledVoteType ?? null,
          }
        : {
            downvotes: internalDownvotes,
            upvotes: internalUpvotes,
            vote: internalVote,
            voteType: internalVoteType,
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
      <LazyMotion features={domAnimation}>
        <MotionConfig reducedMotion="user">
          <div className={cn("relative py-4 pl-16", className)}>{children}</div>
        </MotionConfig>
      </LazyMotion>
    </VoteContext.Provider>
  );
}

function EditorialFeedVote() {
  const { voteType, upvotes, downvotes, vote } = useVoteContext();

  return (
    <div className="absolute top-4 left-0 flex w-12 flex-col items-center gap-0.5">
      <m.button
        aria-label={voteType === "upvote" ? "Remove upvote" : "Upvote"}
        aria-pressed={voteType === "upvote"}
        className={cn(
          "relative rounded-sm transition-colors before:absolute before:-inset-2 before:content-[''] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
          voteType === "upvote"
            ? "text-primary"
            : "text-muted-foreground/70 hover:text-primary"
        )}
        onClick={(e) => {
          e.stopPropagation();
          vote("upvote");
        }}
        type="button"
        whileTap={{ scale: 0.96 }}
      >
        <ArrowUp
          aria-hidden
          className="h-3 w-3"
          weight={voteType === "upvote" ? "bold" : "regular"}
        />
      </m.button>
      <span
        aria-live="polite"
        className="text-[10px] text-muted-foreground/70 tabular-nums"
      >
        {upvotes}
        <span aria-hidden>&uarr;</span>
        <span className="sr-only"> upvotes,</span> {downvotes}
        <span aria-hidden>&darr;</span>
        <span className="sr-only"> downvotes</span>
      </span>
      <m.button
        aria-label={voteType === "downvote" ? "Remove downvote" : "Downvote"}
        aria-pressed={voteType === "downvote"}
        className={cn(
          "relative rounded-sm transition-colors before:absolute before:-inset-2 before:content-[''] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
          voteType === "downvote"
            ? "text-destructive"
            : "text-muted-foreground/70 hover:text-destructive"
        )}
        onClick={(e) => {
          e.stopPropagation();
          vote("downvote");
        }}
        type="button"
        whileTap={{ scale: 0.96 }}
      >
        <ArrowDown
          aria-hidden
          className="h-3 w-3"
          weight={voteType === "downvote" ? "bold" : "regular"}
        />
      </m.button>
    </div>
  );
}

interface EditorialFeedRuleProps {
  className?: string;
}

function EditorialFeedRule({ className }: EditorialFeedRuleProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute top-0 bottom-0 left-14 w-px bg-border/20",
        className
      )}
    />
  );
}

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

interface EditorialFeedStatusProps {
  children: ReactNode;
  className?: string;
  color?: StatusColor;
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
        STATUS_COLORS[color] ?? NEUTRAL_STATUS,
        className
      )}
    >
      {children}
    </span>
  );
}

interface EditorialFeedTagProps {
  children: ReactNode;
  className?: string;
}

function EditorialFeedTag({ children, className }: EditorialFeedTagProps) {
  return <span className={cn("italic", className)}>#{children}</span>;
}

interface EditorialFeedCommentsProps {
  className?: string;
  count: number;
}

function EditorialFeedComments({
  count,
  className,
}: EditorialFeedCommentsProps) {
  return (
    <>
      <span aria-hidden className={className}>
        &middot;
      </span>
      <span className={className}>
        {count} {count === 1 ? "comment" : "comments"}
      </span>
    </>
  );
}

interface EditorialFeedTimeProps {
  children: ReactNode;
  className?: string;
}

function EditorialFeedTime({ children, className }: EditorialFeedTimeProps) {
  return <span className={cn("italic", className)}>{children}</span>;
}

export {
  EditorialFeed,
  EditorialFeedComments,
  EditorialFeedContent,
  EditorialFeedItem,
  EditorialFeedMeta,
  EditorialFeedRule,
  EditorialFeedStatus,
  EditorialFeedTag,
  EditorialFeedTime,
  EditorialFeedTitle,
  EditorialFeedVote,
};
