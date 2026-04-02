"use client";

import {
  ArrowUp,
  CalendarBlank,
  ChatCircleDots,
  CheckCircle,
  DotsSixVertical,
  Kanban,
  LinkSimple,
  MegaphoneSimple,
} from "@phosphor-icons/react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  CHANGELOG_ITEMS_DATA,
  FEEDBACK_BOARD_DATA,
  ROADMAP_COLUMNS_DATA,
} from "./landing-data";

// Show first 3 items only for a compact preview
const PREVIEW_FEEDBACK = FEEDBACK_BOARD_DATA.slice(0, 3);
const PREVIEW_CHANGELOG = CHANGELOG_ITEMS_DATA.slice(0, 2);

// ─── Compact Feedback Preview ────────────────────────────────────────────────

export function CompactFeedbackPreview() {
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

  const toggleVote = (id: string) => {
    setVotedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Toolbar — matches real product */}
      <div className="flex items-center justify-between border-border border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <ChatCircleDots
            className="text-olive-600 dark:text-olive-400"
            size={14}
            weight="fill"
          />
          <span className="font-semibold text-[12px] text-foreground">
            Feature Requests
          </span>
          <Badge color="gray">{FEEDBACK_BOARD_DATA.length} open</Badge>
        </div>
        <div className="hidden items-center gap-2 text-[10px] sm:flex">
          <span className="font-semibold text-foreground">Top voted</span>
          <span className="text-muted-foreground">Newest</span>
        </div>
      </div>

      {/* Items */}
      {PREVIEW_FEEDBACK.map((item) => {
        const isVoted = votedIds.has(item.id);
        return (
          <div
            className="flex items-start gap-3 border-border border-b px-4 py-3 last:border-b-0"
            key={item.id}
          >
            {/* Vote button — real pattern */}
            <button
              className={cn(
                "mt-0.5 flex h-10 w-8 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border transition-all",
                isVoted
                  ? "border-olive-600/40 bg-olive-600/10 text-olive-600 dark:border-olive-400/40 dark:bg-olive-400/10 dark:text-olive-400"
                  : "border-border text-muted-foreground hover:border-olive-600/30"
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleVote(item.id);
              }}
              type="button"
            >
              <ArrowUp size={10} weight="bold" />
              <span className="font-bold text-[10px] leading-none">
                {isVoted ? item.votes + 1 : item.votes}
              </span>
            </button>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="mb-1 font-semibold text-[12px] text-foreground leading-snug">
                {item.title}
              </p>
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div
                  className={cn(
                    "flex size-3.5 items-center justify-center rounded-full font-bold text-[6px] text-white",
                    item.authorColor
                  )}
                >
                  {item.authorInitial}
                </div>
                <span>{item.author}</span>
                <span>·</span>
                <span>{item.timeAgo}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Badge color={item.statusColor}>{item.status}</Badge>
                {item.tags.map((tag) => (
                  <Badge color={tag.color} key={tag.label}>
                    {tag.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Compact Roadmap Preview ─────────────────────────────────────────────────

export function CompactRoadmapPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Window chrome — matches roadmap mockup */}
      <div className="flex items-center gap-2 bg-[#2a2924] px-3 py-2 dark:bg-sidebar">
        <div className="flex gap-1.5">
          <div className="size-2 rounded-full bg-[#ff5f57]" />
          <div className="size-2 rounded-full bg-[#febc2e]" />
          <div className="size-2 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex flex-1 items-center justify-center gap-1.5">
          <Kanban className="text-[#999] dark:text-[#666]" size={10} />
          <span className="font-medium text-[#999] text-[10px] dark:text-[#666]">
            Roadmap — Reflet
          </span>
        </div>
        <div className="w-10" />
      </div>

      {/* Board columns */}
      <div className="flex gap-3 overflow-x-auto bg-accent p-3 dark:bg-background">
        {ROADMAP_COLUMNS_DATA.map((col) => (
          <div className="w-44 shrink-0" key={col.id}>
            {/* Column header */}
            <div className="mb-2 flex items-center gap-1.5">
              <div className={cn("size-1.5 rounded-full", col.dotColor)} />
              <span className="font-semibold text-[10px] text-foreground">
                {col.title}
              </span>
              <span className="font-medium text-[9px] text-muted-foreground">
                {col.items.length}
              </span>
            </div>

            {/* Cards — first 2 only */}
            <div className="space-y-1.5">
              {col.items.slice(0, 2).map((item) => (
                <div
                  className="group rounded-md border border-border bg-card p-2 shadow-sm"
                  key={item.id}
                >
                  <div className="mb-1.5 flex items-start justify-between">
                    <p className="font-medium text-[10px] text-foreground leading-snug">
                      {item.title}
                    </p>
                    <DotsSixVertical
                      className="mt-0.5 shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100"
                      size={10}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ArrowUp size={8} />
                      <span className="font-medium text-[9px]">
                        {item.votes}
                      </span>
                    </div>
                    <div className="flex -space-x-1">
                      {item.assignees.map((initial, i) => (
                        <div
                          className={cn(
                            "flex size-4 items-center justify-center rounded-full border-2 border-card font-bold text-[6px] text-white",
                            item.colors[i]
                          )}
                          key={initial}
                        >
                          {initial}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Compact Changelog Preview ───────────────────────────────────────────────

export function CompactChangelogPreview() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-border border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <MegaphoneSimple
            className="text-olive-600 dark:text-olive-400"
            size={14}
            weight="fill"
          />
          <span className="font-semibold text-[12px] text-foreground">
            Changelog
          </span>
        </div>
      </div>

      {/* Entries */}
      <div className="divide-y divide-border">
        {PREVIEW_CHANGELOG.map((entry) => (
          <div className="px-4 py-3" key={entry.id}>
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <Badge color={entry.tagColor}>{entry.version}</Badge>
              <Badge color={entry.tagColor}>{entry.tag}</Badge>
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <CalendarBlank size={8} />
                {entry.date}
              </span>
            </div>
            <p className="mb-1 font-semibold text-[12px] text-foreground leading-snug">
              {entry.title}
            </p>
            <p className="mb-2 line-clamp-1 text-[10px] text-muted-foreground leading-relaxed">
              {entry.description}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-olive-600 dark:text-olive-400">
              <LinkSimple size={10} weight="bold" />
              <span className="font-medium">
                {entry.linkedFeedback} resolved feedback items
              </span>
              <CheckCircle size={10} weight="fill" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
