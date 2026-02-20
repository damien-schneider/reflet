"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  BookmarkSimpleIcon,
  CaretDownIcon,
  CaretUpIcon,
  ChatIcon,
  HeartIcon,
  ShareNetworkIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  TriangleIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Mock data ────────────────────────────────────────────────────────────────

interface MockFeedback {
  title: string;
  status: { name: string; color: string };
  tags: Array<{ id: string; name: string; color: string }>;
  commentCount: number;
  timeAgo: string;
  upvotes: number;
  downvotes: number;
}

const MOCK: MockFeedback = {
  title: "Add keyboard shortcuts for common actions",
  status: { name: "Planned", color: "blue" },
  tags: [
    { id: "1", name: "UX", color: "purple" },
    { id: "2", name: "Feature", color: "green" },
  ],
  commentCount: 7,
  timeAgo: "3 days ago",
  upvotes: 24,
  downvotes: 3,
};

const MOCK_VOTERS = ["AS", "JD", "MK", "RL", "TS"];

// ─── Vote hook ────────────────────────────────────────────────────────────────

type VoteType = "upvote" | "downvote" | null;

function useVoteState(initialUp: number, initialDown: number) {
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

function AnimatedCount({
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

function CardMeta() {
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

function CardTags() {
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

function CardTitle() {
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

function MockCard({ voteSlot }: { voteSlot: React.ReactNode }) {
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

function FullCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card transition-all hover:border-border hover:shadow-sm">
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A — LAYOUT EXPLORATIONS
// Where do votes live? Different card structures and spatial arrangements.
// ═══════════════════════════════════════════════════════════════════════════════

// ── A1 · Left Column — Reddit-inspired, vote as primary navigation ───────────

function DesignLeftColumn() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  const net = upvotes - downvotes;

  let columnBg = "bg-muted/20";
  if (voteType === "upvote") {
    columnBg = "bg-primary/5";
  } else if (voteType === "downvote") {
    columnBg = "bg-destructive/5";
  }

  return (
    <div className="group flex gap-0 overflow-hidden rounded-xl border border-border/50 bg-card transition-all hover:border-border hover:shadow-sm">
      <div
        className={cn(
          "relative flex w-14 shrink-0 flex-col items-center justify-center gap-0 border-border/30 border-r py-3 transition-colors duration-300",
          columnBg
        )}
      >
        {voteType && (
          <motion.div
            animate={{ opacity: 0.6 }}
            className={cn(
              "absolute inset-0",
              voteType === "upvote"
                ? "bg-gradient-to-r from-primary/10 to-transparent"
                : "bg-gradient-to-r from-destructive/10 to-transparent"
            )}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
        <motion.button
          className={cn(
            "relative z-10 rounded-lg p-1.5 transition-colors",
            voteType === "upvote"
              ? "text-primary"
              : "text-muted-foreground/40 hover:text-primary/70"
          )}
          onClick={() => vote("upvote")}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          type="button"
          whileTap={{ scale: 0.8, y: -3 }}
        >
          <ArrowUpIcon
            className="h-5 w-5"
            weight={voteType === "upvote" ? "bold" : "regular"}
          />
        </motion.button>
        <AnimatePresence mode="popLayout">
          <motion.span
            animate={{ y: 0, opacity: 1 }}
            className={cn(
              "relative z-10 font-bold text-base tabular-nums",
              voteType === "upvote" && "text-primary",
              voteType === "downvote" && "text-destructive",
              !voteType && "text-foreground"
            )}
            exit={{ y: -10, opacity: 0 }}
            initial={{ y: 10, opacity: 0 }}
            key={net}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            {net}
          </motion.span>
        </AnimatePresence>
        <motion.button
          className={cn(
            "relative z-10 rounded-lg p-1.5 transition-colors",
            voteType === "downvote"
              ? "text-destructive"
              : "text-muted-foreground/40 hover:text-destructive/70"
          )}
          onClick={() => vote("downvote")}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          type="button"
          whileTap={{ scale: 0.8, y: 3 }}
        >
          <ArrowDownIcon
            className="h-5 w-5"
            weight={voteType === "downvote" ? "bold" : "regular"}
          />
        </motion.button>
      </div>
      <div className="flex-1 space-y-3 px-4 py-4">
        <CardTitle />
        <CardTags />
        <CardMeta />
      </div>
    </div>
  );
}

// ── A2 · Bottom Bar — vote as footer alongside metadata ──────────────────────

function DesignBottomBar() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  return (
    <FullCard>
      <div className="space-y-3 px-4 pt-4">
        <CardTitle />
        <CardTags />
      </div>
      <div className="relative mt-3 overflow-hidden border-border/30 border-t">
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
        <div className="relative flex items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-0.5">
            <motion.button
              className={cn(
                "rounded-md p-1 transition-colors",
                voteType === "upvote"
                  ? "text-primary"
                  : "text-muted-foreground/50 hover:text-primary"
              )}
              onClick={() => vote("upvote")}
              type="button"
              whileTap={{ scale: 0.8 }}
            >
              <ArrowUpIcon
                className="h-4 w-4"
                weight={voteType === "upvote" ? "bold" : "regular"}
              />
            </motion.button>
            <AnimatedCount
              className={cn(
                "min-w-5 text-center font-semibold text-xs",
                voteType === "upvote" ? "text-primary" : "text-foreground"
              )}
              value={upvotes}
            />
            <div className="mx-1 h-3 w-px bg-border" />
            <AnimatedCount
              className={cn(
                "min-w-4 text-center font-semibold text-xs",
                voteType === "downvote" ? "text-destructive" : "text-foreground"
              )}
              direction="vertical-reverse"
              value={downvotes}
            />
            <motion.button
              className={cn(
                "rounded-md p-1 transition-colors",
                voteType === "downvote"
                  ? "text-destructive"
                  : "text-muted-foreground/50 hover:text-destructive"
              )}
              onClick={() => vote("downvote")}
              type="button"
              whileTap={{ scale: 0.8 }}
            >
              <ArrowDownIcon
                className="h-4 w-4"
                weight={voteType === "downvote" ? "bold" : "regular"}
              />
            </motion.button>
          </div>
          <div className="h-3 w-px bg-border/40" />
          <CardMeta />
        </div>
      </div>
    </FullCard>
  );
}

// ── A3 · Floating Strip — detached from card, glass overlay ──────────────────

function DesignFloatingStrip() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  return (
    <div className="relative pb-4">
      <FullCard>
        <div className="space-y-3 px-4 py-4 pb-6">
          <CardTitle />
          <CardTags />
          <CardMeta />
        </div>
      </FullCard>
      <motion.div
        className="absolute right-3 -bottom-1 flex items-center gap-0.5 rounded-full border border-border/40 bg-card/80 px-1.5 py-1 shadow-lg backdrop-blur-md"
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <motion.button
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors",
            voteType === "upvote"
              ? "bg-primary/12 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => vote("upvote")}
          type="button"
          whileTap={{ scale: 0.88 }}
        >
          <ThumbsUpIcon
            className="h-3.5 w-3.5"
            weight={voteType === "upvote" ? "fill" : "regular"}
          />
          <AnimatedCount
            className="font-semibold text-[11px]"
            value={upvotes}
          />
        </motion.button>
        <div className="h-4 w-px bg-border/40" />
        <motion.button
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors",
            voteType === "downvote"
              ? "bg-destructive/12 text-destructive"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => vote("downvote")}
          type="button"
          whileTap={{ scale: 0.88 }}
        >
          <ThumbsDownIcon
            className="h-3.5 w-3.5"
            weight={voteType === "downvote" ? "fill" : "regular"}
          />
          <AnimatedCount
            className="font-semibold text-[11px]"
            direction="vertical-reverse"
            value={downvotes}
          />
        </motion.button>
      </motion.div>
    </div>
  );
}

// ── A4 · Edge Gutter — vote integrated into card border ──────────────────────

function DesignEdgeGutter() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  const net = upvotes - downvotes;

  let gutterGradient =
    "linear-gradient(180deg, var(--color-border) 0%, transparent 100%)";
  if (voteType === "upvote") {
    gutterGradient =
      "linear-gradient(180deg, var(--color-primary) 0%, transparent 100%)";
  } else if (voteType === "downvote") {
    gutterGradient =
      "linear-gradient(0deg, var(--color-destructive) 0%, transparent 100%)";
  }

  return (
    <div className="group relative flex overflow-hidden rounded-xl border border-border/50 bg-card transition-all hover:border-border hover:shadow-sm">
      <AnimatePresence>
        {voteType && (
          <motion.div
            animate={{ opacity: 1 }}
            className={cn(
              "absolute inset-0",
              voteType === "upvote"
                ? "bg-gradient-to-r from-primary/6 via-transparent to-transparent"
                : "bg-gradient-to-r from-destructive/6 via-transparent to-transparent"
            )}
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
      <div className="relative flex w-10 shrink-0 flex-col items-center justify-center gap-1 border-border/30 border-r">
        <motion.div
          animate={{
            background: gutterGradient,
            width: voteType ? 3 : 2,
            opacity: voteType ? 1 : 0.4,
          }}
          className="absolute top-2 bottom-2 left-0 rounded-r-full"
          transition={{ duration: 0.3 }}
        />
        <motion.button
          className={cn(
            "relative z-10 transition-colors",
            voteType === "upvote"
              ? "text-primary"
              : "text-muted-foreground/40 hover:text-primary"
          )}
          onClick={() => vote("upvote")}
          type="button"
          whileTap={{ scale: 0.75 }}
        >
          <CaretUpIcon
            className="h-4 w-4"
            weight={voteType === "upvote" ? "bold" : "regular"}
          />
        </motion.button>
        <span
          className={cn(
            "relative z-10 font-bold text-[11px] tabular-nums",
            voteType === "upvote" && "text-primary",
            voteType === "downvote" && "text-destructive",
            !voteType && "text-foreground"
          )}
        >
          {net}
        </span>
        <motion.button
          className={cn(
            "relative z-10 transition-colors",
            voteType === "downvote"
              ? "text-destructive"
              : "text-muted-foreground/40 hover:text-destructive"
          )}
          onClick={() => vote("downvote")}
          type="button"
          whileTap={{ scale: 0.75 }}
        >
          <CaretDownIcon
            className="h-4 w-4"
            weight={voteType === "downvote" ? "bold" : "regular"}
          />
        </motion.button>
      </div>
      <div className="relative flex-1 space-y-3 px-4 py-4">
        <CardTitle />
        <CardTags />
        <CardMeta />
      </div>
    </div>
  );
}

// ── A5 · Corner Badge — tucked into top-right ────────────────────────────────

function DesignCornerBadge() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  const net = upvotes - downvotes;
  return (
    <div className="relative">
      <FullCard>
        <div className="space-y-3 px-4 py-4 pr-20">
          <CardTitle />
          <CardTags />
          <CardMeta />
        </div>
      </FullCard>
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
          className={cn(
            "relative px-2.5 py-2 text-xs transition-colors",
            voteType === "upvote"
              ? "text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          onClick={() => vote("upvote")}
          type="button"
          whileTap={{ scale: 0.85 }}
        >
          <CaretUpIcon
            className="h-3.5 w-3.5"
            weight={voteType === "upvote" ? "bold" : "regular"}
          />
        </motion.button>
        <AnimatePresence mode="popLayout">
          <motion.span
            animate={{ y: 0, opacity: 1 }}
            className={cn(
              "px-2 py-1.5 font-bold text-xs tabular-nums",
              voteType === "upvote" && "text-primary",
              voteType === "downvote" && "text-destructive",
              !voteType && "text-foreground"
            )}
            exit={{ y: -6, opacity: 0 }}
            initial={{ y: 6, opacity: 0 }}
            key={net}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            {net}
          </motion.span>
        </AnimatePresence>
        <motion.button
          animate={{
            backgroundColor:
              voteType === "downvote"
                ? "var(--color-destructive)"
                : "transparent",
          }}
          className={cn(
            "relative px-2.5 py-2 text-xs transition-colors",
            voteType === "downvote"
              ? "text-destructive-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          onClick={() => vote("downvote")}
          type="button"
          whileTap={{ scale: 0.85 }}
        >
          <CaretDownIcon
            className="h-3.5 w-3.5"
            weight={voteType === "downvote" ? "bold" : "regular"}
          />
        </motion.button>
      </motion.div>
    </div>
  );
}

// ── A6 · Hacker News — inline with title, dense information ──────────────────

function DesignHackerNews() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  const net = upvotes - downvotes;
  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card font-mono">
      <div className="flex items-start gap-2 px-3 py-3">
        <div className="flex flex-col items-center gap-0 pt-0.5">
          <motion.button
            className={cn(
              "transition-colors hover:text-primary",
              voteType === "upvote"
                ? "text-primary"
                : "text-muted-foreground/40"
            )}
            onClick={() => vote("upvote")}
            type="button"
            whileTap={{ scale: 1.4 }}
          >
            <TriangleIcon
              className="h-3 w-3"
              weight={voteType === "upvote" ? "fill" : "regular"}
            />
          </motion.button>
          <motion.button
            className={cn(
              "transition-colors hover:text-destructive",
              voteType === "downvote"
                ? "text-destructive"
                : "text-muted-foreground/40"
            )}
            onClick={() => vote("downvote")}
            type="button"
            whileTap={{ scale: 1.4 }}
          >
            <TriangleIcon
              className="h-3 w-3 rotate-180"
              weight={voteType === "downvote" ? "fill" : "regular"}
            />
          </motion.button>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-sm leading-snug">{MOCK.title}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
            <span
              className={cn(
                "rounded bg-muted/60 px-1.5 py-0.5 font-bold tabular-nums",
                net > 0 && "text-primary",
                net < 0 && "text-destructive"
              )}
            >
              {net} pts
            </span>
            <span className="opacity-40">|</span>
            <span>{MOCK.commentCount} comments</span>
            <span className="opacity-40">|</span>
            <span>{MOCK.timeAgo}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── A7 · Minimal Notch — right column, ultra-subtle indicator ────────────────

function DesignMinimalNotch() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );

  let notchColor = "var(--color-border)";
  if (voteType === "upvote") {
    notchColor = "var(--color-primary)";
  } else if (voteType === "downvote") {
    notchColor = "var(--color-destructive)";
  }

  return (
    <MockCard
      voteSlot={
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
            className={cn(
              "relative flex flex-1 flex-col items-center justify-end gap-0.5 pb-1 transition-colors duration-200",
              voteType === "upvote"
                ? "text-primary"
                : "text-muted-foreground/40 hover:text-muted-foreground"
            )}
            onClick={() => vote("upvote")}
            type="button"
          >
            <CaretUpIcon
              className="h-3.5 w-3.5"
              weight={voteType === "upvote" ? "bold" : "regular"}
            />
            <span className="font-medium text-[10px] tabular-nums">
              {upvotes}
            </span>
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
            <CaretDownIcon
              className="h-3.5 w-3.5"
              weight={voteType === "downvote" ? "bold" : "regular"}
            />
          </button>
        </div>
      }
    />
  );
}

// ── A8 · Tug of War — ratio bar spanning full width ──────────────────────────

function DesignTugOfWar() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  const total = upvotes + downvotes;
  const upPercent = total > 0 ? (upvotes / total) * 100 : 50;
  return (
    <FullCard>
      <div className="space-y-3 px-4 pt-4">
        <CardTitle />
        <CardTags />
        <CardMeta />
      </div>
      <div className="mt-3 px-4 pb-4">
        <div className="flex items-center gap-2">
          <motion.button
            className={cn(
              "flex items-center gap-1 transition-colors",
              voteType === "upvote"
                ? "text-primary"
                : "text-muted-foreground hover:text-primary"
            )}
            onClick={() => vote("upvote")}
            type="button"
            whileTap={{ scale: 0.88 }}
          >
            <CaretUpIcon
              className="h-4 w-4 -rotate-90"
              weight={voteType === "upvote" ? "bold" : "regular"}
            />
            <span className="font-bold text-xs tabular-nums">{upvotes}</span>
          </motion.button>
          <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
            <motion.div
              animate={{ width: `${upPercent}%` }}
              className="absolute inset-y-0 left-0 rounded-full bg-primary"
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
            />
            <motion.div
              animate={{ width: `${100 - upPercent}%` }}
              className="absolute inset-y-0 right-0 rounded-full bg-destructive/50"
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
            />
            <motion.div
              animate={{ left: `${upPercent}%` }}
              className="absolute top-1/2 z-10 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-sm"
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            />
          </div>
          <motion.button
            className={cn(
              "flex items-center gap-1 transition-colors",
              voteType === "downvote"
                ? "text-destructive"
                : "text-muted-foreground hover:text-destructive"
            )}
            onClick={() => vote("downvote")}
            type="button"
            whileTap={{ scale: 0.88 }}
          >
            <span className="font-bold text-xs tabular-nums">{downvotes}</span>
            <CaretDownIcon
              className="h-4 w-4 rotate-90"
              weight={voteType === "downvote" ? "bold" : "regular"}
            />
          </motion.button>
        </div>
      </div>
    </FullCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION B — UX MODEL EXPLORATIONS
// Different ways to think about the voting interaction itself.
// ═══════════════════════════════════════════════════════════════════════════════

// ── B1 · Hover Reveal — content-first, votes hidden until hover ──────────────
// UX question: Should votes always be visible, or only when relevant?

function DesignHoverReveal() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  const net = upvotes - downvotes;
  const hasVoted = voteType !== null;
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-card transition-all hover:border-border hover:shadow-sm">
      <div className="space-y-3 px-4 py-4">
        <CardTitle />
        <CardTags />
        <div className="flex items-center gap-3">
          <CardMeta />
          {/* Static score — always visible as context */}
          <span
            className={cn(
              "ml-auto font-semibold text-xs tabular-nums",
              hasVoted && voteType === "upvote" && "text-primary",
              hasVoted && voteType === "downvote" && "text-destructive",
              !hasVoted && "text-muted-foreground"
            )}
          >
            {net > 0 ? `+${net}` : net}
          </span>
        </div>
      </div>
      {/* Vote controls — slide in from right on hover */}
      <motion.div
        className="absolute top-0 right-0 bottom-0 flex items-center gap-0 border-border/30 border-l bg-card/95 px-1 backdrop-blur-sm"
        initial={false}
        style={{
          x: hasVoted ? 0 : "100%",
        }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <div className="flex translate-x-full flex-col items-center gap-0 transition-transform duration-200 group-hover:translate-x-0">
          <motion.button
            className={cn(
              "rounded-md p-2 transition-colors",
              voteType === "upvote"
                ? "text-primary"
                : "text-muted-foreground/40 hover:text-primary"
            )}
            onClick={() => vote("upvote")}
            type="button"
            whileTap={{ scale: 0.8 }}
          >
            <ArrowUpIcon
              className="h-4 w-4"
              weight={voteType === "upvote" ? "bold" : "regular"}
            />
          </motion.button>
          <motion.button
            className={cn(
              "rounded-md p-2 transition-colors",
              voteType === "downvote"
                ? "text-destructive"
                : "text-muted-foreground/40 hover:text-destructive"
            )}
            onClick={() => vote("downvote")}
            type="button"
            whileTap={{ scale: 0.8 }}
          >
            <ArrowDownIcon
              className="h-4 w-4"
              weight={voteType === "downvote" ? "bold" : "regular"}
            />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ── B2 · Compact Row — dense list item, not a card ───────────────────────────
// UX question: Can voting work in an information-dense list layout?

function DesignCompactRow() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  const net = upvotes - downvotes;
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border/30 bg-card px-3 py-2.5 transition-all hover:border-border hover:shadow-sm">
      {/* Compact vote */}
      <div className="flex items-center gap-0">
        <motion.button
          className={cn(
            "rounded p-0.5 transition-colors",
            voteType === "upvote"
              ? "text-primary"
              : "text-muted-foreground/30 hover:text-primary"
          )}
          onClick={() => vote("upvote")}
          type="button"
          whileTap={{ scale: 0.8 }}
        >
          <TriangleIcon
            className="h-2.5 w-2.5"
            weight={voteType === "upvote" ? "fill" : "regular"}
          />
        </motion.button>
        <span
          className={cn(
            "min-w-6 text-center font-semibold text-xs tabular-nums",
            voteType === "upvote" && "text-primary",
            voteType === "downvote" && "text-destructive",
            !voteType && "text-foreground"
          )}
        >
          {net}
        </span>
        <motion.button
          className={cn(
            "rounded p-0.5 transition-colors",
            voteType === "downvote"
              ? "text-destructive"
              : "text-muted-foreground/30 hover:text-destructive"
          )}
          onClick={() => vote("downvote")}
          type="button"
          whileTap={{ scale: 0.8 }}
        >
          <TriangleIcon
            className="h-2.5 w-2.5 rotate-180"
            weight={voteType === "downvote" ? "fill" : "regular"}
          />
        </motion.button>
      </div>
      {/* Content — single line */}
      <h3 className="min-w-0 flex-1 truncate font-medium text-sm">
        {MOCK.title}
      </h3>
      <div className="flex shrink-0 items-center gap-2">
        <Badge className="font-normal text-[10px]" color={MOCK.status.color}>
          {MOCK.status.name}
        </Badge>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <ChatIcon className="h-3 w-3" />
          {MOCK.commentCount}
        </span>
        <span className="text-[10px] text-muted-foreground/60">
          {MOCK.timeAgo}
        </span>
      </div>
    </div>
  );
}

// ── B3 · Action Bar — vote alongside other actions (comment, share) ──────────
// UX question: Should voting be isolated or part of a broader action set?

function DesignActionBar() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  const [bookmarked, setBookmarked] = useState(false);
  return (
    <FullCard>
      <div className="space-y-3 px-4 pt-4">
        <CardTitle />
        <CardTags />
      </div>
      {/* Full action bar */}
      <div className="mt-3 flex items-center border-border/30 border-t">
        {/* Upvote */}
        <motion.button
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs transition-colors",
            voteType === "upvote"
              ? "text-primary"
              : "text-muted-foreground hover:text-primary"
          )}
          onClick={() => vote("upvote")}
          type="button"
          whileTap={{ scale: 0.95 }}
        >
          <ArrowUpIcon
            className="h-4 w-4"
            weight={voteType === "upvote" ? "bold" : "regular"}
          />
          <AnimatedCount className="font-semibold" value={upvotes} />
        </motion.button>
        <div className="h-4 w-px bg-border/30" />
        {/* Downvote */}
        <motion.button
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs transition-colors",
            voteType === "downvote"
              ? "text-destructive"
              : "text-muted-foreground hover:text-destructive"
          )}
          onClick={() => vote("downvote")}
          type="button"
          whileTap={{ scale: 0.95 }}
        >
          <ArrowDownIcon
            className="h-4 w-4"
            weight={voteType === "downvote" ? "bold" : "regular"}
          />
          <AnimatedCount
            className="font-semibold"
            direction="vertical-reverse"
            value={downvotes}
          />
        </motion.button>
        <div className="h-4 w-px bg-border/30" />
        {/* Comment */}
        <button
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
          type="button"
        >
          <ChatIcon className="h-4 w-4" />
          <span className="font-semibold">{MOCK.commentCount}</span>
        </button>
        <div className="h-4 w-px bg-border/30" />
        {/* Bookmark */}
        <button
          className={cn(
            "flex flex-1 items-center justify-center py-2.5 text-xs transition-colors",
            bookmarked
              ? "text-amber-500"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setBookmarked((b) => !b)}
          type="button"
        >
          <BookmarkSimpleIcon
            className="h-4 w-4"
            weight={bookmarked ? "fill" : "regular"}
          />
        </button>
        <div className="h-4 w-px bg-border/30" />
        {/* Share */}
        <button
          className="flex flex-1 items-center justify-center py-2.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
          type="button"
        >
          <ShareNetworkIcon className="h-4 w-4" />
        </button>
      </div>
    </FullCard>
  );
}

// ── B4 · Social Proof — "24 people agree", not just numbers ──────────────────
// UX question: Should votes feel personal/social, or anonymous/numeric?

function DesignSocialProof() {
  const { voteType, upvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  const displayCount = Math.min(upvotes, 5);
  return (
    <FullCard>
      <div className="space-y-3 px-4 pt-4">
        <CardTitle />
        <CardTags />
      </div>
      <div className="mt-3 flex items-center gap-3 border-border/30 border-t px-4 py-3">
        {/* Avatar stack */}
        <div className="flex -space-x-2">
          {MOCK_VOTERS.slice(0, displayCount).map((initials, i) => (
            <motion.div
              animate={{ scale: 1, opacity: 1 }}
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted font-bold text-[8px] text-muted-foreground"
              initial={{ scale: 0.5, opacity: 0 }}
              key={initials}
              transition={{ delay: i * 0.05 }}
            >
              {initials}
            </motion.div>
          ))}
          {voteType === "upvote" && (
            <motion.div
              animate={{ scale: 1, opacity: 1 }}
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 font-bold text-[8px] text-primary"
              initial={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <UserIcon className="h-3 w-3" weight="fill" />
            </motion.div>
          )}
        </div>
        {/* Social text */}
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs">
            <span className="font-semibold text-foreground tabular-nums">
              {upvotes} people
            </span>{" "}
            want this
          </p>
        </div>
        {/* Vote button */}
        <motion.button
          className={cn(
            "rounded-full border px-3 py-1.5 font-medium text-xs transition-all",
            voteType === "upvote"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:border-primary hover:text-primary"
          )}
          onClick={() => vote("upvote")}
          type="button"
          whileTap={{ scale: 0.92 }}
        >
          {voteType === "upvote" ? "Agreed" : "Agree"}
        </motion.button>
      </div>
    </FullCard>
  );
}

// ── B5 · Drawer Expand — progressive disclosure, details on demand ───────────
// UX question: Can vote details be hidden behind a click?

function DesignDrawerExpand() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  const [expanded, setExpanded] = useState(false);
  const net = upvotes - downvotes;
  const total = upvotes + downvotes;
  const upPercent = total > 0 ? Math.round((upvotes / total) * 100) : 50;

  return (
    <FullCard>
      <div className="space-y-3 px-4 pt-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle />
          {/* Compact badge — click to expand */}
          <motion.button
            className={cn(
              "shrink-0 rounded-full border px-2 py-1 font-semibold text-[11px] tabular-nums transition-colors",
              (() => {
                if (voteType === "upvote") {
                  return "border-primary/30 bg-primary/8 text-primary";
                }
                if (voteType === "downvote") {
                  return "border-destructive/30 bg-destructive/8 text-destructive";
                }
                return "border-border text-foreground hover:bg-muted";
              })()
            )}
            onClick={() => setExpanded((e) => !e)}
            type="button"
            whileTap={{ scale: 0.9 }}
          >
            +{net}
          </motion.button>
        </div>
        <CardTags />
        <CardMeta />
      </div>
      {/* Expanding vote drawer */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden border-border/30 border-t"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <motion.button
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors",
                  voteType === "upvote"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={() => vote("upvote")}
                type="button"
                whileTap={{ scale: 0.9 }}
              >
                <ArrowUpIcon
                  className="h-3.5 w-3.5"
                  weight={voteType === "upvote" ? "bold" : "regular"}
                />
                <AnimatedCount className="font-semibold" value={upvotes} />
              </motion.button>
              {/* Mini ratio bar */}
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.div
                  animate={{ width: `${upPercent}%` }}
                  className="absolute inset-y-0 left-0 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                />
              </div>
              <motion.button
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors",
                  voteType === "downvote"
                    ? "bg-destructive/10 text-destructive"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                onClick={() => vote("downvote")}
                type="button"
                whileTap={{ scale: 0.9 }}
              >
                <AnimatedCount
                  className="font-semibold"
                  direction="vertical-reverse"
                  value={downvotes}
                />
                <ArrowDownIcon
                  className="h-3.5 w-3.5"
                  weight={voteType === "downvote" ? "bold" : "regular"}
                />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </FullCard>
  );
}

// ── B6 · Single Upvote — no downvote exists, simplified model ────────────────
// UX question: Do we even need downvotes?

function DesignSingleUpvote() {
  const { voteType, upvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  return (
    <div className="group flex gap-3">
      {/* Big upvote badge */}
      <motion.button
        animate={{
          borderColor:
            voteType === "upvote"
              ? "var(--color-primary)"
              : "var(--color-border)",
        }}
        className={cn(
          "flex w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 transition-all",
          voteType === "upvote"
            ? "bg-primary/6 text-primary"
            : "bg-card text-muted-foreground hover:border-primary/30 hover:text-primary"
        )}
        onClick={() => vote("upvote")}
        type="button"
        whileTap={{ scale: 0.92 }}
      >
        <motion.div
          animate={{ y: voteType === "upvote" ? -2 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          <CaretUpIcon
            className="h-6 w-6"
            weight={voteType === "upvote" ? "bold" : "regular"}
          />
        </motion.div>
        <AnimatedCount className="font-bold text-base" value={upvotes} />
      </motion.button>
      <div className="flex-1 rounded-xl border border-border/50 bg-card px-4 py-4 transition-all hover:border-border hover:shadow-sm">
        <div className="space-y-3">
          <CardTitle />
          <CardTags />
          <CardMeta />
        </div>
      </div>
    </div>
  );
}

// ── B7 · Magnetic Tilt — 3D perspective feedback ─────────────────────────────
// UX question: Can spatial feedback replace traditional button states?

function DesignMagneticTilt() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  const net = upvotes - downvotes;

  let rotateY = 0;
  let rotateX = 0;
  if (voteType === "upvote") {
    rotateY = -2.5;
    rotateX = -1.5;
  } else if (voteType === "downvote") {
    rotateY = 2.5;
    rotateX = 1.5;
  }

  return (
    <div style={{ perspective: 600 }}>
      <motion.div
        animate={{ rotateX, rotateY }}
        className="relative overflow-hidden rounded-xl border border-border/50 bg-card transition-shadow hover:shadow-md"
        style={{ transformStyle: "preserve-3d" }}
        transition={{ type: "spring", stiffness: 150, damping: 20 }}
      >
        {voteType && (
          <motion.div
            animate={{ opacity: 0.1 }}
            className="absolute inset-0 z-0"
            initial={{ opacity: 0 }}
            style={{
              background:
                voteType === "upvote"
                  ? "radial-gradient(ellipse at 20% 20%, var(--color-primary), transparent 70%)"
                  : "radial-gradient(ellipse at 80% 80%, var(--color-destructive), transparent 70%)",
            }}
            transition={{ duration: 0.4 }}
          />
        )}
        <div className="relative z-10 space-y-3 px-4 pt-4">
          <CardTitle />
          <CardTags />
        </div>
        <div className="relative z-10 mt-3 flex items-center justify-between px-4 pb-4">
          <motion.button
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors",
              voteType === "upvote"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-primary"
            )}
            onClick={() => vote("upvote")}
            type="button"
            whileTap={{ scale: 0.9 }}
          >
            <ArrowUpIcon
              className="h-4 w-4"
              weight={voteType === "upvote" ? "bold" : "regular"}
            />
            <AnimatedCount className="font-semibold" value={upvotes} />
          </motion.button>
          <AnimatePresence mode="popLayout">
            <motion.span
              animate={{ y: 0, opacity: 1 }}
              className={cn(
                "font-bold text-lg tabular-nums",
                voteType === "upvote" && "text-primary",
                voteType === "downvote" && "text-destructive",
                !voteType && "text-muted-foreground"
              )}
              exit={{ y: -12, opacity: 0 }}
              initial={{ y: 12, opacity: 0 }}
              key={net}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              {net > 0 ? `+${net}` : net}
            </motion.span>
          </AnimatePresence>
          <motion.button
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors",
              voteType === "downvote"
                ? "bg-destructive/10 text-destructive"
                : "text-muted-foreground hover:text-destructive"
            )}
            onClick={() => vote("downvote")}
            type="button"
            whileTap={{ scale: 0.9 }}
          >
            <AnimatedCount
              className="font-semibold"
              direction="vertical-reverse"
              value={downvotes}
            />
            <ArrowDownIcon
              className="h-4 w-4"
              weight={voteType === "downvote" ? "bold" : "regular"}
            />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ── B8 · Ink Blot — organic feedback, vote spreads across card ───────────────
// UX question: Can feedback feel organic rather than mechanical?

function DesignInkBlot() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  const [blotKey, setBlotKey] = useState(0);
  const [blotOrigin, setBlotOrigin] = useState<"left" | "right">("left");

  const handleVote = (type: "upvote" | "downvote") => {
    setBlotOrigin(type === "upvote" ? "left" : "right");
    setBlotKey((k) => k + 1);
    vote(type);
  };

  let blotColor = "transparent";
  if (voteType === "upvote") {
    blotColor = "var(--color-primary)";
  } else if (voteType === "downvote") {
    blotColor = "var(--color-destructive)";
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card">
      <AnimatePresence mode="sync">
        {voteType && (
          <motion.div
            animate={{ scale: 4, opacity: 0.06 }}
            className="absolute z-0 h-32 w-32 rounded-full"
            exit={{ opacity: 0 }}
            initial={{ scale: 0, opacity: 0.15 }}
            key={blotKey}
            style={{
              backgroundColor: blotColor,
              left: blotOrigin === "left" ? "10%" : "auto",
              right: blotOrigin === "right" ? "10%" : "auto",
              top: "60%",
            }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </AnimatePresence>
      <div className="relative z-10 space-y-3 px-4 pt-4">
        <CardTitle />
        <CardTags />
      </div>
      <div className="relative z-10 mt-3 flex items-center gap-3 px-4 pb-4">
        <motion.button
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all",
            voteType === "upvote"
              ? "border-primary/30 bg-primary/8 text-primary"
              : "border-border/40 text-muted-foreground hover:border-primary/30 hover:text-primary"
          )}
          onClick={() => handleVote("upvote")}
          type="button"
          whileTap={{ scale: 0.88 }}
        >
          <ArrowUpIcon
            className="h-3.5 w-3.5"
            weight={voteType === "upvote" ? "bold" : "regular"}
          />
          <AnimatedCount className="font-semibold" value={upvotes} />
        </motion.button>
        <CardMeta />
        <motion.button
          className={cn(
            "ml-auto flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all",
            voteType === "downvote"
              ? "border-destructive/30 bg-destructive/8 text-destructive"
              : "border-border/40 text-muted-foreground hover:border-destructive/30 hover:text-destructive"
          )}
          onClick={() => handleVote("downvote")}
          type="button"
          whileTap={{ scale: 0.88 }}
        >
          <AnimatedCount
            className="font-semibold"
            direction="vertical-reverse"
            value={downvotes}
          />
          <ArrowDownIcon
            className="h-3.5 w-3.5"
            weight={voteType === "downvote" ? "bold" : "regular"}
          />
        </motion.button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION C — REFINED HYBRIDS
// New designs combining the best elements from favorites.
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_LIST: readonly MockFeedback[] = [
  MOCK,
  {
    title: "Dark mode support for the dashboard",
    status: { name: "In Progress", color: "amber" },
    tags: [{ id: "3", name: "Design", color: "pink" }],
    commentCount: 12,
    timeAgo: "1 day ago",
    upvotes: 41,
    downvotes: 2,
  },
  {
    title: "Export feedback data as CSV",
    status: { name: "Under Review", color: "purple" },
    tags: [{ id: "4", name: "Data", color: "blue" }],
    commentCount: 3,
    timeAgo: "5 days ago",
    upvotes: 8,
    downvotes: 1,
  },
];

// ── C1 · Editorial Feed — serif titles, margin votes, stacked list ───────────
// Combines: Magazine Editorial serif + Pill Cluster `24↑ 4↓` + list context

function DesignEditorialFeed() {
  return (
    <div className="space-y-0 divide-y divide-border/20">
      {MOCK_LIST.map((item) => (
        <EditorialFeedItem item={item} key={item.title} />
      ))}
    </div>
  );
}

function EditorialFeedItem({ item }: { item: MockFeedback }) {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    item.upvotes,
    item.downvotes
  );

  return (
    <div className="relative py-4 pl-16">
      {/* Margin vote annotation */}
      <div className="absolute top-4 left-0 flex w-12 flex-col items-center gap-0.5">
        <motion.button
          className={cn(
            "transition-colors",
            voteType === "upvote"
              ? "text-primary"
              : "text-muted-foreground/30 hover:text-primary"
          )}
          onClick={() => vote("upvote")}
          type="button"
          whileTap={{ scale: 0.8 }}
        >
          <ArrowUpIcon
            className="h-3 w-3"
            weight={voteType === "upvote" ? "bold" : "regular"}
          />
        </motion.button>
        <span className="text-[9px] text-muted-foreground/40 tabular-nums">
          {upvotes}↑ {downvotes}↓
        </span>
        <motion.button
          className={cn(
            "transition-colors",
            voteType === "downvote"
              ? "text-destructive"
              : "text-muted-foreground/30 hover:text-destructive"
          )}
          onClick={() => vote("downvote")}
          type="button"
          whileTap={{ scale: 0.8 }}
        >
          <ArrowDownIcon
            className="h-3 w-3"
            weight={voteType === "downvote" ? "bold" : "regular"}
          />
        </motion.button>
      </div>

      {/* Thin vertical rule */}
      <div className="absolute top-0 bottom-0 left-14 w-px bg-border/20" />

      {/* Content */}
      <h3 className="font-display text-base leading-snug tracking-tight">
        {item.title}
      </h3>
      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground/60">
        <Badge className="font-normal text-[10px]" color={item.status.color}>
          {item.status.name}
        </Badge>
        {item.tags.map((tag) => (
          <span className="italic" key={tag.id}>
            #{tag.name}
          </span>
        ))}
        <span>·</span>
        <span>{item.commentCount} comments</span>
        <span className="italic">{item.timeAgo}</span>
      </div>
    </div>
  );
}

// ── C2 · Metric Action Bar — hero number + condensed content + sweep action bar
// Combines: Dashboard Metric hero + Action Bar footer + Bottom Bar sweep effect

function DesignMetricActionBar() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  const [bookmarked, setBookmarked] = useState(false);
  const net = upvotes - downvotes;
  const total = upvotes + downvotes;
  const upPercent = total > 0 ? Math.round((upvotes / total) * 100) : 50;

  let metricColor = "text-foreground";
  if (voteType === "upvote") {
    metricColor = "text-primary";
  } else if (voteType === "downvote") {
    metricColor = "text-destructive";
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
      {/* Hero metric */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <AnimatedCount
              className={cn("font-display text-3xl tabular-nums", metricColor)}
              value={net}
            />
            <span className="ml-2 text-muted-foreground/40 text-xs tabular-nums">
              {upPercent}% positive
            </span>
          </div>
        </div>
        {/* Condensed content — like Dashboard Metric */}
        <h3 className="mt-2 font-medium text-sm leading-snug">{MOCK.title}</h3>
        <div className="mt-1.5 flex items-center gap-2">
          <Badge className="font-normal text-[10px]" color={MOCK.status.color}>
            {MOCK.status.name}
          </Badge>
          {MOCK.tags.map((tag) => (
            <Badge
              className="font-normal text-[10px]"
              color={tag.color}
              key={tag.id}
            >
              {tag.name}
            </Badge>
          ))}
          <span className="ml-auto text-[10px] text-muted-foreground/50">
            {MOCK.commentCount} comments · {MOCK.timeAgo}
          </span>
        </div>
      </div>

      {/* Action bar with sweep effect — like Bottom Bar + Action Bar */}
      <div className="relative overflow-hidden border-border/30 border-t">
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
        <div className="relative flex items-center">
          <motion.button
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs transition-colors",
              voteType === "upvote"
                ? "text-primary"
                : "text-muted-foreground hover:text-primary"
            )}
            onClick={() => vote("upvote")}
            type="button"
            whileTap={{ scale: 0.95 }}
          >
            <ArrowUpIcon
              className="h-4 w-4"
              weight={voteType === "upvote" ? "bold" : "regular"}
            />
            <AnimatedCount className="font-semibold" value={upvotes} />
          </motion.button>
          <div className="h-4 w-px bg-border/30" />
          <motion.button
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs transition-colors",
              voteType === "downvote"
                ? "text-destructive"
                : "text-muted-foreground hover:text-destructive"
            )}
            onClick={() => vote("downvote")}
            type="button"
            whileTap={{ scale: 0.95 }}
          >
            <ArrowDownIcon
              className="h-4 w-4"
              weight={voteType === "downvote" ? "bold" : "regular"}
            />
            <AnimatedCount
              className="font-semibold"
              direction="vertical-reverse"
              value={downvotes}
            />
          </motion.button>
          <div className="h-4 w-px bg-border/30" />
          <button
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
            type="button"
          >
            <ChatIcon className="h-4 w-4" />
            <span className="font-semibold">{MOCK.commentCount}</span>
          </button>
          <div className="h-4 w-px bg-border/30" />
          <button
            className={cn(
              "flex flex-1 items-center justify-center py-2.5 text-xs transition-colors",
              bookmarked
                ? "text-amber-500"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setBookmarked((b) => !b)}
            type="button"
          >
            <BookmarkSimpleIcon
              className="h-4 w-4"
              weight={bookmarked ? "fill" : "regular"}
            />
          </button>
          <div className="h-4 w-px bg-border/30" />
          <button
            className="flex flex-1 items-center justify-center py-2.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
            type="button"
          >
            <ShareNetworkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── C3 · Corner Percentage — corner badge with % positive ────────────────────
// Combines: Corner Badge creative placement + Split Panel percentage

function DesignCornerPercentage() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  const total = upvotes + downvotes;
  const upPercent = total > 0 ? Math.round((upvotes / total) * 100) : 50;

  let percentColor = "text-foreground";
  let percentBg = "bg-card";
  if (voteType === "upvote") {
    percentColor = "text-primary";
    percentBg = "bg-primary/6";
  } else if (voteType === "downvote") {
    percentColor = "text-destructive";
    percentBg = "bg-destructive/6";
  }

  return (
    <div className="relative">
      <FullCard>
        <div className="space-y-3 px-4 py-4 pr-24">
          <CardTitle />
          <CardTags />
          <CardMeta />
        </div>
      </FullCard>
      {/* Corner percentage badge */}
      <motion.div
        className={cn(
          "absolute top-0 right-0 flex flex-col items-center gap-0.5 overflow-hidden rounded-bl-2xl border-border/30 border-b border-l px-3 py-2 shadow-sm transition-colors duration-300",
          percentBg
        )}
      >
        <motion.button
          className={cn(
            "transition-colors",
            voteType === "upvote"
              ? "text-primary"
              : "text-muted-foreground/40 hover:text-primary"
          )}
          onClick={() => vote("upvote")}
          type="button"
          whileTap={{ scale: 0.85 }}
        >
          <CaretUpIcon
            className="h-4 w-4"
            weight={voteType === "upvote" ? "bold" : "regular"}
          />
        </motion.button>
        <span className={cn("font-bold text-sm tabular-nums", percentColor)}>
          {upPercent}%
        </span>
        <span className="text-[8px] text-muted-foreground/40">positive</span>
        <motion.button
          className={cn(
            "transition-colors",
            voteType === "downvote"
              ? "text-destructive"
              : "text-muted-foreground/40 hover:text-destructive"
          )}
          onClick={() => vote("downvote")}
          type="button"
          whileTap={{ scale: 0.85 }}
        >
          <CaretDownIcon
            className="h-4 w-4"
            weight={voteType === "downvote" ? "bold" : "regular"}
          />
        </motion.button>
      </motion.div>
    </div>
  );
}

// ── C4 · Notch Percentage — minimal out-of-card vote with % ──────────────────
// Combines: Minimal Notch out-of-card + Split Panel percentage + glowing notch

function DesignNotchPercentage() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  const total = upvotes + downvotes;
  const upPercent = total > 0 ? Math.round((upvotes / total) * 100) : 50;

  let notchColor = "var(--color-border)";
  if (voteType === "upvote") {
    notchColor = "var(--color-primary)";
  } else if (voteType === "downvote") {
    notchColor = "var(--color-destructive)";
  }

  return (
    <MockCard
      voteSlot={
        <div className="relative flex flex-col items-center justify-center gap-1 self-stretch">
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
            className={cn(
              "relative flex flex-col items-center gap-0.5 transition-colors duration-200",
              voteType === "upvote"
                ? "text-primary"
                : "text-muted-foreground/40 hover:text-muted-foreground"
            )}
            onClick={() => vote("upvote")}
            type="button"
          >
            <CaretUpIcon
              className="h-3.5 w-3.5"
              weight={voteType === "upvote" ? "bold" : "regular"}
            />
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
          <span
            className={cn(
              "font-bold text-[10px] tabular-nums",
              voteType === "upvote" && "text-primary",
              voteType === "downvote" && "text-destructive",
              !voteType && "text-muted-foreground/60"
            )}
          >
            {upPercent}%
          </span>
          <button
            className={cn(
              "relative flex flex-col items-center gap-0.5 transition-colors duration-200",
              voteType === "downvote"
                ? "text-destructive"
                : "text-muted-foreground/40 hover:text-muted-foreground"
            )}
            onClick={() => vote("downvote")}
            type="button"
          >
            <CaretDownIcon
              className="h-3.5 w-3.5"
              weight={voteType === "downvote" ? "bold" : "regular"}
            />
          </button>
        </div>
      }
    />
  );
}

// ── C5 · Sweep Split — split panel with sweep animation + percentage ─────────
// Combines: Split Panel dedicated vote area + Bottom Bar sweep + percentage

function DesignSweepSplit() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  const net = upvotes - downvotes;
  const total = upvotes + downvotes;
  const upPercent = total > 0 ? Math.round((upvotes / total) * 100) : 50;

  let panelBg = "bg-muted/10";
  if (voteType === "upvote") {
    panelBg = "bg-primary/4";
  } else if (voteType === "downvote") {
    panelBg = "bg-destructive/4";
  }

  return (
    <div className="flex overflow-hidden rounded-2xl border border-border/30">
      {/* Left: content */}
      <div className="flex-1 space-y-3 px-4 py-4">
        <CardTitle />
        <CardTags />
        <CardMeta />
      </div>

      {/* Right: dedicated vote panel with sweep */}
      <div
        className={cn(
          "relative flex w-28 flex-col items-center justify-center gap-1.5 overflow-hidden border-border/20 border-l transition-colors duration-300",
          panelBg
        )}
      >
        <AnimatePresence>
          {voteType && (
            <motion.div
              animate={{ y: "100%", opacity: 0 }}
              className={cn(
                "absolute inset-0",
                voteType === "upvote"
                  ? "bg-gradient-to-b from-transparent via-primary/12 to-transparent"
                  : "bg-gradient-to-b from-transparent via-destructive/12 to-transparent"
              )}
              exit={{ opacity: 0 }}
              initial={{ y: "-100%", opacity: 1 }}
              key={voteType}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>
        <motion.button
          className={cn(
            "relative z-10 rounded-full p-1.5 transition-colors",
            voteType === "upvote"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground/40 hover:text-primary"
          )}
          onClick={() => vote("upvote")}
          type="button"
          whileTap={{ scale: 0.85 }}
        >
          <ArrowUpIcon
            className="h-5 w-5"
            weight={voteType === "upvote" ? "bold" : "regular"}
          />
        </motion.button>

        <AnimatedCount
          className={cn(
            "relative z-10 font-bold text-2xl tabular-nums",
            voteType === "upvote" && "text-primary",
            voteType === "downvote" && "text-destructive",
            !voteType && "text-foreground"
          )}
          value={net}
        />

        <motion.button
          className={cn(
            "relative z-10 rounded-full p-1.5 transition-colors",
            voteType === "downvote"
              ? "bg-destructive/15 text-destructive"
              : "text-muted-foreground/40 hover:text-destructive"
          )}
          onClick={() => vote("downvote")}
          type="button"
          whileTap={{ scale: 0.85 }}
        >
          <ArrowDownIcon
            className="h-5 w-5"
            weight={voteType === "downvote" ? "bold" : "regular"}
          />
        </motion.button>

        {/* Percentage + bar */}
        <div className="relative z-10 mt-1 flex flex-col items-center gap-1">
          <div className="h-1 w-12 overflow-hidden rounded-full bg-border/30">
            <motion.div
              animate={{ width: `${upPercent}%` }}
              className="h-full rounded-full bg-primary/50"
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground/40 tabular-nums">
            {upPercent}% positive
          </span>
        </div>
      </div>
    </div>
  );
}

// ── C6 · Condensed Pill Row — pill cluster + condensed dashboard info ─────────
// Combines: Pill Cluster `24↑ 4↓` + Dashboard Metric condensed info line

function DesignCondensedPillRow() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  const total = upvotes + downvotes;
  const upPercent = total > 0 ? Math.round((upvotes / total) * 100) : 50;

  return (
    <div className="space-y-2">
      {/* Title */}
      <h3 className="font-medium text-sm leading-snug">{MOCK.title}</h3>

      {/* Condensed info line — Dashboard Metric style */}
      <div className="flex items-center gap-2">
        <Badge className="font-normal text-[10px]" color={MOCK.status.color}>
          {MOCK.status.name}
        </Badge>
        {MOCK.tags.map((tag) => (
          <Badge
            className="font-normal text-[10px]"
            color={tag.color}
            key={tag.id}
          >
            {tag.name}
          </Badge>
        ))}
        <span className="text-[10px] text-muted-foreground/50">
          {MOCK.commentCount} comments · {MOCK.timeAgo}
        </span>
      </div>

      {/* Pill cluster footer */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Vote pill */}
        <div className="flex items-center gap-0 rounded-full border border-border/40 bg-card">
          <motion.button
            className={cn(
              "rounded-l-full px-2 py-1 transition-colors",
              voteType === "upvote"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground/40 hover:text-primary"
            )}
            onClick={() => vote("upvote")}
            type="button"
            whileTap={{ scale: 0.9 }}
          >
            <ArrowUpIcon
              className="h-3 w-3"
              weight={voteType === "upvote" ? "bold" : "regular"}
            />
          </motion.button>
          <span className="px-1 text-[9px] text-muted-foreground/40 tabular-nums">
            {upvotes}↑ {downvotes}↓
          </span>
          <motion.button
            className={cn(
              "rounded-r-full px-2 py-1 transition-colors",
              voteType === "downvote"
                ? "bg-destructive/10 text-destructive"
                : "text-muted-foreground/40 hover:text-destructive"
            )}
            onClick={() => vote("downvote")}
            type="button"
            whileTap={{ scale: 0.9 }}
          >
            <ArrowDownIcon
              className="h-3 w-3"
              weight={voteType === "downvote" ? "bold" : "regular"}
            />
          </motion.button>
        </div>

        {/* Percentage pill */}
        <span
          className={cn(
            "rounded-full border border-border/20 px-2.5 py-1 text-[9px] tabular-nums",
            voteType === "upvote"
              ? "border-primary/20 text-primary"
              : "text-muted-foreground/40"
          )}
        >
          {upPercent}% positive
        </span>
      </div>
    </div>
  );
}

// ── C7 · Editorial Notch — serif title + out-of-card notch vote ──────────────
// Combines: Magazine Editorial serif + Minimal Notch out-of-card + pill breakdown

function DesignEditorialNotch() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );

  let notchColor = "var(--color-border)";
  if (voteType === "upvote") {
    notchColor = "var(--color-primary)";
  } else if (voteType === "downvote") {
    notchColor = "var(--color-destructive)";
  }

  return (
    <div className="group flex gap-3">
      {/* Editorial content — no card */}
      <div className="min-w-0 flex-1 space-y-2 py-1">
        <h3 className="font-display text-lg leading-snug tracking-tight">
          {MOCK.title}
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
          <Badge className="font-normal text-[10px]" color={MOCK.status.color}>
            {MOCK.status.name}
          </Badge>
          {MOCK.tags.map((tag) => (
            <span className="italic" key={tag.id}>
              #{tag.name}
            </span>
          ))}
          <span>·</span>
          <span>{MOCK.commentCount} comments</span>
          <span className="italic">{MOCK.timeAgo}</span>
        </div>
        <span className="text-[9px] text-muted-foreground/30 tabular-nums">
          {upvotes}↑ {downvotes}↓
        </span>
      </div>

      {/* Out-of-card notch vote */}
      <div className="relative flex flex-col items-center justify-center gap-1 self-stretch">
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
          className={cn(
            "relative transition-colors duration-200",
            voteType === "upvote"
              ? "text-primary"
              : "text-muted-foreground/40 hover:text-muted-foreground"
          )}
          onClick={() => vote("upvote")}
          type="button"
        >
          <CaretUpIcon
            className="h-3.5 w-3.5"
            weight={voteType === "upvote" ? "bold" : "regular"}
          />
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
          className={cn(
            "relative transition-colors duration-200",
            voteType === "downvote"
              ? "text-destructive"
              : "text-muted-foreground/40 hover:text-muted-foreground"
          )}
          onClick={() => vote("downvote")}
          type="button"
        >
          <CaretDownIcon
            className="h-3.5 w-3.5"
            weight={voteType === "downvote" ? "bold" : "regular"}
          />
        </button>
      </div>
    </div>
  );
}

// ── C8 · Sweep Corner — corner badge with sweep animation + pill details ─────
// Combines: Corner Badge placement + Bottom Bar sweep + Pill Cluster breakdown

function DesignSweepCorner() {
  const { voteType, upvotes, downvotes, vote } = useVoteState(
    MOCK.upvotes,
    MOCK.downvotes
  );
  const total = upvotes + downvotes;
  const upPercent = total > 0 ? Math.round((upvotes / total) * 100) : 50;
  const net = upvotes - downvotes;

  return (
    <div className="relative">
      <div className="rounded-xl border border-border/50 bg-card transition-all hover:border-border hover:shadow-sm">
        <div className="space-y-3 px-4 pt-4 pr-20">
          <CardTitle />
          <CardTags />
        </div>
        {/* Bottom pill details with sweep */}
        <div className="relative mt-3 overflow-hidden border-border/30 border-t">
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
            <CardMeta />
            <span className="text-[9px] text-muted-foreground/30 tabular-nums">
              {upvotes}↑ {downvotes}↓
            </span>
            <span className="text-[9px] text-muted-foreground/30 tabular-nums">
              {upPercent}%
            </span>
          </div>
        </div>
      </div>
      {/* Corner badge */}
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
          className={cn(
            "relative px-2.5 py-2 text-xs transition-colors",
            voteType === "upvote"
              ? "text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          onClick={() => vote("upvote")}
          type="button"
          whileTap={{ scale: 0.85 }}
        >
          <CaretUpIcon
            className="h-3.5 w-3.5"
            weight={voteType === "upvote" ? "bold" : "regular"}
          />
        </motion.button>
        <AnimatePresence mode="popLayout">
          <motion.span
            animate={{ y: 0, opacity: 1 }}
            className={cn(
              "px-2 py-1.5 font-bold text-xs tabular-nums",
              voteType === "upvote" && "text-primary",
              voteType === "downvote" && "text-destructive",
              !voteType && "text-foreground"
            )}
            exit={{ y: -6, opacity: 0 }}
            initial={{ y: 6, opacity: 0 }}
            key={net}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            {net}
          </motion.span>
        </AnimatePresence>
        <motion.button
          animate={{
            backgroundColor:
              voteType === "downvote"
                ? "var(--color-destructive)"
                : "transparent",
          }}
          className={cn(
            "relative px-2.5 py-2 text-xs transition-colors",
            voteType === "downvote"
              ? "text-destructive-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          onClick={() => vote("downvote")}
          type="button"
          whileTap={{ scale: 0.85 }}
        >
          <CaretDownIcon
            className="h-3.5 w-3.5"
            weight={voteType === "downvote" ? "bold" : "regular"}
          />
        </motion.button>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const DESIGNS = [
  // Section A — Layout explorations
  {
    id: "left-column",
    name: "Left Column",
    description:
      "Reddit-inspired. Vote column on the left gives it primary visual weight. Score is the first thing you see.",
    component: DesignLeftColumn,
    traits: ["Classic", "Vote-first"],
    category: "layout",
  },
  {
    id: "bottom-bar",
    name: "Bottom Bar",
    description:
      "Vote inline with metadata. Content stays dominant. Voting feels like a secondary action.",
    component: DesignBottomBar,
    traits: ["Inline", "Content-first"],
    category: "layout",
  },
  {
    id: "floating-strip",
    name: "Floating Strip",
    description:
      "Detached from card edge. Creates visual separation between content and action. Glassmorphic.",
    component: DesignFloatingStrip,
    traits: ["Floating", "Separated"],
    category: "layout",
  },
  {
    id: "edge-gutter",
    name: "Edge Gutter",
    description:
      "Vote lives in the card's border itself. Minimal space cost. Colored strip communicates direction.",
    component: DesignEdgeGutter,
    traits: ["Integrated", "Space-efficient"],
    category: "layout",
  },
  {
    id: "corner-badge",
    name: "Corner Badge",
    description:
      "Tucked into top-right corner. Out of the way until needed. Active state fills the button with color.",
    component: DesignCornerBadge,
    traits: ["Corner", "Discrete"],
    category: "layout",
  },
  {
    id: "hacker-news",
    name: "Hacker News",
    description:
      "Inline with title. Maximum density. Monospace aesthetic signals a technical, data-driven product.",
    component: DesignHackerNews,
    traits: ["Dense", "Technical"],
    category: "layout",
  },
  {
    id: "minimal-notch",
    name: "Minimal Notch",
    description:
      "Right column, but ultra-minimal. A single glowing notch communicates direction without clutter.",
    component: DesignMinimalNotch,
    traits: ["Minimal", "Elegant"],
    category: "layout",
  },
  {
    id: "tug-of-war",
    name: "Tug of War",
    description:
      "Full-width ratio bar. Vote is a visual competition. The marker position tells the story at a glance.",
    component: DesignTugOfWar,
    traits: ["Visual", "Competitive"],
    category: "layout",
  },
  // Section B — UX model explorations
  {
    id: "hover-reveal",
    name: "Hover Reveal",
    description:
      "Content-first. Votes only appear on hover. Reduces visual noise in lists. Score always visible.",
    component: DesignHoverReveal,
    traits: ["Progressive", "Clean"],
    category: "ux",
    question: "Should votes always be visible?",
  },
  {
    id: "compact-row",
    name: "Compact Row",
    description:
      "Dense list item, not a card. One line: vote + title + status + meta. For power users scanning fast.",
    component: DesignCompactRow,
    traits: ["Dense", "Scannable"],
    category: "ux",
    question: "Can voting work in a dense list?",
  },
  {
    id: "action-bar",
    name: "Action Bar",
    description:
      "Vote alongside comment, bookmark, share. Contextualizes voting as one of many interactions.",
    component: DesignActionBar,
    traits: ["Social", "Multi-action"],
    category: "ux",
    question: "Should voting be isolated?",
  },
  {
    id: "social-proof",
    name: "Social Proof",
    description:
      "'24 people want this' with avatars. Makes voting feel human and social, not just numeric.",
    component: DesignSocialProof,
    traits: ["Human", "Social"],
    category: "ux",
    question: "Should votes feel personal?",
  },
  {
    id: "drawer-expand",
    name: "Drawer Expand",
    description:
      "Compact +21 badge expands into a vote drawer with ratio bar. Details on demand.",
    component: DesignDrawerExpand,
    traits: ["Progressive", "Detailed"],
    category: "ux",
    question: "Can vote details be hidden?",
  },
  {
    id: "single-upvote",
    name: "Single Upvote",
    description:
      "No downvote. Just a confident upvote badge. Like ProductHunt. Simplifies the mental model.",
    component: DesignSingleUpvote,
    traits: ["Simple", "Decisive"],
    category: "ux",
    question: "Do we even need downvotes?",
  },
  {
    id: "magnetic-tilt",
    name: "Magnetic Tilt",
    description:
      "Card tilts in 3D toward your vote. Spatial feedback replaces color-only states. Directional light shifts.",
    component: DesignMagneticTilt,
    traits: ["3D", "Spatial"],
    category: "ux",
    question: "Can spatial feedback replace states?",
  },
  {
    id: "ink-blot",
    name: "Ink Blot",
    description:
      "Vote click triggers an expanding color wash from the button. Organic, satisfying confirmation.",
    component: DesignInkBlot,
    traits: ["Organic", "Satisfying"],
    category: "ux",
    question: "Can feedback feel organic?",
  },
  // Section C — Refined Hybrids
  {
    id: "editorial-feed",
    name: "Editorial Feed",
    description:
      "Serif titles with margin votes and stacked list. Combines Magazine Editorial serif + Pill Cluster `24↑ 4↓` breakdown.",
    component: DesignEditorialFeed,
    traits: ["Editorial", "List"],
    category: "beyond",
    question: "What if feedback felt like reading a curated editorial feed?",
  },
  {
    id: "metric-action-bar",
    name: "Metric Action Bar",
    description:
      "Hero number + condensed content + sweep action bar. Combines Dashboard Metric hero + Action Bar footer + Bottom Bar sweep.",
    component: DesignMetricActionBar,
    traits: ["Data-first", "Multi-action"],
    category: "beyond",
    question: "What if the metric was hero and actions were social?",
  },
  {
    id: "corner-percentage",
    name: "Corner Percentage",
    description:
      "Corner badge showing % positive instead of raw count. Combines Corner Badge creative placement + Split Panel percentage.",
    component: DesignCornerPercentage,
    traits: ["Corner", "Percentage"],
    category: "beyond",
    question: "What if the corner badge showed approval rate?",
  },
  {
    id: "notch-percentage",
    name: "Notch Percentage",
    description:
      "Minimal out-of-card vote with glowing notch and percentage. Combines Minimal Notch + Split Panel percentage.",
    component: DesignNotchPercentage,
    traits: ["Minimal", "Glowing"],
    category: "beyond",
    question: "What if a notch showed the approval percentage?",
  },
  {
    id: "sweep-split",
    name: "Sweep Split",
    description:
      "Split panel with sweep animation on vote and percentage bar. Combines Split Panel + Bottom Bar sweep.",
    component: DesignSweepSplit,
    traits: ["Spatial", "Animated"],
    category: "beyond",
    question: "What if the split panel had satisfying sweep feedback?",
  },
  {
    id: "condensed-pill-row",
    name: "Condensed Pill Row",
    description:
      "Pill cluster with condensed dashboard info and percentage. Combines Pill Cluster `24↑ 4↓` + Dashboard Metric condensed.",
    component: DesignCondensedPillRow,
    traits: ["Flat", "Condensed"],
    category: "beyond",
    question: "What if pills showed both breakdown and percentage?",
  },
  {
    id: "editorial-notch",
    name: "Editorial Notch",
    description:
      "Serif title with out-of-card glowing notch vote. Combines Magazine Editorial serif + Minimal Notch + pill breakdown.",
    component: DesignEditorialNotch,
    traits: ["Editorial", "Minimal"],
    category: "beyond",
    question: "What if editorial style met a minimal notch vote?",
  },
  {
    id: "sweep-corner",
    name: "Sweep Corner",
    description:
      "Corner badge with sweep animation and pill details in footer. Combines Corner Badge + Bottom Bar sweep + Pill Cluster.",
    component: DesignSweepCorner,
    traits: ["Corner", "Animated"],
    category: "beyond",
    question: "What if the corner badge had sweep feedback?",
  },
] as const;

const LAYOUT_DESIGNS = DESIGNS.filter((d) => d.category === "layout");
const UX_DESIGNS = DESIGNS.filter((d) => d.category === "ux");
const BEYOND_DESIGNS = DESIGNS.filter((d) => d.category === "beyond");

export default function VoteDesignsPage() {
  const [favorite, setFavorite] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-border/50 border-b bg-card/50 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
            Design Exploration
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-tight">
            Vote Button Redesign
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground text-sm leading-relaxed">
            {DESIGNS.length} interactive designs exploring layout, interaction
            models, and feedback patterns. Click to interact. Heart your
            favorite.
          </p>
          {favorite && (
            <p className="mt-3 text-primary text-xs">
              Favorite:{" "}
              <span className="font-semibold">
                {DESIGNS.find((d) => d.id === favorite)?.name}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Section A: Layouts */}
      <div className="mx-auto max-w-6xl px-6 pt-10 pb-4">
        <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
          A. Layout explorations
        </h2>
        <p className="mt-1 text-[11px] text-muted-foreground/60">
          Where do votes live? Different card structures, spatial arrangements,
          information hierarchy.
        </p>
      </div>
      <div className="mx-auto max-w-6xl px-6 pb-10">
        <div className="grid gap-10 md:grid-cols-2">
          {LAYOUT_DESIGNS.map((design, index) => (
            <DesignCell
              design={design}
              favorite={favorite}
              index={index}
              key={design.id}
              onFavorite={setFavorite}
            />
          ))}
        </div>
      </div>

      {/* Section B: UX models */}
      <div className="border-border/30 border-t">
        <div className="mx-auto max-w-6xl px-6 pt-10 pb-4">
          <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
            B. UX model explorations
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground/60">
            Different ways to think about the voting interaction. Each explores
            a specific UX question.
          </p>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-16">
          <div className="grid gap-10 md:grid-cols-2">
            {UX_DESIGNS.map((design, index) => (
              <DesignCell
                design={design}
                favorite={favorite}
                index={index}
                key={design.id}
                onFavorite={setFavorite}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Section C: Refined hybrids */}
      <div className="border-border/30 border-t">
        <div className="mx-auto max-w-6xl px-6 pt-10 pb-4">
          <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
            C. Refined hybrids
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground/60">
            Combining the best elements from favorites. Editorial serifs, sweep
            animations, percentage displays, out-of-card votes.
          </p>
        </div>
        <div className="mx-auto max-w-6xl px-6 pb-16">
          <div className="grid gap-10 md:grid-cols-2">
            {BEYOND_DESIGNS.map((design, index) => (
              <DesignCell
                design={design}
                favorite={favorite}
                index={index}
                key={design.id}
                onFavorite={setFavorite}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Design cell ──────────────────────────────────────────────────────────────

function DesignCell({
  design,
  index,
  favorite,
  onFavorite,
}: {
  design: (typeof DESIGNS)[number];
  index: number;
  favorite: string | null;
  onFavorite: (id: string | null) => void;
}) {
  const Component = design.component;
  const isFavorite = favorite === design.id;
  const question = "question" in design ? design.question : null;
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
      initial={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: index * 0.04 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground/40">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="font-semibold text-sm">{design.name}</h3>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
            {design.description}
          </p>
          {question && (
            <p className="mt-1 text-[10px] text-primary/70 italic">
              {question}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {design.traits.map((trait) => (
              <span
                className="rounded-full bg-muted px-1.5 py-px text-[9px] text-muted-foreground"
                key={trait}
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
        <button
          className={cn(
            "shrink-0 rounded-full p-1 transition-colors",
            isFavorite
              ? "text-rose-500"
              : "text-muted-foreground/20 hover:text-rose-400"
          )}
          onClick={() => onFavorite(isFavorite ? null : design.id)}
          type="button"
        >
          <HeartIcon
            className="h-4 w-4"
            weight={isFavorite ? "fill" : "regular"}
          />
        </button>
      </div>
      <div
        className={cn(
          "rounded-2xl border border-border/30 bg-background p-3 transition-all",
          isFavorite && "ring-2 ring-rose-500/20"
        )}
      >
        <Component />
      </div>
    </motion.div>
  );
}
