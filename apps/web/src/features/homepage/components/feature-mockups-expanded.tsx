"use client";

/*
 * Shared feature mini-UI mockups.
 * Used on both /features and the landing page bento grid.
 */

import {
  ChatCircleDots,
  Code,
  GithubLogo,
  GitMerge,
  Lightning,
  Sparkle,
  Tag,
} from "@phosphor-icons/react";

import { TagBadge } from "@/components/tag-badge";

// ─── Expanded AI Mockup (for features page) ─────────────────────────────────

export function ExpandedAiMockup() {
  const aiAutoTags = [
    { color: "purple" as const, label: "UX" },
    { color: "blue" as const, label: "Productivity" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
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
            <button
              className="rounded-md bg-brand px-2 py-1 font-medium text-brand-foreground text-caption transition-colors hover:bg-brand/90"
              type="button"
            >
              Merge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Expanded Widget Mockup (with code snippet) ─────────────────────────────

const CODE_LINES = [
  { hl: true, text: "import { RefletProvider, FeedbackButton }" },
  { hl: true, text: "  from 'reflet-sdk/react'" },
  { hl: false, text: "" },
  { hl: false, text: "export function App() {" },
  { hl: false, text: "  return (" },
  { hl: true, text: '    <RefletProvider publicKey="pk_live_…a3f">' },
  { hl: true, text: "      <FeedbackButton />" },
  { hl: true, text: "    </RefletProvider>" },
  { hl: false, text: "  )" },
  { hl: false, text: "}" },
] as const;

export function ExpandedWidgetMockup() {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
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
            {CODE_LINES.map((line, i) => (
              <div
                className={line.hl ? "rounded bg-brand-subtle" : ""}
                key={`code-${i.toString()}`}
              >
                <span className="mr-4 inline-block w-4 select-none text-right text-caption text-muted-foreground/40">
                  {i + 1}
                </span>
                <span
                  className={line.hl ? "text-brand-text" : "text-foreground/80"}
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
        <div className="flex h-10 items-center gap-2 rounded-full bg-brand px-4 shadow-lg">
          <ChatCircleDots
            className="text-brand-foreground"
            size={16}
            weight="fill"
          />
          <span className="font-medium text-brand-foreground text-label">
            Feedback
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Expanded GitHub Sync Mockup ─────────────────────────────────────────────

export function ExpandedGithubMockup() {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
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

// ─── Expanded Realtime Mockup ────────────────────────────────────────────────

export function ExpandedRealtimeMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      <div className="flex items-center justify-between border-border border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative size-2">
            <div className="absolute inset-0 animate-ping rounded-full bg-success/60" />
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

// ─── Expanded API Mockup ─────────────────────────────────────────────────────

export function ExpandedApiMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border shadow-xl">
      <div className="bg-band p-5">
        <pre className="font-mono text-caption leading-6">
          <div className="mb-3 text-band-muted-foreground/70">
            # Feedback endpoints
          </div>
          <div>
            <span className="text-chart-1-text">GET </span>
            <span className="text-band-muted-foreground">/api/v1/feedback</span>
            <span className="ml-4 text-band-muted-foreground"># List all</span>
          </div>
          <div>
            <span className="text-chart-2-text">POST </span>
            <span className="text-band-muted-foreground">/api/v1/feedback</span>
            <span className="ml-4 text-band-muted-foreground"># Create</span>
          </div>
          <div>
            <span className="text-chart-3-text">PATCH</span>
            <span className="text-band-muted-foreground">
              {" "}
              /api/v1/feedback/:id
            </span>
            <span className="ml-2 text-band-muted-foreground"># Update</span>
          </div>
          <div className="mt-3 border-border border-t pt-3 text-band-muted-foreground/70">
            # Webhooks
          </div>
          <div>
            <span className="text-chart-4-text">HOOK </span>
            <span className="text-band-muted-foreground">feedback.created</span>
          </div>
          <div>
            <span className="text-chart-4-text">HOOK </span>
            <span className="text-band-muted-foreground">status.changed</span>
          </div>
          <div>
            <span className="text-chart-4-text">HOOK </span>
            <span className="text-band-muted-foreground">vote.added</span>
          </div>
        </pre>
      </div>
    </div>
  );
}

// ─── Expanded Integrations Mockup ────────────────────────────────────────────

export function ExpandedIntegrationsMockup() {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="divide-y divide-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-chart-4">
              <span className="font-bold text-background text-caption">S</span>
            </div>
            <div className="flex-1">
              <span className="block font-medium text-foreground text-label">
                Slack
              </span>
              <span className="text-caption text-muted-foreground">
                #feedback — New request: &quot;Add dark mode&quot;
              </span>
            </div>
            <TagBadge color="green">Connected</TagBadge>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-chart-2">
              <span className="font-bold text-background text-caption">D</span>
            </div>
            <div className="flex-1">
              <span className="block font-medium text-foreground text-label">
                Discord
              </span>
              <span className="text-caption text-muted-foreground">
                #updates — New vote on &quot;Dark mode support&quot;
              </span>
            </div>
            <TagBadge color="green">Connected</TagBadge>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand">
              <Lightning
                className="text-brand-foreground"
                size={13}
                weight="fill"
              />
            </div>
            <div className="flex-1">
              <span className="block font-medium text-foreground text-label">
                Webhooks
              </span>
              <span className="text-caption text-muted-foreground">
                POST https://api.your-app.com/hooks
              </span>
            </div>
            <TagBadge color="green">Active</TagBadge>
          </div>
        </div>
      </div>
    </div>
  );
}
