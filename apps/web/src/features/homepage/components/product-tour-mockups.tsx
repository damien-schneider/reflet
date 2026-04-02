import {
  ArrowUp,
  CaretUp,
  CheckCircle,
  Lightning,
} from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// =============================================================================
// Feedback Board Mockup
// =============================================================================

const FEEDBACK_ITEMS = [
  {
    id: "dark-mode",
    title: "Dark mode support",
    snippet:
      "Add a dark theme option across all pages and the embedded widget.",
    votes: 248,
    status: "Planned",
    statusBadgeColor: "green" as const,
    tags: [
      { label: "UI", color: "purple" as const },
      { label: "Enhancement", color: "blue" as const },
    ],
    author: "S",
    authorColor: "bg-violet-500 dark:bg-violet-600",
  },
  {
    id: "slack",
    title: "Slack notifications",
    snippet: "Get real-time alerts in Slack when new feedback is submitted.",
    votes: 186,
    status: "In Progress",
    statusBadgeColor: "orange" as const,
    tags: [{ label: "Integration", color: "green" as const }],
    author: "M",
    authorColor: "bg-sky-500 dark:bg-sky-600",
  },
  {
    id: "csv",
    title: "Bulk export to CSV",
    snippet: "Export filtered feedback data for analysis in spreadsheets.",
    votes: 142,
    status: "Under Review",
    statusBadgeColor: "blue" as const,
    tags: [
      { label: "Data", color: "yellow" as const },
      { label: "Export", color: "orange" as const },
    ],
    author: "A",
    authorColor: "bg-rose-500 dark:bg-rose-600",
  },
  {
    id: "mobile",
    title: "Mobile app",
    snippet: "Native iOS and Android app for managing feedback on the go.",
    votes: 98,
    status: "Open",
    statusBadgeColor: "gray" as const,
    tags: [{ label: "Mobile", color: "pink" as const }],
    author: "J",
    authorColor: "bg-emerald-500 dark:bg-emerald-600",
  },
] as const;

export function FeedbackBoardMockup() {
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
    id: "planned",
    title: "Planned",
    color: "bg-blue-500",
    items: [
      { id: "r-dark", title: "Dark mode", votes: 248 },
      { id: "r-email", title: "Email digests", votes: 76 },
      { id: "r-rate", title: "API rate limits", votes: 54 },
    ],
  },
  {
    id: "in-progress",
    title: "In Progress",
    color: "bg-amber-500",
    items: [
      { id: "r-slack", title: "Slack integration", votes: 186 },
      { id: "r-sso", title: "SSO (SAML)", votes: 112 },
    ],
  },
  {
    id: "completed",
    title: "Completed",
    color: "bg-emerald-500",
    items: [
      { id: "r-api", title: "Public API", votes: 203 },
      { id: "r-webhook", title: "Webhook events", votes: 167 },
    ],
  },
] as const;

export function RoadmapMockup() {
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

export function ChangelogMockup() {
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
