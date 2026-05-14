"use client";

import {
  IconChevronDown,
  IconMessageChatbot,
  IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const RELATIVE_TIME_THRESHOLDS = [
  { ms: 60_000, label: "just now" },
  { ms: 3_600_000, divisor: 60_000, suffix: "m ago" },
  { ms: 86_400_000, divisor: 3_600_000, suffix: "h ago" },
] as const;

export interface ActivityEntry {
  agent: string;
  createdAt: number;
  level: string;
  message: string;
}

const formatRelativeTime = (timestamp: number, now: number): string => {
  const diff = Math.max(0, now - timestamp);
  for (const threshold of RELATIVE_TIME_THRESHOLDS) {
    if (diff < threshold.ms) {
      if ("label" in threshold) {
        return threshold.label;
      }
      return `${Math.floor(diff / threshold.divisor)}${threshold.suffix}`;
    }
  }
  return `${Math.floor(diff / 86_400_000)}d ago`;
};

function ActivityLevelDot({ level }: { level: string }) {
  return (
    <span
      className={cn(
        "mt-1 inline-flex size-1.5 shrink-0 rounded-full",
        level === "error" && "bg-rose-500",
        level === "success" && "bg-emerald-500",
        level === "warning" && "bg-amber-500",
        level === "action" && "bg-blue-500",
        level === "info" && "bg-muted-foreground/50"
      )}
    />
  );
}

function ChainActivityList({
  entries,
  now,
}: {
  entries: ActivityEntry[];
  now: number;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground">No recent activity.</p>
    );
  }

  return (
    <ul className="space-y-1">
      {entries.map((entry, index) => (
        <motion.li
          animate={{ opacity: 1, x: 0 }}
          className="flex items-start gap-2 text-[11px]"
          initial={{ opacity: 0, x: -6 }}
          key={`${entry.createdAt}-${entry.agent}`}
          transition={{
            delay: index * 0.03,
            duration: 0.25,
            ease: EASE_OUT_EXPO,
          }}
        >
          <ActivityLevelDot level={entry.level} />
          <span className="font-mono text-[9px] text-muted-foreground uppercase">
            {entry.agent}
          </span>
          <span className="min-w-0 flex-1 truncate text-foreground/80">
            {entry.message}
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {formatRelativeTime(entry.createdAt, now)}
          </span>
        </motion.li>
      ))}
    </ul>
  );
}

export function ChainLiveSheen({ isLive }: { isLive: boolean }) {
  if (!isLive) {
    return null;
  }

  return (
    <motion.div
      animate={{ x: ["-100%", "100%"] }}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent motion-reduce:hidden"
      transition={{
        duration: 2.4,
        ease: "linear",
        repeat: Number.POSITIVE_INFINITY,
      }}
    />
  );
}

function ChainLiveDot({ isLive }: { isLive: boolean }) {
  return (
    <span className="relative flex size-2.5 shrink-0">
      {isLive && (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/60 motion-reduce:animate-none" />
      )}
      <motion.span
        animate={{ scale: isLive ? [1, 1.15, 1] : 1 }}
        className={cn(
          "relative inline-flex size-2.5 rounded-full",
          isLive ? "bg-emerald-500" : "bg-muted-foreground/50"
        )}
        transition={{
          duration: 1.6,
          ease: "easeInOut",
          repeat: isLive ? Number.POSITIVE_INFINITY : 0,
        }}
      />
    </span>
  );
}

export function ChainStatusButton({
  badgeLabel,
  expanded,
  headline,
  Icon,
  isLive,
  onToggle,
  subline,
}: {
  badgeLabel: string;
  expanded: boolean;
  headline: string;
  Icon: ComponentType<{ className?: string }>;
  isLive: boolean;
  onToggle: () => void;
  subline: string;
}) {
  return (
    <motion.button
      aria-expanded={expanded}
      className="flex flex-1 items-center gap-2 px-3 py-2 text-left"
      onClick={onToggle}
      type="button"
      whileTap={{ scale: 0.985 }}
    >
      <ChainLiveDot isLive={isLive} />
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium text-sm">{headline}</span>
          <Badge
            className="h-4 px-1 text-[9px] uppercase tracking-wider"
            variant={isLive ? "green" : "gray"}
          >
            {badgeLabel}
          </Badge>
        </div>
        {subline && (
          <div className="truncate text-[11px] text-muted-foreground">
            {subline}
          </div>
        )}
      </div>
      <motion.span
        animate={{ rotate: expanded ? 180 : 0 }}
        className="shrink-0 text-muted-foreground"
        transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
      >
        <IconChevronDown className="size-4" />
      </motion.span>
    </motion.button>
  );
}

export function ChainChatToggleButton({
  isChatOpen,
  onToggle,
}: {
  isChatOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      aria-label={isChatOpen ? "Close CEO chat" : "Open CEO chat"}
      aria-pressed={isChatOpen}
      className={cn(
        "flex shrink-0 items-center justify-center border-border/60 border-l px-3 transition-colors",
        isChatOpen
          ? "bg-foreground text-background hover:bg-foreground/90"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      onClick={onToggle}
      type="button"
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.94 }}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          animate={{ opacity: 1, rotate: 0 }}
          exit={{ opacity: 0, rotate: 90 }}
          initial={{ opacity: 0, rotate: -90 }}
          key={isChatOpen ? "close" : "open"}
          transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
        >
          {isChatOpen ? (
            <IconX className="size-4" />
          ) : (
            <IconMessageChatbot className="size-4" />
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

export function ChainExpandedPanel({
  baseUrl,
  entries,
  expanded,
}: {
  baseUrl: string;
  entries: ActivityEntry[];
  expanded: boolean;
}) {
  return (
    <AnimatePresence initial={false}>
      {expanded && (
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden"
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
        >
          <div className="space-y-2 border-border/60 border-t bg-muted/30 px-3 py-2">
            <ChainActivityList entries={entries} now={Date.now()} />
            <Link
              className="block text-center text-[11px] text-muted-foreground hover:text-foreground"
              href={`${baseUrl}/chain`}
            >
              Open full chain →
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { EASE_OUT_EXPO };
