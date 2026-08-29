"use client";

import {
  BellRinging,
  Cursor,
  ImageSquare,
  PaperPlaneTilt,
  X,
} from "@phosphor-icons/react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

import { useFollowedRequest } from "../../board-store";
import { plural } from "../../landing-data";
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

const NAV = ["Overview", "Reports", "Members", "Settings"] as const;
const STATS = [
  { label: "Active", value: "2,481" },
  { label: "Retention", value: "94%" },
  { label: "Churn", value: "1.2%" },
] as const;
const BARS = [38, 54, 42, 66, 51, 78, 62, 88, 70, 96] as const;

const PANEL_CLASS =
  "absolute right-4 bottom-4 w-58 rounded-xl border border-border/80 bg-card p-3 shadow-[0_18px_50px_-18px_rgba(20,18,11,0.45)] dark:shadow-[0_18px_50px_-18px_rgba(0,0,0,0.9)]";

function AppBackdrop({ picking = false }: { picking?: boolean }) {
  return (
    <div className="absolute inset-0 flex select-none">
      <div className="hidden w-32 shrink-0 flex-col gap-1 border-border/60 border-r bg-muted/40 p-3 sm:flex dark:bg-sidebar/40">
        <span className="mb-3 flex items-center gap-1.5 font-semibold text-[12px] text-foreground/70">
          <span className="size-4 rounded bg-olive-600/70 dark:bg-olive-400/70" />
          Acme
        </span>
        {NAV.map((entry, index) => (
          <span
            className={cn(
              "rounded px-2 py-1.5 text-[11px]",
              index === 0
                ? "bg-olive-900/6 font-medium text-foreground/70 dark:bg-olive-100/8"
                : "text-muted-foreground"
            )}
            key={entry}
          >
            {entry}
          </span>
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between">
          <span className="font-semibold text-[13px] text-foreground/75">
            Overview
          </span>
          <span className="text-[11px] text-muted-foreground">Last 7 days</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {STATS.map((stat) => (
            <div
              className="rounded-lg border border-border/60 px-2.5 py-2"
              key={stat.label}
            >
              <span className="block text-[10px] text-muted-foreground">
                {stat.label}
              </span>
              <span className="block font-mono text-[13px] text-foreground/70 tabular-nums">
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        <div
          className={cn(
            "relative flex min-h-24 flex-1 items-end gap-1.5 rounded-lg border p-3",
            picking
              ? "border-olive-600 border-dashed bg-olive-600/6 dark:border-olive-400 dark:bg-olive-400/8"
              : "border-border/60"
          )}
        >
          {BARS.map((bar) => (
            <span
              className={cn(
                "flex-1 rounded-t-sm",
                picking
                  ? "bg-olive-600/45 dark:bg-olive-400/45"
                  : "bg-olive-900/12 dark:bg-olive-100/12"
              )}
              key={bar}
              style={{ height: `${bar}%` }}
            />
          ))}

          {picking && (
            <>
              <span className="absolute -top-2.5 left-3 rounded bg-olive-600 px-1.5 py-0.5 font-semibold text-[10px] text-olive-50 dark:bg-olive-400 dark:text-olive-950">
                div.usage-chart
              </span>
              <Cursor
                className="absolute right-10 bottom-6 text-foreground drop-shadow-sm"
                size={16}
                weight="fill"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function SceneAsk() {
  return (
    <div className="absolute inset-0">
      <AppBackdrop picking />

      <div className={PANEL_CLASS}>
        <div className="mb-2.5 flex items-center justify-between">
          <span className="font-semibold text-[12px] text-foreground">
            Send feedback
          </span>
          <X className="text-muted-foreground" size={11} weight="bold" />
        </div>

        <LoopCard className="px-3 py-2.5">
          <LoopTitle size={13} />
          <LoopBody className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <ImageSquare size={11} weight="fill" />
            Screenshot · div.usage-chart
          </LoopBody>
        </LoopCard>

        <div className="mt-2.5 flex items-center justify-between">
          <LoopAuthor />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-olive-600 px-2.5 py-1 font-medium text-[11px] text-olive-50 dark:bg-olive-400 dark:text-olive-950">
            Send
            <PaperPlaneTilt size={10} weight="fill" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function SceneReply() {
  const { item, votes } = useFollowedRequest();
  const enter = useEnter();

  return (
    <div className="absolute inset-0">
      <AppBackdrop />

      <LoopCard className="absolute right-4 bottom-4 w-64 border border-olive-600/25 p-3 shadow-[0_18px_50px_-18px_rgba(20,18,11,0.45)] backdrop-blur-sm dark:border-olive-400/25 dark:shadow-[0_18px_50px_-18px_rgba(0,0,0,0.9)]">
        <LoopBody className="mb-2 flex items-center gap-1.5">
          <BellRinging
            className="text-olive-700 dark:text-olive-300"
            size={11}
            weight="fill"
          />
          <span className="font-semibold text-[11px] text-olive-700 dark:text-olive-300">
            Shipped in v{item.version ?? "3.2.1"}
          </span>
        </LoopBody>

        <LoopTitle size={13} />

        <LoopRow className="mt-2 flex items-center gap-2">
          <LoopTag />
          <LoopVotes className="flex-row gap-1" count={votes} />
        </LoopRow>

        <LoopRow className="mt-2.5 flex items-center gap-2 border-olive-600/15 border-t pt-2.5 dark:border-olive-400/15">
          <LoopAuthor />
          <span className="text-[10px] text-muted-foreground">
            and {plural(votes - 1, "voter")} notified
          </span>
        </LoopRow>
      </LoopCard>

      <motion.span
        animate={{ opacity: [0, 0.55, 0] }}
        className="pointer-events-none absolute right-4 bottom-4 size-64 rounded-xl bg-olive-600/25 blur-2xl dark:bg-olive-400/25"
        transition={enter(0, 1.6)}
      />
    </div>
  );
}
