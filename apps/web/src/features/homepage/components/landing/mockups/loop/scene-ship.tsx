"use client";

import { CheckCircle, GitPullRequest, Rocket } from "@phosphor-icons/react";
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

const LANES = [
  {
    dot: "border border-olive-600/60 dark:border-olive-400/60",
    id: "planned",
    tickets: ["Audit log export", "CSV import", "Per-board domains"],
    title: "Planned",
  },
  {
    dot: "bg-olive-600 dark:bg-olive-400",
    id: "in-progress",
    tickets: ["Mobile push", "Weekly digest"],
    title: "In progress",
  },
  {
    dot: "bg-muted-foreground/40",
    id: "shipped",
    tickets: ["GitHub issue sync", "Slack alerts", "Email digests"],
    title: "Shipped",
  },
] as const;

const BUILD_LINES = [
  "theme tokens wired through the public board",
  "visitor preference stored, no flash on load",
] as const;

const PAST_RELEASES = [
  { title: "Faster board search", version: "3.0.6" },
  { title: "Comment mentions", version: "3.0.5" },
] as const;

const TICKET_CLASS =
  "rounded-lg border border-border/70 bg-card px-2.5 py-2 text-[11px] text-muted-foreground";

export function SceneRoadmap() {
  const { votes } = useFollowedRequest();

  return (
    <div className="absolute inset-0 flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-[13px] text-foreground">
          Q1 roadmap
        </span>
        <span className="text-[11px] text-muted-foreground">
          ordered by votes
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid flex-1 grid-cols-3 gap-3">
        {LANES.map((lane) => (
          <div className="flex flex-col gap-2" key={lane.id}>
            <span className="flex items-center gap-1.5 border-border/70 border-b pb-1.5">
              <span className={cn("size-1.5 rounded-full", lane.dot)} />
              <span className="font-semibold text-[11px] text-foreground">
                {lane.title}
              </span>
            </span>

            {lane.id === "in-progress" && (
              <LoopCard className="px-2.5 py-2">
                <LoopTitle size={12} />
                <LoopRow className="mt-2 flex items-center justify-between gap-2">
                  <LoopTag />
                  <LoopVotes className="flex-row gap-1" count={votes} />
                </LoopRow>
                <LoopRow className="mt-1.5">
                  <LoopAuthor />
                </LoopRow>
              </LoopCard>
            )}

            {lane.tickets.map((ticket) => (
              <span className={TICKET_CLASS} key={ticket}>
                {ticket}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SceneBuild() {
  const { duplicates, votes } = useFollowedRequest();
  const enter = useEnter();

  return (
    <div className="absolute inset-0 flex flex-col gap-2 bg-olive-950 p-4 font-mono text-[11px] text-olive-100/70 ring-1 ring-olive-100/8 ring-inset sm:text-[12px]">
      <span>
        <span className="text-olive-400">~/acme</span> reflet mcp · connected
      </span>
      <span className="text-olive-100/90">
        <span className="text-olive-400">$</span> claude &quot;pick the top
        request and ship it&quot;
      </span>

      <LoopCard className="my-1 flex items-center gap-2.5 px-3 py-2 text-olive-50 ring-olive-400/30">
        <LoopVotes
          className="flex-row gap-1 border-olive-400/40 text-olive-200"
          count={votes}
        />
        <LoopTitle className="min-w-0 flex-1 font-sans" size={12} />
        <LoopTag className="bg-olive-400/20 text-olive-100" />
      </LoopCard>

      {[
        `read ${votes} votes and ${plural(duplicates, "merged report")}`,
        ...BUILD_LINES,
      ].map((line, index) => (
        <motion.span
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -6 }}
          key={line}
          transition={enter(0.3 + index * 0.14)}
        >
          <CheckCircle
            className="shrink-0 text-olive-400"
            size={12}
            weight="fill"
          />
          {line}
        </motion.span>
      ))}

      <motion.span
        animate={{ opacity: 1 }}
        className="mt-2 block text-olive-100/90"
        initial={{ opacity: 0 }}
        transition={enter(0.78)}
      >
        <span className="text-olive-400">$</span> git commit -m
        &quot;feat(board): dark mode&quot;
      </motion.span>

      <motion.span
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 text-olive-100/90"
        initial={{ opacity: 0 }}
        transition={enter(0.92)}
      >
        <GitPullRequest className="shrink-0 text-olive-400" size={12} />
        PR #219 merged · closes #482
      </motion.span>
    </div>
  );
}

export function SceneRelease() {
  const { item, votes } = useFollowedRequest();

  return (
    <div className="absolute inset-0 flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <Rocket
          className="text-olive-700 dark:text-olive-300"
          size={13}
          weight="fill"
        />
        <span className="font-semibold text-[13px] text-foreground">
          Changelog
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <LoopCard className="px-4 py-4">
        <LoopRow className="mb-2 flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">
            v{item.version ?? "3.2.1"}
          </span>
          <LoopTag />
        </LoopRow>

        <LoopTitle
          className="font-display font-normal tracking-tight"
          size={26}
        />

        <LoopBody
          className="mt-2 text-[12px] text-muted-foreground leading-relaxed"
          delay={0.26}
        >
          {item.shipNote ?? "Shipped, and live for everyone who asked."}
        </LoopBody>

        <LoopRow className="mt-3 flex items-center gap-2.5 border-olive-600/15 border-t pt-2.5 dark:border-olive-400/15">
          <LoopVotes className="flex-row gap-1" count={votes} />
          <span className="text-[11px] text-muted-foreground">
            {votes} people asked for this
          </span>
          <LoopAuthor className="ml-auto" />
        </LoopRow>
      </LoopCard>

      {PAST_RELEASES.map((release) => (
        <div
          className="flex items-center gap-3 opacity-40"
          key={release.version}
        >
          <span className="font-mono text-[11px] text-muted-foreground">
            v{release.version}
          </span>
          <span className="text-[12px] text-muted-foreground">
            {release.title}
          </span>
        </div>
      ))}
    </div>
  );
}
