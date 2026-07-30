"use client";

import {
  ArrowUp,
  CaretUp,
  ChatCircleDots,
  Check,
  CheckCircle,
  Code,
  GitMerge,
  Lightning,
  Sparkle,
  Tag,
} from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { H2, H3, Lead } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

interface FeatureSection {
  badge: string;
  description: string;
  id: string;
  mockup: React.ReactNode;
  reverse: boolean;
  title: string;
}

// =============================================================================
// Feedback Board Mockup
// =============================================================================

const FEEDBACK_ITEMS = [
  {
    author: "S",
    authorColor: "bg-violet-500 dark:bg-violet-600",
    id: "dark-mode",
    snippet:
      "Add a dark theme option across all pages and the embedded widget.",
    status: "Planned",
    statusBadgeColor: "green" as const,
    tags: [
      { color: "purple" as const, label: "UI" },
      { color: "blue" as const, label: "Enhancement" },
    ],
    title: "Dark mode support",
    votes: 248,
  },
  {
    author: "M",
    authorColor: "bg-sky-500 dark:bg-sky-600",
    id: "slack",
    snippet: "Get real-time alerts in Slack when new feedback is submitted.",
    status: "In Progress",
    statusBadgeColor: "orange" as const,
    tags: [{ color: "green" as const, label: "Integration" }],
    title: "Slack notifications",
    votes: 186,
  },
  {
    author: "A",
    authorColor: "bg-rose-500 dark:bg-rose-600",
    id: "csv",
    snippet: "Export filtered feedback data for analysis in spreadsheets.",
    status: "Under Review",
    statusBadgeColor: "blue" as const,
    tags: [
      { color: "yellow" as const, label: "Data" },
      { color: "orange" as const, label: "Export" },
    ],
    title: "Bulk export to CSV",
    votes: 142,
  },
  {
    author: "J",
    authorColor: "bg-emerald-500 dark:bg-emerald-600",
    id: "mobile",
    snippet: "Native iOS and Android app for managing feedback on the go.",
    status: "Open",
    statusBadgeColor: "gray" as const,
    tags: [{ color: "pink" as const, label: "Mobile" }],
    title: "Mobile app",
    votes: 98,
  },
] as const;

function FeedbackBoardMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_60px_-15px_rgba(45,59,66,0.12)]">
      {/* Header */}
      <div className="flex items-center justify-between border-border border-b px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="font-semibold text-foreground text-sm">
            Feedback Board
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground text-xs">
            4 items
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-border">
        {FEEDBACK_ITEMS.map((item) => (
          <div
            className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40"
            key={item.id}
          >
            {/* Vote button */}
            <div className="flex flex-col items-center gap-0.5 pt-0.5">
              <div className="flex h-9 w-9 flex-col items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                <CaretUp size={14} weight="bold" />
                <span className="font-semibold text-[10px] leading-none">
                  {item.votes}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-medium text-foreground text-sm">
                  {item.title}
                </span>
                <Badge color={item.statusBadgeColor}>{item.status}</Badge>
              </div>
              <p className="mb-1.5 truncate text-muted-foreground text-xs">
                {item.snippet}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {item.tags.map((tag) => (
                    <Badge color={tag.color} key={tag.label}>
                      {tag.label}
                    </Badge>
                  ))}
                </div>
                <div
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full font-bold text-[9px] text-white",
                    item.authorColor
                  )}
                >
                  {item.author}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Roadmap Kanban Mockup
// =============================================================================

const KANBAN_COLUMNS = [
  {
    color: "bg-blue-500",
    id: "planned",
    items: [
      { id: "r-dark", title: "Dark mode", votes: 248 },
      { id: "r-email", title: "Email digests", votes: 76 },
      { id: "r-rate", title: "API rate limits", votes: 54 },
    ],
    title: "Planned",
  },
  {
    color: "bg-amber-500",
    id: "in-progress",
    items: [
      { id: "r-slack", title: "Slack integration", votes: 186 },
      { id: "r-sso", title: "SSO (SAML)", votes: 112 },
    ],
    title: "In Progress",
  },
  {
    color: "bg-emerald-500",
    id: "completed",
    items: [
      { id: "r-api", title: "Public API", votes: 203 },
      { id: "r-webhook", title: "Webhook events", votes: 167 },
    ],
    title: "Completed",
  },
] as const;

function RoadmapMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_60px_-15px_rgba(45,59,66,0.12)]">
      {/* Header */}
      <div className="flex items-center justify-between border-border border-b px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="font-semibold text-foreground text-sm">
            Product Roadmap
          </span>
        </div>
        <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground text-xs">
          Q1 2026
        </span>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-3 gap-0 divide-x divide-border">
        {KANBAN_COLUMNS.map((column) => (
          <div className="p-3" key={column.id}>
            {/* Column header */}
            <div className="mb-3 flex items-center gap-2">
              <div className={cn("h-2 w-2 rounded-full", column.color)} />
              <span className="font-medium text-foreground text-xs">
                {column.title}
              </span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {column.items.length}
              </span>
            </div>

            {/* Column items */}
            <div className="space-y-2">
              {column.items.map((item) => (
                <div
                  className="rounded-lg border border-border bg-background p-2.5 transition-shadow hover:shadow-sm"
                  key={item.id}
                >
                  <span className="mb-1.5 block font-medium text-foreground text-xs">
                    {item.title}
                  </span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <ArrowUp size={10} weight="bold" />
                    <span className="text-[10px]">{item.votes}</span>
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

// =============================================================================
// Changelog Mockup
// =============================================================================

const LINKED_FEEDBACK = [
  { id: "cf-api", title: "Public REST API for feedback data", votes: 203 },
  { id: "cf-webhook", title: "Webhook events for status changes", votes: 167 },
] as const;

function ChangelogMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_60px_-15px_rgba(45,59,66,0.12)]">
      {/* Header */}
      <div className="flex items-center justify-between border-border border-b px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-primary" />
          <span className="font-semibold text-foreground text-sm">
            Changelog
          </span>
        </div>
        <span className="rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
          Latest Release
        </span>
      </div>

      {/* Entry */}
      <div className="p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="rounded-md bg-primary px-2 py-0.5 font-mono font-semibold text-primary-foreground text-xs">
            v2.4.0
          </span>
          <span className="text-muted-foreground text-xs">February 2026</span>
        </div>

        <p className="mb-2 font-semibold text-base text-foreground">
          Public API &amp; Webhook Support
        </p>
        <p className="mb-4 text-muted-foreground text-sm leading-relaxed">
          Ship integrations faster with our new REST API. Create feedback
          programmatically, query votes, and subscribe to real-time webhook
          events for status changes, new comments, and more.
        </p>

        {/* Linked feedback */}
        <div className="mb-4 rounded-lg border border-border bg-muted/50 p-3">
          <span className="mb-2 block font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
            Linked Feedback
          </span>
          <div className="space-y-2">
            {LINKED_FEEDBACK.map((item) => (
              <div className="flex items-center gap-2" key={item.id}>
                <CheckCircle
                  className="shrink-0 text-emerald-500"
                  size={14}
                  weight="fill"
                />
                <span className="flex-1 text-foreground text-xs">
                  {item.title}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {item.votes} votes
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Notify badge */}
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2">
          <Lightning className="text-primary" size={14} weight="fill" />
          <span className="font-medium text-primary text-xs">
            142 subscribers notified
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Widget & SDK Mockup
// =============================================================================

const CODE_LINES = [
  { color: "text", text: "import { FeedbackButton } from 'reflet-sdk/react'" },
  { color: "", text: "" },
  { color: "text", text: "export function App() {" },
  { color: "text", text: "  return (" },
  {
    color: "highlight",
    text: '    <RefletProvider publicKey="pk_live_...a3f">',
  },
  { color: "highlight", text: "      <FeedbackButton />" },
  { color: "highlight", text: "    </RefletProvider>" },
  { color: "text", text: "  )" },
  { color: "text", text: "}" },
] as const;

function WidgetMockup() {
  return (
    <div className="space-y-4">
      {/* Code editor */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_60px_-15px_rgba(45,59,66,0.12)]">
        {/* Editor header */}
        <div className="flex items-center justify-between border-border border-b bg-muted/50 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
            </div>
            <span className="font-mono text-muted-foreground text-xs">
              app.tsx
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Code className="text-muted-foreground" size={14} />
            <span className="text-[10px] text-muted-foreground">
              TypeScript React
            </span>
          </div>
        </div>

        {/* Code content */}
        <div className="p-5">
          <pre className="font-mono text-xs leading-6">
            {CODE_LINES.map((line, index) => (
              <div
                className={cn(
                  "flex",
                  line.color === "highlight" && "rounded bg-primary/5"
                )}
                key={`line-${index.toString()}`}
              >
                <span className="mr-4 inline-block w-4 select-none text-right text-muted-foreground/50">
                  {index + 1}
                </span>
                <span
                  className={cn(
                    line.color === "highlight"
                      ? "text-primary"
                      : "text-foreground"
                  )}
                >
                  {line.text}
                </span>
              </div>
            ))}
          </pre>
        </div>
      </div>

      {/* Widget preview */}
      <div className="flex items-center justify-end gap-3 pr-2">
        <span className="text-muted-foreground text-xs">
          Widget preview &rarr;
        </span>
        <div className="flex h-11 items-center gap-2 rounded-full bg-primary px-4 shadow-lg">
          <ChatCircleDots
            className="text-primary-foreground"
            size={18}
            weight="fill"
          />
          <span className="font-medium text-primary-foreground text-sm">
            Feedback
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// AI Features Mockup
// =============================================================================

const AI_TAGS = [
  { color: "purple" as const, id: "ux", label: "UX" },
  { color: "blue" as const, id: "productivity", label: "Productivity" },
] as const;

function AIFeaturesMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_60px_-15px_rgba(45,59,66,0.12)]">
      {/* Header */}
      <div className="flex items-center justify-between border-border border-b px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <Sparkle className="text-primary" size={16} weight="fill" />
          <span className="font-semibold text-foreground text-sm">
            AI Analysis
          </span>
        </div>
        <Badge color="green">AI Confidence: 94%</Badge>
      </div>

      {/* Feedback title */}
      <div className="border-border border-b px-5 py-3.5">
        <span className="mb-1 block text-[10px] text-muted-foreground uppercase tracking-wider">
          Analyzing Feedback
        </span>
        <span className="font-medium text-foreground text-sm">
          Add keyboard shortcuts
        </span>
      </div>

      {/* Analysis results */}
      <div className="divide-y divide-border">
        {/* Tags */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Tag className="text-muted-foreground" size={14} />
            <span className="text-muted-foreground text-xs">Auto-tags</span>
          </div>
          <div className="flex items-center gap-1.5">
            {AI_TAGS.map((tag) => (
              <Badge color={tag.color} key={tag.id}>
                <Sparkle data-icon="inline-start" size={10} weight="fill" />
                {tag.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Lightning className="text-muted-foreground" size={14} />
            <span className="text-muted-foreground text-xs">Priority</span>
          </div>
          <Badge color="orange">Medium</Badge>
        </div>

        {/* Complexity */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Code className="text-muted-foreground" size={14} />
            <span className="text-muted-foreground text-xs">Complexity</span>
          </div>
          <span className="font-medium text-foreground text-xs">
            Simple &middot; ~2 hours
          </span>
        </div>

        {/* Duplicate detection */}
        <div className="px-5 py-3">
          <div className="mb-2.5 flex items-center gap-2">
            <Check className="text-muted-foreground" size={14} />
            <span className="text-muted-foreground text-xs">
              Duplicate Detection
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Badge color="yellow">87% match</Badge>
              <span className="text-foreground text-xs">
                Vim keybindings support
              </span>
            </div>
            <button
              className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 font-medium text-[10px] text-primary-foreground transition-colors hover:bg-primary/90"
              type="button"
            >
              <GitMerge size={10} />
              Merge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Feature Block Layout
// =============================================================================

interface FeatureBlockProps {
  badge: string;
  description: string;
  mockup: React.ReactNode;
  reverse: boolean;
  title: string;
}

function FeatureBlock({
  badge,
  title,
  description,
  mockup,
  reverse,
}: FeatureBlockProps) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
      <div className={reverse ? "lg:order-2" : ""}>
        <span className="mb-4 inline-block rounded-full bg-primary/10 px-3.5 py-1 font-semibold text-primary text-xs uppercase tracking-wide">
          {badge}
        </span>
        <H3 className="mb-4">{title}</H3>
        <p className="max-w-lg text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>
      <div className={reverse ? "lg:order-1" : ""}>
        <div className="relative">
          {/* Ambient glow */}
          <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-primary/[0.03] blur-2xl" />
          <div className="relative">{mockup}</div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sections Data
// =============================================================================

const SECTIONS: FeatureSection[] = [
  {
    badge: "Feedback Collection",
    description:
      "Users submit ideas and vote on what matters most. AI auto-tags, estimates complexity, and detects duplicates so your team focuses on what counts.",
    id: "feedback-board",
    mockup: <FeedbackBoardMockup />,
    reverse: false,
    title: "Every feature request, organized and prioritized",
  },
  {
    badge: "Visual Roadmap",
    description:
      "Drag-and-drop kanban board with custom statuses. Share publicly to build trust, or keep internal for planning.",
    id: "roadmap",
    mockup: <RoadmapMockup />,
    reverse: true,
    title: "A roadmap your team and users can actually follow",
  },
  {
    badge: "Changelog",
    description:
      "Publish beautiful release notes linked to the feedback that inspired them. Users get notified when their request ships.",
    id: "changelog",
    mockup: <ChangelogMockup />,
    reverse: false,
    title: "Close the loop with every release",
  },
  {
    badge: "Developer Experience",
    description:
      "Drop-in widget via script tag, or go deep with React hooks. TypeScript-first SDK with useFeedbackList(), useVote(), and more.",
    id: "widget-sdk",
    mockup: <WidgetMockup />,
    reverse: true,
    title: "Embed feedback anywhere with one line of code",
  },
  {
    badge: "AI-Powered",
    description:
      "Automatic tagging, priority estimation, complexity scoring, and duplicate detection. Your team triages in minutes, not hours.",
    id: "ai-features",
    mockup: <AIFeaturesMockup />,
    reverse: false,
    title: "Let AI handle the busywork",
  },
];

// =============================================================================
// Main Component
// =============================================================================

export default function ProductTour() {
  return (
    <section className="relative overflow-hidden bg-background px-4 py-32 sm:px-6 lg:px-8">
      {/* Ambient background blurs */}
      <div className="pointer-events-none absolute top-0 left-1/4 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/[0.02] blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-[500px] w-[500px] rounded-full bg-primary/[0.03] blur-3xl" />

      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="mb-24 text-center">
          <span className="mb-4 inline-block font-semibold text-muted-foreground text-sm uppercase tracking-wide">
            Product Tour
          </span>
          <H2 variant="section">See how Reflet works</H2>
          <Lead className="mx-auto mt-4 max-w-2xl">
            From collecting feedback to shipping features your users actually
            want.
          </Lead>
        </div>

        {/* Feature blocks */}
        <div className="space-y-32">
          {SECTIONS.map((section) => (
            <FeatureBlock
              badge={section.badge}
              description={section.description}
              key={section.id}
              mockup={section.mockup}
              reverse={section.reverse}
              title={section.title}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
