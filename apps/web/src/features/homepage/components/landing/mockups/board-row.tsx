"use client";

import { ArrowUp, GitMerge, Sparkle } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

import { EASE_OUT_EXPO } from "../../../lib/motion";
import { type BoardItem, plural } from "../landing-data";
import StatusMark from "./status-mark";

const TAG_CLASS =
  "inline-flex h-5 items-center gap-1 rounded-sm bg-olive-600/10 px-2 font-semibold text-[11px] text-olive-700 dark:bg-olive-400/15 dark:text-olive-300";

interface BoardRowProps {
  duplicates: number;
  hasMine: boolean;
  isSelected: boolean;
  isVoted: boolean;
  item: BoardItem;
  onSelect: (id: string) => void;
  onToggleVote: (id: string) => void;
  votes: number;
}

export default function BoardRow({
  duplicates,
  hasMine,
  isSelected,
  isVoted,
  item,
  onSelect,
  onToggleVote,
  votes,
}: BoardRowProps) {
  const reduceMotion = useReducedMotion();
  const insight = item.mine
    ? `Grouped under ${item.tags[0]?.label ?? "everything else"}`
    : `Reflet tagged it ${item.aiPriority.toLowerCase()} priority`;

  return (
    <motion.div
      className={cn(
        "relative flex items-start gap-3.5 border-border/70 border-b px-5 py-2 transition-colors last:border-b-0",
        isSelected
          ? "bg-olive-600/10 dark:bg-olive-400/8"
          : "bg-card hover:bg-olive-950/[0.08] dark:hover:bg-olive-100/[0.09]"
      )}
    >
      <button
        aria-label={`Upvote ${item.title}`}
        aria-pressed={isVoted}
        className={cn(
          "relative z-10 mt-0.5 flex h-11 w-9.5 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border transition-colors",
          isVoted
            ? "border-olive-600/40 bg-olive-600/10 text-olive-600 dark:border-olive-400/40 dark:bg-olive-400/10 dark:text-olive-400"
            : "border-border text-muted-foreground hover:border-olive-600/40"
        )}
        onClick={() => onToggleVote(item.id)}
        type="button"
      >
        <motion.span animate={{ y: isVoted ? -1.5 : 0 }}>
          <ArrowUp size={11} weight="bold" />
        </motion.span>
        <span className="relative flex h-3 w-full justify-center overflow-hidden font-bold text-[11px] tabular-nums leading-none">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              initial={{ opacity: 0, y: -10 }}
              key={isVoted ? votes + 1 : votes}
              transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
            >
              {isVoted ? votes + 1 : votes}
            </motion.span>
          </AnimatePresence>
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <button
          aria-expanded={isSelected}
          className="block cursor-pointer text-left font-semibold text-[13px] text-foreground leading-snug after:absolute after:inset-0"
          onClick={() => onSelect(item.id)}
          type="button"
        >
          {item.title}
        </button>
        <div className="mt-0.5 mb-1 hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
          <span className="flex size-4 items-center justify-center rounded-full bg-olive-900/8 font-bold text-[11px] text-olive-900/70 dark:bg-olive-100/12 dark:text-olive-100/70">
            {item.authorInitial}
          </span>
          {item.author}
          <span aria-hidden="true" className="text-muted-foreground">
            ·
          </span>
          {item.timeAgo}
          {item.comments > 0 && (
            <>
              <span
                aria-hidden="true"
                className="hidden text-muted-foreground sm:inline"
              >
                ·
              </span>
              <span className="hidden sm:inline">
                {plural(item.comments, "comment")}
              </span>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusMark status={item.status} />
          {hasMine && (
            <span className="inline-flex h-5 items-center gap-1 rounded-sm bg-olive-600 px-2 font-semibold text-[11px] text-olive-50 dark:bg-olive-400 dark:text-olive-950">
              <GitMerge size={10} weight="bold" />
              Yours
            </span>
          )}
          <span aria-hidden="true" className="text-muted-foreground">
            ·
          </span>
          {item.tags.map((tag) => (
            <span className={TAG_CLASS} key={tag.label}>
              {tag.label}
            </span>
          ))}
        </div>

        <AnimatePresence initial={false}>
          {isSelected && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={{
                duration: reduceMotion ? 0 : 0.35,
                ease: EASE_OUT_EXPO,
              }}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2.5 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkle
                    className="text-olive-600 dark:text-olive-400"
                    size={11}
                    weight="fill"
                  />
                  {insight}
                </span>
                {duplicates > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <GitMerge
                      className="text-olive-600 dark:text-olive-400"
                      size={11}
                    />
                    {plural(duplicates, "duplicate")} merged in
                    {hasMine && ", including yours"}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
