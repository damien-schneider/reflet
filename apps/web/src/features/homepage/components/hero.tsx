"use client";

import {
  ArrowRight,
  ArrowUp,
  CalendarBlank,
  CaretRight,
  ChatCircleDots,
  Kanban,
  MegaphoneSimple,
  Sparkle,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { H1, Lead } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

// =============================================================================
// Tab definitions
// =============================================================================

const TABS = [
  { id: "feedback", label: "Feedback", icon: ChatCircleDots },
  { id: "roadmap", label: "Roadmap", icon: Kanban },
  { id: "changelog", label: "Changelog", icon: MegaphoneSimple },
] as const;

type TabId = (typeof TABS)[number]["id"];

// =============================================================================
// Feedback data
// =============================================================================

const FEEDBACK_ITEMS = [
  {
    id: "dark-mode",
    title: "Dark mode support",
    desc: "Please add a dark theme for late night work sessions.",
    votes: 248,
    color: "green" as const,
    label: "Planned",
    tags: [
      { label: "UX", color: "purple" as const },
      { label: "Design", color: "pink" as const },
    ],
  },
  {
    id: "slack-integration",
    title: "Slack Integration",
    desc: "Would love to see updates directly in our Slack channels.",
    votes: 186,
    color: "orange" as const,
    label: "In Progress",
    tags: [{ label: "Integration", color: "blue" as const }],
  },
  {
    id: "public-api",
    title: "Public API Access",
    desc: "We want to pull feedback into our internal dashboard.",
    votes: 142,
    color: "blue" as const,
    label: "Under Review",
    tags: [
      { label: "API", color: "blue" as const },
      { label: "Dev", color: "gray" as const },
    ],
  },
  {
    id: "mobile-app",
    title: "Mobile App",
    desc: "A native app for iOS and Android would be great.",
    votes: 98,
    color: "green" as const,
    label: "Planned",
    tags: [{ label: "Mobile", color: "orange" as const }],
  },
  {
    id: "csv-export",
    title: "CSV Export",
    desc: "Need to export feedback data for reporting.",
    votes: 76,
    color: "purple" as const,
    label: "Done",
    tags: [{ label: "Data", color: "yellow" as const }],
  },
] as const;

// =============================================================================
// Roadmap data
// =============================================================================

const ROADMAP_COLUMNS = [
  {
    id: "planned",
    title: "Planned",
    color: "green" as const,
    items: [
      { id: "r1", title: "Dark mode support", votes: 248 },
      { id: "r2", title: "Mobile app", votes: 98 },
    ],
  },
  {
    id: "in-progress",
    title: "In Progress",
    color: "orange" as const,
    items: [
      { id: "r3", title: "Slack Integration", votes: 186 },
      { id: "r4", title: "Webhook events", votes: 64 },
    ],
  },
  {
    id: "done",
    title: "Done",
    color: "purple" as const,
    items: [
      { id: "r5", title: "CSV Export", votes: 76 },
      { id: "r6", title: "Email digest", votes: 52 },
    ],
  },
] as const;

// =============================================================================
// Changelog data
// =============================================================================

const CHANGELOG_ENTRIES = [
  {
    id: "c1",
    version: "v2.4.0",
    date: "Feb 18, 2026",
    title: "Public API & Webhook Support",
    items: ["REST API with full CRUD", "Webhook events for status changes"],
    color: "blue" as const,
  },
  {
    id: "c2",
    version: "v2.3.0",
    date: "Feb 4, 2026",
    title: "AI-Powered Triage",
    items: ["Auto-categorize feedback with AI", "Duplicate detection & merge"],
    color: "purple" as const,
  },
  {
    id: "c3",
    version: "v2.2.0",
    date: "Jan 20, 2026",
    title: "Embeddable Widget SDK",
    items: [
      "Drop-in feedback widget for any app",
      "Customizable themes & triggers",
    ],
    color: "green" as const,
  },
] as const;

// =============================================================================
// Hero component
// =============================================================================

export default function Hero() {
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-start px-4 py-10 text-left sm:px-6 sm:py-20 lg:px-8">
      {/* Announcement Pill */}
      <a
        className="group mb-6 inline-flex cursor-pointer flex-wrap items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1 transition-colors hover:bg-muted sm:mb-8 sm:gap-2"
        href="https://github.com/damien-schneider/reflet"
        rel="noopener noreferrer"
        target="_blank"
      >
        <span className="font-medium text-foreground text-xs sm:text-sm">
          Reflet is now Open Source
        </span>
        <span className="hidden text-muted-foreground sm:inline">|</span>
        <span className="flex items-center font-medium text-muted-foreground text-xs group-hover:text-foreground sm:text-sm">
          Star on GitHub <CaretRight className="ml-1" size={14} />
        </span>
      </a>

      {/* Headings */}
      <H1 className="mb-4 w-full sm:mb-6 sm:w-2/3" variant="hero">
        A modern product feedback and roadmap platform.
      </H1>

      <Lead className="mb-8 max-w-2xl sm:mb-10">
        Collect feedback, prioritize features, and keep your users in the loop
        with a real-time collaborative board. Changes appear across all devices
        in milliseconds.
      </Lead>

      {/* Buttons */}
      <div className="mb-12 flex flex-col items-center gap-4 sm:mb-20 sm:flex-row">
        <Link href="/dashboard">
          <Button
            className="w-full rounded-full sm:w-auto"
            size="lg"
            variant="default"
          >
            Start free trial
          </Button>
        </Link>
        <button
          className="flex w-full items-center justify-center font-medium text-foreground transition-opacity hover:opacity-70 sm:w-auto sm:justify-start"
          onClick={() => {
            const element = document.getElementById("demo");
            if (element) {
              element.scrollIntoView({ behavior: "smooth" });
            }
          }}
          type="button"
        >
          View Demo <ArrowRight className="ml-2" size={18} />
        </button>
      </div>

      {/* Interactive Dashboard Mockup */}
      <InteractiveMockup />
    </section>
  );
}

// =============================================================================
// Interactive Mockup with tab switching
// =============================================================================

function InteractiveMockup() {
  const [activeTab, setActiveTab] = useState<TabId>("feedback");

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-muted p-2 shadow-2xl sm:rounded-3xl sm:p-3 md:p-6">
      <div className="mx-auto flex max-w-[1200px] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg sm:rounded-xl">
        {/* Top navigation bar with tabs */}
        <div className="flex items-center justify-between border-border border-b bg-muted/30 px-4 py-2 sm:px-6 sm:py-3">
          {/* App name */}
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-olive-600 font-bold text-[10px] text-olive-100">
              R
            </div>
            <span className="hidden font-semibold text-sm sm:inline">
              Reflet App
            </span>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-0.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-xs transition-colors sm:px-4",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground/70"
                  )}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                >
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-md bg-card shadow-sm"
                      layoutId="hero-tab-bg"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon size={14} weight={isActive ? "fill" : "regular"} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="hidden font-medium text-[10px] text-muted-foreground sm:inline">
              Live
            </span>
          </div>
        </div>

        {/* View content with animation */}
        <div className="relative h-[320px] overflow-hidden sm:h-[440px] md:h-[520px]">
          <AnimatePresence mode="wait">
            {activeTab === "feedback" && <FeedbackView key="feedback" />}
            {activeTab === "roadmap" && <RoadmapView key="roadmap" />}
            {activeTab === "changelog" && <ChangelogView key="changelog" />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Feedback Board View
// =============================================================================

function FeedbackView() {
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
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full"
      exit={{ opacity: 0, y: -8 }}
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* Feedback list */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-between border-border border-b px-4 py-2.5 sm:px-6">
          <span className="font-semibold text-foreground text-sm">
            Feature Requests
          </span>
          <div className="flex gap-2 text-xs">
            <span className="font-medium text-foreground">Top</span>
            <span className="text-muted-foreground">New</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {FEEDBACK_ITEMS.map((item) => (
            <div
              className="flex items-start gap-3 border-border border-b px-4 py-3 transition-colors hover:bg-muted/20 sm:px-6"
              key={item.id}
            >
              <button
                className={cn(
                  "mt-0.5 flex h-11 w-9 shrink-0 flex-col items-center justify-center rounded-lg border transition-all",
                  votedIds.has(item.id)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                )}
                onClick={() => toggleVote(item.id)}
                type="button"
              >
                <ArrowUp size={12} weight="bold" />
                <span className="font-bold text-[10px] leading-none">
                  {votedIds.has(item.id) ? item.votes + 1 : item.votes}
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <p className="mb-1 font-semibold text-foreground text-sm">
                  {item.title}
                </p>
                <p className="mb-2 line-clamp-1 text-muted-foreground text-xs">
                  {item.desc}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge color={item.color}>{item.label}</Badge>
                  {item.tags.map((tag) => (
                    <Badge color={tag.color} key={tag.label}>
                      {tag.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail sidebar - hidden on small screens */}
      <div className="hidden w-[340px] flex-col border-border border-l lg:flex">
        <div className="border-border border-b p-5">
          <div className="mb-3 flex items-center gap-2">
            <Badge color="green">Planned</Badge>
            <span className="text-muted-foreground text-xs">Oct 24, 2024</span>
          </div>
          <h3 className="mb-1 font-semibold text-base text-foreground">
            Dark mode support
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-olive-600/20 font-bold text-[10px] text-olive-600">
              A
            </div>
            <span className="text-muted-foreground text-xs">
              by{" "}
              <span className="font-medium text-foreground">Alex Morgan</span>
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <span className="mb-2 block font-medium text-muted-foreground text-xs">
              AI Analysis
            </span>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
              <Sparkle className="text-primary" size={14} weight="fill" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground text-xs">
                    Confidence
                  </span>
                  <span className="font-mono font-semibold text-primary text-xs">
                    94%
                  </span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[94%] rounded-full bg-primary" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <span className="mb-2 block font-medium text-muted-foreground text-xs">
              Tags
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Badge color="purple">UX</Badge>
              <Badge color="pink">Design</Badge>
              <Badge color="blue">Accessibility</Badge>
            </div>
          </div>

          {/* Activity */}
          <div>
            <span className="mb-2 block font-medium text-muted-foreground text-xs">
              Activity
            </span>
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 font-bold text-[8px] text-violet-600">
                  TM
                </div>
                <div>
                  <p className="text-foreground text-xs">
                    <span className="font-semibold">Team</span>{" "}
                    <span className="text-muted-foreground">
                      added to roadmap
                    </span>
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    2h ago
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 font-bold text-[8px] text-sky-600">
                  S
                </div>
                <div>
                  <p className="text-foreground text-xs">
                    <span className="font-semibold">Sarah</span>{" "}
                    <span className="text-muted-foreground">
                      +1 system sync!
                    </span>
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    1h ago
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Roadmap Kanban View
// =============================================================================

function RoadmapView() {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full gap-4 overflow-x-auto p-4 sm:p-6"
      exit={{ opacity: 0, y: -8 }}
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {ROADMAP_COLUMNS.map((col, colIdx) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex w-[260px] shrink-0 flex-col sm:w-[288px]"
          initial={{ opacity: 0, y: 12 }}
          key={col.id}
          transition={{ delay: colIdx * 0.08, duration: 0.3 }}
        >
          {/* Column header */}
          <div className="mb-3 flex items-center gap-2">
            <Badge color={col.color}>{col.title}</Badge>
            <span className="font-medium text-muted-foreground text-xs">
              {col.items.length}
            </span>
          </div>

          {/* Cards */}
          <div className="flex flex-1 flex-col gap-2">
            {col.items.map((item, idx) => (
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                className="cursor-grab rounded-xl border border-border bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
                initial={{ opacity: 0, scale: 0.96 }}
                key={item.id}
                transition={{
                  delay: colIdx * 0.08 + idx * 0.05,
                  duration: 0.3,
                }}
              >
                <p className="mb-2 font-medium text-foreground text-sm">
                  {item.title}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <ArrowUp size={10} />
                    <span className="font-medium text-xs">{item.votes}</span>
                  </div>
                  <div className="flex -space-x-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-violet-500 font-bold text-[7px] text-white">
                      S
                    </div>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-sky-500 font-bold text-[7px] text-white">
                      M
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Add card placeholder */}
            <div className="flex items-center justify-center rounded-xl border border-border border-dashed py-3 text-muted-foreground/50 transition-colors hover:border-primary/30 hover:text-primary/50">
              <span className="text-xs">+ Add item</span>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// =============================================================================
// Changelog View
// =============================================================================

function ChangelogView() {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="h-full overflow-y-auto p-4 sm:p-6"
      exit={{ opacity: 0, y: -8 }}
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="mx-auto max-w-2xl space-y-6">
        {CHANGELOG_ENTRIES.map((entry, idx) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="relative"
            initial={{ opacity: 0, y: 12 }}
            key={entry.id}
            transition={{ delay: idx * 0.1, duration: 0.3 }}
          >
            {/* Timeline connector */}
            {idx < CHANGELOG_ENTRIES.length - 1 && (
              <div className="absolute top-10 left-[18px] h-[calc(100%+8px)] w-px bg-border" />
            )}

            <div className="flex gap-4">
              {/* Version dot */}
              <div className="relative z-10 mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-sm">
                <MegaphoneSimple className="text-primary" size={16} />
              </div>

              <div className="flex-1 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge color={entry.color}>{entry.version}</Badge>
                  <span className="flex items-center gap-1 text-muted-foreground text-xs">
                    <CalendarBlank size={10} />
                    {entry.date}
                  </span>
                </div>
                <h4 className="mb-2 font-semibold text-foreground text-sm">
                  {entry.title}
                </h4>
                <ul className="space-y-1">
                  {entry.items.map((item) => (
                    <li
                      className="flex items-center gap-2 text-muted-foreground text-xs"
                      key={item}
                    >
                      <div className="h-1 w-1 shrink-0 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
