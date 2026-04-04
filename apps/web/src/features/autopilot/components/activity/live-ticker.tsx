"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  ACTIVITY_AGENT_BADGE_STYLES,
  ACTIVITY_LEVEL_DOT_STYLES,
  type ActivityLogEntry,
  formatTickerEntry,
  getActivityAgentLabel,
} from "./presentation";

const MIN_TICKER_DURATION_SECONDS = 18;
const TICKER_DURATION_PER_ENTRY_SECONDS = 7;
const TYPEWRITER_CHARACTER_DELAY_MS = 18;

const useTypewriter = (text: string, isActive: boolean) => {
  const [displayedText, setDisplayedText] = useState(isActive ? "" : text);
  const [isTyping, setIsTyping] = useState(isActive);

  useEffect(
    function syncStaticTickerText() {
      if (isActive) {
        return;
      }

      setDisplayedText(text);
      setIsTyping(false);
    },
    [isActive, text]
  );

  useEffect(
    function typeTickerText() {
      if (!isActive) {
        return;
      }

      if (text.length === 0) {
        setDisplayedText("");
        setIsTyping(false);
        return;
      }

      setDisplayedText("");
      setIsTyping(true);

      let currentCharacterCount = 0;
      const intervalId = window.setInterval(() => {
        currentCharacterCount += 1;
        setDisplayedText(text.slice(0, currentCharacterCount));

        if (currentCharacterCount >= text.length) {
          window.clearInterval(intervalId);
          setIsTyping(false);
        }
      }, TYPEWRITER_CHARACTER_DELAY_MS);

      return () => {
        window.clearInterval(intervalId);
      };
    },
    [isActive, text]
  );

  return { displayedText, isTyping };
};

function TickerItem({
  entry,
  isAnimated,
}: {
  entry: ActivityLogEntry;
  isAnimated: boolean;
}) {
  const { displayedText, isTyping } = useTypewriter(entry.message, isAnimated);
  const entryLabel = formatTickerEntry(entry);

  return (
    <li
      aria-label={entryLabel}
      className="inline-flex shrink-0 items-center gap-2 border-border/40 border-r px-4"
      title={entryLabel}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 shrink-0 rounded-full",
          ACTIVITY_LEVEL_DOT_STYLES[entry.level]
        )}
      />
      <Badge
        className={cn(
          "h-6 shrink-0 rounded-full px-2 font-semibold text-[10px] uppercase tracking-[0.18em]",
          ACTIVITY_AGENT_BADGE_STYLES[entry.agent]
        )}
        variant="outline"
      >
        {getActivityAgentLabel(entry.agent)}
      </Badge>
      {entry.targetAgent ? (
        <>
          <span className="text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
            to
          </span>
          <Badge
            className={cn(
              "h-6 shrink-0 rounded-full px-2 font-semibold text-[10px] uppercase tracking-[0.18em]",
              ACTIVITY_AGENT_BADGE_STYLES[entry.targetAgent]
            )}
            variant="outline"
          >
            {getActivityAgentLabel(entry.targetAgent)}
          </Badge>
        </>
      ) : null}
      <span className="font-medium text-foreground/80 text-sm">
        {isAnimated ? displayedText : entry.message}
      </span>
      {isTyping ? (
        <span
          aria-hidden
          className="h-4 w-px shrink-0 animate-pulse bg-foreground/70"
        />
      ) : null}
    </li>
  );
}

export function LiveTicker({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const activity = useQuery(api.autopilot.queries.activity.listTickerActivity, {
    organizationId,
  });
  const [animatedEntryId, setAnimatedEntryId] = useState<string | null>(null);
  const previousLatestEntryIdRef = useRef<string | null>(null);

  const latestEntryId = activity?.[0]?._id ?? null;

  useEffect(
    function trackLatestTickerEntry() {
      if (!latestEntryId) {
        setAnimatedEntryId(null);
        return;
      }

      const previousLatestEntryId = previousLatestEntryIdRef.current;

      if (previousLatestEntryId && previousLatestEntryId !== latestEntryId) {
        setAnimatedEntryId(latestEntryId);
      } else if (!previousLatestEntryId) {
        setAnimatedEntryId(null);
      }

      previousLatestEntryIdRef.current = latestEntryId;
    },
    [latestEntryId]
  );

  if (!activity || activity.length === 0) {
    return null;
  }

  const repeatedActivity = [...activity, ...activity];
  const tickerDurationSeconds = Math.max(
    MIN_TICKER_DURATION_SECONDS,
    activity.length * TICKER_DURATION_PER_ENTRY_SECONDS
  );

  return (
    <div
      aria-live="polite"
      className="relative mb-4 overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-linear-to-r from-card via-card/90 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-linear-to-l from-card via-card/90 to-transparent" />

      <div className="flex items-center">
        <div className="flex shrink-0 items-center gap-2 border-border/60 border-r bg-background/50 px-3 py-3">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/70" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="font-semibold text-[10px] text-muted-foreground uppercase tracking-[0.35em]">
            Live
          </span>
        </div>

        <div className="min-w-0 flex-1 overflow-hidden">
          <motion.ul
            animate={{ x: "-50%" }}
            className="flex min-w-max list-none items-center whitespace-nowrap py-3"
            initial={{ x: "0%" }}
            key={latestEntryId ?? "activity-ticker"}
            transition={{
              ease: "linear",
              duration: tickerDurationSeconds,
              repeat: Number.POSITIVE_INFINITY,
            }}
          >
            {repeatedActivity.map((entry, index) => (
              <TickerItem
                entry={entry}
                isAnimated={index === 0 && entry._id === animatedEntryId}
                key={`${entry._id}-${String(index)}`}
              />
            ))}
          </motion.ul>
        </div>
      </div>
    </div>
  );
}
