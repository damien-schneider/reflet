"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import {
  fileRequest as fileInStore,
  mergeRequest as mergeInStore,
  SORTS,
  select,
  sortBy,
  toggleVote,
  useBoard,
  useVisibleRows,
} from "../board-store";
import type { BoardItem } from "../landing-data";
import BoardCompose from "./board-compose";
import BoardRow from "./board-row";
import IncomingRequest from "./incoming-request";
import { matchRequest, topicTag } from "./match-request";

const FOLD_DELAY = 900;
const MERGE_DELAY = 1400;

interface PendingRequest {
  matchId: string;
  merging: boolean;
  title: string;
}

function newRequest(title: string, index: number): BoardItem {
  return {
    ageMinutes: 0,
    aiPriority: "Medium",
    author: "@you",
    authorInitial: "Y",
    comments: 0,
    id: `filed-${index}`,
    mine: true,
    status: "Under review",
    tags: [{ label: topicTag(title) }],
    timeAgo: "just now",
    title,
    votes: 1,
  };
}

export default function FeedbackBoard() {
  const { filed, merges, mine, selectedId, sortId, votedIds } = useBoard();
  const rows = useVisibleRows();
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const reduceMotion = useReducedMotion();

  const foldInto = (matchId: string, title: string) => {
    if (reduceMotion) {
      mergeInStore(matchId, title);
      return;
    }
    setPending({ matchId, merging: false, title });
    setTimeout(() => setPending({ matchId, merging: true, title }), FOLD_DELAY);
    setTimeout(() => {
      setPending(null);
      mergeInStore(matchId, title);
    }, MERGE_DELAY);
  };

  const submit = (title: string) => {
    const matchId = matchRequest(title);
    if (matchId !== null) {
      foldInto(matchId, title);
      return;
    }
    fileInStore(newRequest(title, filed.length), title);
  };

  return (
    <div className="flex min-w-0 select-none flex-col">
      <div className="flex items-center justify-between border-border/70 border-b px-5 py-2">
        <span className="flex shrink-0 items-center gap-2 font-semibold text-[13px] text-foreground">
          <span className="sm:hidden">Board</span>
          <span className="hidden sm:inline">Feature requests</span>
          <span className="rounded-sm bg-muted px-1.5 py-0.5 font-medium text-[11px] text-muted-foreground dark:bg-sidebar">
            Demo
          </span>
        </span>
        <fieldset className="flex items-center gap-3 text-[11px] sm:gap-4">
          <legend className="sr-only">Sort requests</legend>
          {SORTS.map((sort) => (
            <button
              aria-pressed={sort.id === sortId}
              className={cn(
                "-my-1.5 flex h-9 cursor-pointer items-center rounded-sm transition-colors",
                sort.id === sortId
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={sort.id}
              onClick={() => sortBy(sort.id)}
              type="button"
            >
              {sort.label}
            </button>
          ))}
        </fieldset>
      </div>

      <BoardCompose onSubmit={submit} />

      <motion.div animate="shown" initial="hidden" key={sortId}>
        {pending && (
          <IncomingRequest merging={pending.merging} title={pending.title} />
        )}
        {rows.map((item) => {
          const bonus = merges.get(item.id) ?? 0;
          return (
            <BoardRow
              duplicates={(item.similar?.length ?? 0) + bonus}
              hasMine={mine.has(item.id)}
              isSelected={selectedId === item.id}
              isVoted={votedIds.has(item.id)}
              item={item}
              key={item.id}
              onSelect={select}
              onToggleVote={toggleVote}
              votes={item.votes + bonus}
            />
          );
        })}
      </motion.div>
    </div>
  );
}
