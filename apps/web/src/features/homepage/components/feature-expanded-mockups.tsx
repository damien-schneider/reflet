"use client";

/*
 * Expanded feature mockup components for the /features page.
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

import { Badge } from "@/components/ui/badge";

// ─── Expanded AI Mockup ─────────────────────────────────────────────────────

export function ExpandedAiMockup() {
  const aiAutoTags = [
    { label: "UX", color: "purple" as const },
    { label: "Productivity", color: "blue" as const },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8e6e1] bg-[#faf9f7] shadow-[0_20px_50px_-12px_rgba(45,59,66,0.1)] dark:border-[#ffffff0d] dark:bg-[#1e1d1a]">
      <div className="flex items-center justify-between border-[#e8e6e1] border-b px-5 py-3 dark:border-[#ffffff0d]">
        <div className="flex items-center gap-2">
          <Sparkle className="text-violet-500" size={15} weight="fill" />
          <span className="font-semibold text-[13px] text-foreground">
            AI Analysis
          </span>
        </div>
        <Badge color="green">94% confidence</Badge>
      </div>
      <div className="border-[#e8e6e1] border-b px-5 py-3 dark:border-[#ffffff0d]">
        <span className="mb-1 block text-[10px] text-muted-foreground uppercase tracking-wider">
          Analyzing
        </span>
        <span className="font-medium text-[13px] text-foreground">
          Add keyboard shortcuts for power users
        </span>
      </div>
      <div className="divide-y divide-[#e8e6e1] dark:divide-[#ffffff0d]">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Tag className="text-muted-foreground" size={13} />
            <span className="text-[12px] text-muted-foreground">Auto-tags</span>
          </div>
          <div className="flex gap-1.5">
            {aiAutoTags.map((tag) => (
              <Badge color={tag.color} key={tag.label}>
                <Sparkle data-icon="inline-start" size={9} weight="fill" />
                {tag.label}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Lightning className="text-muted-foreground" size={13} />
            <span className="text-[12px] text-muted-foreground">Priority</span>
          </div>
          <Badge color="orange">Medium</Badge>
        </div>
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <Code className="text-muted-foreground" size={13} />
            <span className="text-[12px] text-muted-foreground">
              Complexity
            </span>
          </div>
          <span className="font-medium text-[12px] text-foreground">
            Simple · ~2h
          </span>
        </div>
        <div className="px-5 py-3">
          <div className="mb-2 flex items-center gap-2">
            <GitMerge className="text-muted-foreground" size={13} />
            <span className="text-[12px] text-muted-foreground">
              Duplicate detected
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[#e8e6e1] bg-[#f0efea]/50 px-3 py-2 dark:border-[#ffffff0d] dark:bg-[#151412]">
            <div className="flex items-center gap-2">
              <Badge color="yellow">87% match</Badge>
              <span className="text-[12px] text-foreground">
                Vim keybindings support
              </span>
            </div>
            <button
              className="rounded-md bg-olive-600 px-2 py-1 font-medium text-[10px] text-white transition-colors hover:bg-olive-700 dark:bg-olive-500"
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
  { text: "import { RefletProvider, FeedbackButton }", hl: true },
  { text: "  from 'reflet-sdk/react'", hl: true },
  { text: "", hl: false },
  { text: "export function App() {", hl: false },
  { text: "  return (", hl: false },
  { text: '    <RefletProvider publicKey="pk_live_…a3f">', hl: true },
  { text: "      <FeedbackButton />", hl: true },
  { text: "    </RefletProvider>", hl: true },
  { text: "  )", hl: false },
  { text: "}", hl: false },
] as const;

export function ExpandedWidgetMockup() {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-[#e8e6e1] bg-[#faf9f7] shadow-[0_20px_50px_-12px_rgba(45,59,66,0.1)] dark:border-[#ffffff0d] dark:bg-[#1e1d1a]">
        <div className="flex items-center gap-3 border-[#e8e6e1] border-b bg-[#f0efea] px-4 py-2.5 dark:border-[#ffffff0d] dark:bg-[#151412]">
          <div className="flex gap-1.5">
            <div className="size-2.5 rounded-full bg-[#ff5f57]/60" />
            <div className="size-2.5 rounded-full bg-[#febc2e]/60" />
            <div className="size-2.5 rounded-full bg-[#28c840]/60" />
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">
            app.tsx
          </span>
        </div>
        <div className="p-4">
          <pre className="font-mono text-[12px] leading-6">
            {CODE_LINES.map((line, i) => (
              <div
                className={
                  line.hl ? "rounded bg-olive-600/5 dark:bg-olive-400/5" : ""
                }
                key={`code-${i.toString()}`}
              >
                <span className="mr-4 inline-block w-4 select-none text-right text-[11px] text-muted-foreground/40">
                  {i + 1}
                </span>
                <span
                  className={
                    line.hl
                      ? "text-olive-700 dark:text-olive-300"
                      : "text-foreground/80"
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
        <span className="text-[13px] text-muted-foreground">Result →</span>
        <div className="flex h-10 items-center gap-2 rounded-full bg-olive-600 px-4 shadow-lg dark:bg-olive-500">
          <ChatCircleDots className="text-white" size={16} weight="fill" />
          <span className="font-medium text-[13px] text-white">Feedback</span>
        </div>
      </div>
    </div>
  );
}

// ─── Expanded GitHub Sync Mockup ─────────────────────────────────────────────

export function ExpandedGithubMockup() {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-[#e8e6e1] bg-[#faf9f7] shadow-[0_20px_50px_-12px_rgba(45,59,66,0.1)] dark:border-[#ffffff0d] dark:bg-[#1e1d1a]">
        <div className="flex items-center gap-2 border-[#e8e6e1] border-b px-4 py-3 dark:border-[#ffffff0d]">
          <GithubLogo className="text-foreground" size={15} weight="fill" />
          <span className="font-semibold text-[13px] text-foreground">
            GitHub Activity
          </span>
        </div>
        <div className="divide-y divide-[#e8e6e1] dark:divide-[#ffffff0d]">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-500/15">
              <Code
                className="text-violet-600 dark:text-violet-400"
                size={12}
              />
            </div>
            <div>
              <span className="block font-medium text-[12px] text-foreground">
                Issue #87 created
              </span>
              <span className="text-[10px] text-muted-foreground">
                Linked to &quot;Add dark mode support&quot;
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15">
              <GitMerge
                className="text-amber-600 dark:text-amber-400"
                size={12}
              />
            </div>
            <div>
              <span className="block font-medium text-[12px] text-foreground">
                PR #142 merged
              </span>
              <span className="text-[10px] text-muted-foreground">
                feat: add dark mode support
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-emerald-50/50 px-4 py-3 dark:bg-emerald-500/5">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
              <span className="font-bold text-[10px] text-emerald-600 dark:text-emerald-400">
                ✓
              </span>
            </div>
            <div>
              <span className="block font-medium text-[12px] text-emerald-700 dark:text-emerald-300">
                Status → Shipped
              </span>
              <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
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
    <div className="overflow-hidden rounded-2xl border border-[#e8e6e1] bg-[#faf9f7] shadow-[0_20px_50px_-12px_rgba(45,59,66,0.1)] dark:border-[#ffffff0d] dark:bg-[#1e1d1a]">
      <div className="flex items-center justify-between border-[#e8e6e1] border-b px-4 py-3 dark:border-[#ffffff0d]">
        <div className="flex items-center gap-2">
          <div className="relative size-2">
            <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
            <div className="relative size-2 rounded-full bg-emerald-500" />
          </div>
          <span className="font-semibold text-[13px] text-emerald-600 dark:text-emerald-400">
            Live Activity
          </span>
        </div>
        <div className="flex -space-x-1.5">
          <div className="size-6 rounded-full border-2 border-[#faf9f7] bg-violet-500 dark:border-[#1e1d1a]" />
          <div className="size-6 rounded-full border-2 border-[#faf9f7] bg-sky-500 dark:border-[#1e1d1a]" />
          <div className="size-6 rounded-full border-2 border-[#faf9f7] bg-rose-500 dark:border-[#1e1d1a]" />
          <div className="flex size-6 items-center justify-center rounded-full border-2 border-[#faf9f7] bg-[#e8e6e1] dark:border-[#1e1d1a] dark:bg-[#ffffff0d]">
            <span className="font-medium text-[8px] text-muted-foreground">
              +4
            </span>
          </div>
        </div>
      </div>
      <div className="divide-y divide-[#e8e6e1] dark:divide-[#ffffff0d]">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="size-5 rounded-full bg-violet-500" />
          <span className="flex-1 text-[12px] text-foreground">
            Sarah voted on &quot;Dark mode&quot;
          </span>
          <span className="text-[10px] text-muted-foreground">just now</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="size-5 rounded-full bg-sky-500" />
          <span className="flex-1 text-[12px] text-foreground">
            Mike commented on &quot;API rate limits&quot;
          </span>
          <span className="text-[10px] text-muted-foreground">2s ago</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="size-5 rounded-full bg-rose-500" />
          <span className="flex-1 text-[12px] text-foreground">
            Priya moved &quot;SSO&quot; to In Progress
          </span>
          <span className="text-[10px] text-muted-foreground">5s ago</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 opacity-60">
          <div className="size-5 rounded-full bg-amber-500" />
          <span className="flex-1 text-[12px] text-foreground">
            Alex submitted new feedback
          </span>
          <span className="text-[10px] text-muted-foreground">12s ago</span>
        </div>
      </div>
    </div>
  );
}

// ─── Expanded API Mockup ─────────────────────────────────────────────────────

export function ExpandedApiMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8e6e1] shadow-[0_20px_50px_-12px_rgba(45,59,66,0.1)] dark:border-[#ffffff0d]">
      <div className="bg-olive-950 p-5 dark:bg-[#0d0d0b]">
        <pre className="font-mono text-[11px] leading-6">
          <div className="mb-3 text-olive-400/50"># Feedback endpoints</div>
          <div>
            <span className="text-emerald-400">GET </span>
            <span className="text-olive-300/80">/api/v1/feedback</span>
            <span className="ml-4 text-olive-500"># List all</span>
          </div>
          <div>
            <span className="text-sky-400">POST </span>
            <span className="text-olive-300/80">/api/v1/feedback</span>
            <span className="ml-4 text-olive-500"># Create</span>
          </div>
          <div>
            <span className="text-amber-400">PATCH</span>
            <span className="text-olive-300/80"> /api/v1/feedback/:id</span>
            <span className="ml-2 text-olive-500"># Update</span>
          </div>
          <div className="mt-3 border-olive-700/30 border-t pt-3 text-olive-400/50">
            # Webhooks
          </div>
          <div>
            <span className="text-violet-400">HOOK </span>
            <span className="text-olive-300/80">feedback.created</span>
          </div>
          <div>
            <span className="text-violet-400">HOOK </span>
            <span className="text-olive-300/80">status.changed</span>
          </div>
          <div>
            <span className="text-violet-400">HOOK </span>
            <span className="text-olive-300/80">vote.added</span>
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
      <div className="overflow-hidden rounded-2xl border border-[#e8e6e1] bg-[#faf9f7] shadow-[0_20px_50px_-12px_rgba(45,59,66,0.1)] dark:border-[#ffffff0d] dark:bg-[#1e1d1a]">
        <div className="divide-y divide-[#e8e6e1] dark:divide-[#ffffff0d]">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#4A154B]">
              <span className="font-bold text-[11px] text-white">S</span>
            </div>
            <div className="flex-1">
              <span className="block font-medium text-[12px] text-foreground">
                Slack
              </span>
              <span className="text-[10px] text-muted-foreground">
                #feedback — New request: &quot;Add dark mode&quot;
              </span>
            </div>
            <Badge color="green">Connected</Badge>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#5865F2]">
              <span className="font-bold text-[11px] text-white">D</span>
            </div>
            <div className="flex-1">
              <span className="block font-medium text-[12px] text-foreground">
                Discord
              </span>
              <span className="text-[10px] text-muted-foreground">
                #updates — New vote on &quot;Dark mode support&quot;
              </span>
            </div>
            <Badge color="green">Connected</Badge>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-olive-600 dark:bg-olive-500">
              <Lightning className="text-white" size={13} weight="fill" />
            </div>
            <div className="flex-1">
              <span className="block font-medium text-[12px] text-foreground">
                Webhooks
              </span>
              <span className="text-[10px] text-muted-foreground">
                POST https://api.your-app.com/hooks
              </span>
            </div>
            <Badge color="green">Active</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
