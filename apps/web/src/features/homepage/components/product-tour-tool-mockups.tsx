import {
  ChatCircleDots,
  Check,
  Code,
  GitMerge,
  Lightning,
  Sparkle,
  Tag,
} from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// =============================================================================
// Widget & SDK Mockup
// =============================================================================

const CODE_LINES = [
  { text: "import { FeedbackButton } from 'reflet-sdk/react'", color: "text" },
  { text: "", color: "" },
  { text: "export function App() {", color: "text" },
  { text: "  return (", color: "text" },
  {
    text: '    <RefletProvider publicKey="pk_live_...a3f">',
    color: "highlight",
  },
  { text: "      <FeedbackButton />", color: "highlight" },
  { text: "    </RefletProvider>", color: "highlight" },
  { text: "  )", color: "text" },
  { text: "}", color: "text" },
] as const;

export function WidgetMockup() {
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
  { id: "ux", label: "UX", color: "purple" as const },
  { id: "productivity", label: "Productivity", color: "blue" as const },
] as const;

export function AIFeaturesMockup() {
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
