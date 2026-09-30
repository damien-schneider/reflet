import {
  ChatCircleDots,
  Code,
  GithubLogo,
  GitMerge,
  Lightning,
  Sparkle,
  Tag,
} from "@phosphor-icons/react/dist/ssr";

import { TagBadge } from "@/components/tag-badge";

const MOCKUP_PANEL =
  "overflow-hidden rounded-[28px] border border-(--marketing-edge) bg-card shadow-(--marketing-float-shadow)";

export function ExpandedAiMockup() {
  const aiAutoTags = [
    { color: "purple" as const, label: "UX" },
    { color: "blue" as const, label: "Productivity" },
  ];

  return (
    <div className={MOCKUP_PANEL}>
      <div className="flex items-center justify-between border-border border-b px-5 py-3">
        <div className="flex items-center gap-2">
          <Sparkle className="text-chart-4-text" size={15} weight="fill" />
          <span className="font-semibold text-foreground text-label">
            AI Analysis
          </span>
        </div>
        <TagBadge color="green">94% confidence</TagBadge>
      </div>
      <div className="border-border border-b px-5 py-3">
        <span className="mb-1 block text-caption text-muted-foreground uppercase tracking-wider">
          Analyzing
        </span>
        <span className="font-medium text-foreground text-label">
          Add keyboard shortcuts for power users
        </span>
      </div>
      <div className="divide-y divide-border">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Tag className="text-muted-foreground" size={13} />
            <span className="text-label text-muted-foreground">Auto-tags</span>
          </div>
          <div className="flex gap-1.5">
            {aiAutoTags.map((tag) => (
              <TagBadge color={tag.color} key={tag.label}>
                <Sparkle data-icon="inline-start" size={9} weight="fill" />
                {tag.label}
              </TagBadge>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Lightning className="text-muted-foreground" size={13} />
            <span className="text-label text-muted-foreground">Priority</span>
          </div>
          <TagBadge color="orange">Medium</TagBadge>
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Code className="text-muted-foreground" size={13} />
            <span className="text-label text-muted-foreground">Complexity</span>
          </div>
          <span className="font-medium text-foreground text-label">
            Simple · ~2h
          </span>
        </div>
        <div className="px-5 py-3">
          <div className="mb-2 flex items-center gap-2">
            <GitMerge className="text-muted-foreground" size={13} />
            <span className="text-label text-muted-foreground">
              Duplicate detected
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted px-3 py-2">
            <div className="flex items-center gap-2">
              <TagBadge color="yellow">87% match</TagBadge>
              <span className="text-foreground text-label">
                Vim keybindings support
              </span>
            </div>
            <span className="rounded-md bg-(--marketing-action-background) px-2 py-1 font-medium text-(--marketing-action-foreground) text-caption">
              Merge
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

const CODE_LINES = [
  { hl: true, number: 1, text: "import {" },
  { hl: true, number: 2, text: "  RefletProvider," },
  { hl: true, number: 3, text: "  FeedbackButton," },
  { hl: true, number: 4, text: "} from 'reflet-sdk/react'" },
  { hl: false, number: 5, text: "" },
  { hl: false, number: 6, text: "export function App() {" },
  { hl: false, number: 7, text: "  return (" },
  { hl: true, number: 8, text: "    <RefletProvider" },
  { hl: true, number: 9, text: '      publicKey="fb_pub_…"' },
  { hl: true, number: 10, text: "    >" },
  { hl: true, number: 11, text: "      <FeedbackButton />" },
  { hl: true, number: 12, text: "    </RefletProvider>" },
  { hl: false, number: 13, text: "  )" },
  { hl: false, number: 14, text: "}" },
] as const;

export function ExpandedWidgetMockup() {
  return (
    <div className="space-y-4">
      <div className={MOCKUP_PANEL}>
        <div className="flex items-center gap-3 border-border border-b bg-muted px-4 py-2.5">
          <div className="flex gap-1.5">
            <div className="size-2.5 rounded-full bg-destructive/60" />
            <div className="size-2.5 rounded-full bg-warning/60" />
            <div className="size-2.5 rounded-full bg-success/60" />
          </div>
          <span className="font-mono text-caption text-muted-foreground">
            app.tsx
          </span>
        </div>
        <div className="p-4">
          <pre className="font-mono text-label leading-6">
            {CODE_LINES.map((line) => (
              <div
                className={
                  line.hl ? "rounded bg-(--marketing-signal-soft)" : ""
                }
                key={line.number}
              >
                <span className="me-4 inline-block w-4 select-none text-end text-caption text-muted-foreground/60 tabular-nums">
                  {line.number}
                </span>
                <span
                  className={
                    line.hl ? "text-(--marketing-signal)" : "text-foreground/80"
                  }
                >
                  {line.text}
                </span>
              </div>
            ))}
          </pre>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 pr-2">
        <span className="text-label text-muted-foreground">Result →</span>
        <div className="flex h-10 items-center gap-2 rounded-full bg-(--marketing-action-background) px-4 shadow-(--marketing-action-shadow)">
          <ChatCircleDots
            className="text-(--marketing-action-foreground)"
            size={16}
            weight="fill"
          />
          <span className="font-medium text-(--marketing-action-foreground) text-label">
            Feedback
          </span>
        </div>
      </div>
    </div>
  );
}

export function ExpandedGithubMockup() {
  return (
    <div className="space-y-3">
      <div className={MOCKUP_PANEL}>
        <div className="flex items-center gap-2 border-border border-b px-4 py-3">
          <GithubLogo className="text-foreground" size={15} weight="fill" />
          <span className="font-semibold text-foreground text-label">
            GitHub Activity
          </span>
        </div>
        <div className="divide-y divide-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-chart-4/15">
              <Code className="text-chart-4-text" size={12} />
            </div>
            <div>
              <span className="block font-medium text-foreground text-label">
                Issue #87 created
              </span>
              <span className="text-caption text-muted-foreground">
                Linked to &quot;Add dark mode support&quot;
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-warning-subtle">
              <GitMerge className="text-warning-text" size={12} />
            </div>
            <div>
              <span className="block font-medium text-foreground text-label">
                PR #142 merged
              </span>
              <span className="text-caption text-muted-foreground">
                feat: add dark mode support
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-success-subtle px-4 py-3">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success-subtle">
              <span className="font-bold text-micro text-success-text">✓</span>
            </div>
            <div>
              <span className="block font-medium text-label text-success-text">
                Status → Shipped
              </span>
              <span className="text-caption text-success-text/70">
                Changelog v2.4.0 auto-generated · 3 voters notified
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ExpandedRealtimeMockup() {
  return (
    <div className={MOCKUP_PANEL}>
      <div className="flex items-center justify-between border-border border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative size-2">
            <div className="absolute inset-0 rounded-full bg-success/60 motion-safe:animate-ping" />
            <div className="relative size-2 rounded-full bg-success" />
          </div>
          <span className="font-semibold text-label text-success-text">
            Live Activity
          </span>
        </div>
        <div className="flex -space-x-1.5">
          <div className="size-6 rounded-full border-2 border-card bg-chart-4" />
          <div className="size-6 rounded-full border-2 border-card bg-chart-2" />
          <div className="size-6 rounded-full border-2 border-card bg-chart-5" />
          <div className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-border">
            <span className="font-medium text-micro text-muted-foreground">
              +4
            </span>
          </div>
        </div>
      </div>
      <div className="divide-y divide-border">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="size-5 rounded-full bg-chart-4" />
          <span className="flex-1 text-foreground text-label">
            Sarah voted on &quot;Dark mode&quot;
          </span>
          <span className="text-caption text-muted-foreground">just now</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="size-5 rounded-full bg-chart-2" />
          <span className="flex-1 text-foreground text-label">
            Mike commented on &quot;API rate limits&quot;
          </span>
          <span className="text-caption text-muted-foreground">2s ago</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="size-5 rounded-full bg-chart-5" />
          <span className="flex-1 text-foreground text-label">
            Priya moved &quot;SSO&quot; to In Progress
          </span>
          <span className="text-caption text-muted-foreground">5s ago</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 opacity-60">
          <div className="size-5 rounded-full bg-warning" />
          <span className="flex-1 text-foreground text-label">
            Alex submitted new feedback
          </span>
          <span className="text-caption text-muted-foreground">12s ago</span>
        </div>
      </div>
    </div>
  );
}

const API_ENDPOINTS = [
  {
    method: "GET",
    note: "List all",
    path: "/api/v1/feedback",
    tone: "text-chart-1-text",
  },
  {
    method: "POST",
    note: "Create",
    path: "/api/v1/feedback",
    tone: "text-chart-2-text",
  },
  {
    method: "PATCH",
    note: "Update",
    path: "/api/v1/feedback/:id",
    tone: "text-chart-3-text",
  },
] as const;

const WEBHOOK_EVENTS = [
  "feedback.created",
  "status.changed",
  "vote.added",
] as const;

export function ExpandedApiMockup() {
  return (
    <div className={MOCKUP_PANEL}>
      <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 p-6 font-mono text-label leading-8">
        <span className="col-span-3 text-muted-foreground">
          # Feedback endpoints
        </span>
        {API_ENDPOINTS.map((endpoint) => (
          <div className="contents" key={endpoint.method}>
            <span className={endpoint.tone}>{endpoint.method}</span>
            <span className="truncate text-foreground">{endpoint.path}</span>
            <span className="text-muted-foreground"># {endpoint.note}</span>
          </div>
        ))}
        <span className="col-span-3 mt-3 border-(--marketing-hairline) border-t pt-3 text-muted-foreground">
          # Webhooks
        </span>
        {WEBHOOK_EVENTS.map((event) => (
          <div className="contents" key={event}>
            <span className="text-chart-4-text">HOOK</span>
            <span className="col-span-2 text-foreground">{event}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
