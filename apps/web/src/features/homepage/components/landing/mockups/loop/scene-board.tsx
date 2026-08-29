"use client";

import { GitMerge, Sparkle } from "@phosphor-icons/react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

import { useFollowedRequest } from "../../board-store";
import {
  type BoardItem,
  FEEDBACK_BOARD_DATA,
  plural,
} from "../../landing-data";
import StatusMark from "../status-mark";
import {
  LoopAuthor,
  LoopBody,
  LoopCard,
  LoopRow,
  LoopTag,
  LoopTitle,
  LoopVotes,
  useEnter,
} from "./loop-card";

const SORTS = ["Top voted", "Newest", "Most discussed"] as const;

const FILLER_ROWS = [
  {
    author: "@lea",
    id: "filler-csv",
    status: "Planned",
    timeAgo: "5d ago",
    title: "Export the board to CSV",
    votes: 33,
  },
  {
    author: "@nils",
    id: "filler-digest",
    status: "Under review",
    timeAgo: "1w ago",
    title: "Weekly digest of new requests",
    votes: 18,
  },
] as const satisfies readonly BoardRowData[];

function BoardChrome() {
  return (
    <div className="flex items-center justify-between border-border/70 border-b px-4 py-2.5">
      <span className="font-semibold text-[13px] text-foreground">
        Feature requests
      </span>
      <span className="flex items-center gap-3 text-[11px]">
        {SORTS.map((sort, index) => (
          <span
            className={
              index === 1
                ? "font-semibold text-foreground"
                : "text-muted-foreground"
            }
            key={sort}
          >
            {sort}
          </span>
        ))}
      </span>
    </div>
  );
}

type BoardRowData = Pick<
  BoardItem,
  "author" | "id" | "status" | "timeAgo" | "title" | "votes"
>;

function OtherRows({ dimmed = false }: { dimmed?: boolean }) {
  const { item } = useFollowedRequest();
  const enter = useEnter();
  const rows: readonly BoardRowData[] = [
    ...FEEDBACK_BOARD_DATA.filter((row) => row.id !== item.id),
    ...FILLER_ROWS,
  ];

  return (
    <div className={cn("transition-opacity", dimmed && "opacity-35")}>
      {rows.map((row, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 border-border/60 border-b px-4 py-2.5 last:border-b-0"
          initial={{ opacity: 0, y: 8 }}
          key={row.id}
          transition={enter(0.2 + index * 0.07)}
        >
          <span className="flex w-7 shrink-0 flex-col items-center gap-0.5 rounded-md border border-border px-1.5 py-1 font-mono text-[11px] text-muted-foreground tabular-nums leading-none">
            {row.votes}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-[12px] text-muted-foreground">
              {row.title}
            </span>
            <span className="mt-1 flex items-center gap-1.5">
              <StatusMark status={row.status} />
              <span className="text-[10px] text-muted-foreground">
                {row.author} · {row.timeAgo}
              </span>
            </span>
          </span>
        </motion.div>
      ))}
    </div>
  );
}

export function SceneBoard() {
  return (
    <div className="absolute inset-0 flex flex-col">
      <BoardChrome />
      <div className="p-2">
        <LoopCard className="flex items-center gap-3 px-3 py-2.5">
          <LoopVotes count={1} />
          <div className="min-w-0 flex-1">
            <LoopTitle size={13} />
            <LoopRow className="mt-1 flex items-center gap-1.5">
              <LoopAuthor />
              <span className="text-[10px] text-muted-foreground">
                · just now · public
              </span>
            </LoopRow>
          </div>
        </LoopCard>
      </div>
      <OtherRows />
    </div>
  );
}

export function SceneTriage() {
  const { duplicates, isMine, item, typed, votes } = useFollowedRequest();
  const enter = useEnter();
  const similar = item.similar ?? [];
  const merged = isMine ? [typed, ...similar] : similar;

  return (
    <div className="absolute inset-0 flex flex-col">
      <BoardChrome />
      <div className="p-2">
        <LoopCard className="px-3.5 py-3 shadow-[0_16px_40px_-24px_rgba(20,18,11,0.5)] dark:shadow-[0_16px_40px_-24px_rgba(0,0,0,0.9)]">
          <div className="flex items-start gap-3">
            <LoopVotes count={votes} />
            <div className="min-w-0 flex-1">
              <LoopTitle size={14} />
              <LoopRow className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <LoopTag />
                <span className="inline-flex h-5 items-center rounded-sm bg-olive-900/6 px-2 font-semibold text-[11px] text-muted-foreground dark:bg-olive-100/8">
                  {item.aiPriority} priority
                </span>
                <LoopAuthor />
              </LoopRow>
            </div>
          </div>

          <LoopBody
            className="mt-3 border-olive-600/15 border-t pt-2.5 dark:border-olive-400/15"
            delay={0.26}
          >
            <span className="flex items-center gap-1.5 font-medium text-[11px] text-olive-700 dark:text-olive-300">
              <Sparkle size={10} weight="fill" />
              Reflet read every report and merged them
            </span>

            <span className="mt-2 block">
              {merged.map((duplicate, index) => (
                <motion.span
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 py-1 text-[11px] text-muted-foreground"
                  initial={{ opacity: 0, x: 14 }}
                  key={duplicate}
                  transition={enter(0.34 + index * 0.1, 0.4)}
                >
                  <GitMerge
                    className="shrink-0 text-olive-700/60 dark:text-olive-300/60"
                    size={11}
                  />
                  <span className="truncate">{duplicate}</span>
                </motion.span>
              ))}
            </span>

            <span className="mt-1.5 block font-medium text-[11px] text-foreground">
              {plural(duplicates, "duplicate")} merged into one thread
            </span>
          </LoopBody>
        </LoopCard>
      </div>
      <OtherRows dimmed />
    </div>
  );
}
