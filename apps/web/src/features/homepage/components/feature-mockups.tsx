"use client";

/*
 * Shared feature mini-UI mockups.
 * Used on both /features and the landing page bento grid.
 */

import {
  ChatCircleDots,
  GithubLogo,
  GitMerge,
  Lightning,
  Sparkle,
} from "@phosphor-icons/react";
import type { JSX } from "react";

import {
  ExpandedAiMockup,
  ExpandedApiMockup,
  ExpandedGithubMockup,
  ExpandedIntegrationsMockup,
  ExpandedRealtimeMockup,
  ExpandedWidgetMockup,
} from "./feature-mockups-expanded";

// ─── Mini UI: AI Triage ──────────────────────────────────────────────────────

function MiniAiTriage() {
  return (
    <div className="space-y-2.5">
      <div className="rounded-lg border border-border bg-muted p-2.5">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Sparkle className="text-chart-4-text" size={10} weight="fill" />
          <span className="text-caption text-muted-foreground">Analyzing…</span>
        </div>
        <span className="font-medium text-caption text-foreground">
          &quot;Add keyboard shortcuts for power users&quot;
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        <span className="rounded-full bg-chart-4/15 px-2 py-0.5 font-medium text-caption text-chart-4-text">
          UX
        </span>
        <span className="rounded-full bg-chart-2/15 px-2 py-0.5 font-medium text-caption text-chart-2-text">
          Productivity
        </span>
        <span className="rounded-full bg-success-subtle px-2 py-0.5 font-medium text-caption text-success-text">
          Enhancement
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-12 text-caption text-muted-foreground">
          Priority
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
          <div className="h-full w-3/4 rounded-full bg-warning" />
        </div>
        <span className="font-medium text-caption text-warning-text">High</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-12 text-caption text-muted-foreground">Effort</span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
          <div className="h-full w-1/3 rounded-full bg-success" />
        </div>
        <span className="font-medium text-caption text-success-text">Low</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-md border border-warning/20 bg-warning-subtle p-2">
        <GitMerge className="shrink-0 text-warning-text" size={10} />
        <span className="text-caption text-warning-text">
          87% match — &quot;Vim keybindings&quot;
        </span>
      </div>
    </div>
  );
}

// ─── Mini UI: GitHub Sync ────────────────────────────────────────────────────

function MiniGithubSync() {
  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-border bg-muted p-2.5">
        <div className="mb-1 flex items-center gap-1.5">
          <GithubLogo className="text-foreground" size={11} weight="fill" />
          <span className="font-medium text-caption text-foreground">
            PR #142 merged
          </span>
        </div>
        <span className="text-caption text-muted-foreground">
          feat: add dark mode support
        </span>
      </div>
      <div className="flex justify-center">
        <div className="h-4 w-px bg-brand-subtle" />
      </div>
      <div className="rounded-lg border border-success/20 bg-success-subtle p-2.5">
        <div className="flex items-center gap-1.5">
          <div className="flex size-3.5 items-center justify-center rounded-full bg-success">
            <span className="text-micro text-success-foreground">✓</span>
          </div>
          <span className="font-medium text-caption text-success-text">
            Dark mode → Shipped
          </span>
        </div>
        <span className="mt-0.5 block text-caption text-success-text/70">
          Changelog v2.4.0 auto-generated
        </span>
      </div>
    </div>
  );
}

// ─── Mini UI: Widget ─────────────────────────────────────────────────────────

function MiniWidget() {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-1.5 border-border border-b bg-muted px-2.5 py-1.5">
        <div className="size-1.5 rounded-full bg-destructive/40" />
        <div className="size-1.5 rounded-full bg-warning/40" />
        <div className="size-1.5 rounded-full bg-success/40" />
        <div className="ml-1.5 h-3 flex-1 rounded bg-border" />
      </div>
      <div className="relative bg-muted p-4">
        <div className="space-y-2">
          <div className="h-1.5 w-3/4 rounded bg-border" />
          <div className="h-1.5 w-1/2 rounded bg-border" />
          <div className="h-1.5 w-2/3 rounded bg-border" />
          <div className="h-1.5 w-1/3 rounded bg-border" />
        </div>
        <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 shadow-lg">
          <ChatCircleDots
            className="text-brand-foreground"
            size={9}
            weight="fill"
          />
          <span className="font-medium text-brand-foreground text-caption">
            Feedback
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Mini UI: Real-time ──────────────────────────────────────────────────────

function MiniRealtime() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="relative size-1.5">
            <div className="absolute inset-0 animate-ping rounded-full bg-success/60" />
            <div className="relative size-1.5 rounded-full bg-success" />
          </div>
          <span className="font-medium text-caption text-success-text">
            Live
          </span>
        </div>
        <div className="flex -space-x-1">
          <div className="size-5 rounded-full border border-card bg-chart-4" />
          <div className="size-5 rounded-full border border-card bg-chart-2" />
          <div className="size-5 rounded-full border border-card bg-chart-5" />
        </div>
      </div>
      <div className="space-y-1.5 rounded-lg border border-border bg-muted p-2.5">
        <div className="flex items-center gap-1.5">
          <span className="size-1 rounded-full bg-chart-4" />
          <span className="text-caption text-muted-foreground">
            Sarah voted on &quot;Dark mode&quot;
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-1 rounded-full bg-chart-2" />
          <span className="text-caption text-muted-foreground">
            Mike added a comment
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-1 rounded-full bg-chart-5" />
          <span className="text-caption text-muted-foreground">
            Priya changed status
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Mini UI: API ────────────────────────────────────────────────────────────

function MiniApi() {
  return (
    <div className="overflow-hidden rounded-lg bg-band p-3">
      <pre className="font-mono text-caption leading-5">
        <div>
          <span className="text-chart-1-text">GET </span>
          <span className="text-band-muted-foreground">/api/feedback</span>
        </div>
        <div>
          <span className="text-chart-2-text">POST</span>
          <span className="text-band-muted-foreground"> /api/feedback</span>
        </div>
        <div>
          <span className="text-chart-3-text">PATCH</span>
          <span className="text-band-muted-foreground"> /api/feedback/:id</span>
        </div>
        <div className="mt-1.5 border-border border-t pt-1.5">
          <span className="text-chart-4-text">HOOK </span>
          <span className="text-band-muted-foreground">status.changed</span>
        </div>
      </pre>
    </div>
  );
}

// ─── Mini UI: Integrations ───────────────────────────────────────────────────

function MiniIntegrations() {
  return (
    <div className="grid gap-2.5 sm:grid-cols-3">
      <div className="rounded-lg border border-border bg-muted p-2.5">
        <div className="mb-1 flex items-center gap-1.5">
          <div className="flex size-4 items-center justify-center rounded bg-chart-4">
            <span className="font-bold text-background text-micro">S</span>
          </div>
          <span className="font-medium text-caption text-foreground">
            #feedback
          </span>
        </div>
        <span className="text-caption text-muted-foreground">
          New request: &quot;Add dark mode&quot;
        </span>
      </div>
      <div className="rounded-lg border border-border bg-muted p-2.5">
        <div className="mb-1 flex items-center gap-1.5">
          <div className="flex size-4 items-center justify-center rounded bg-chart-2">
            <span className="font-bold text-background text-micro">D</span>
          </div>
          <span className="font-medium text-caption text-foreground">
            #updates
          </span>
        </div>
        <span className="text-caption text-muted-foreground">
          New vote on &quot;Dark mode support&quot;
        </span>
      </div>
      <div className="rounded-lg border border-border bg-muted p-2.5">
        <div className="mb-1 flex items-center gap-1.5">
          <div className="flex size-4 items-center justify-center rounded bg-brand">
            <Lightning
              className="text-brand-foreground"
              size={7}
              weight="fill"
            />
          </div>
          <span className="font-medium text-caption text-foreground">
            Webhook
          </span>
        </div>
        <span className="text-caption text-muted-foreground">
          POST api.your-app.com/hooks
        </span>
      </div>
    </div>
  );
}

// ─── Compact mockups (for landing bento grid) ────────────────────────────────

export const COMPACT_MOCKUPS: Record<string, () => JSX.Element> = {
  ai: MiniAiTriage,
  api: MiniApi,
  github: MiniGithubSync,
  integrations: MiniIntegrations,
  realtime: MiniRealtime,
  widget: MiniWidget,
};

// ─── Expanded mockups (for /features page) ───────────────────────────────────

const EXPANDED_MOCKUPS: Record<string, () => JSX.Element> = {
  ai: ExpandedAiMockup,
  api: ExpandedApiMockup,
  github: ExpandedGithubMockup,
  integrations: ExpandedIntegrationsMockup,
  realtime: ExpandedRealtimeMockup,
  widget: ExpandedWidgetMockup,
};

// ─── Client wrapper for RSC pages ────────────────────────────────────────────

export function FeatureMockup({ id }: { id: string }) {
  const Mockup = EXPANDED_MOCKUPS[id];
  if (!Mockup) {
    return null;
  }
  return <Mockup />;
}
