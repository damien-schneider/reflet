"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconLoader2,
  IconPlayerPlay,
  IconRefresh,
  IconSearch,
  IconSparkles,
} from "@tabler/icons-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

import "@/components/ui/tiptap/styles.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { Muted } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { cn } from "@/lib/utils";

const LEVEL_ICONS = {
  info: IconInfoCircle,
  action: IconPlayerPlay,
  success: IconCheck,
  warning: IconAlertTriangle,
  error: IconAlertTriangle,
} as const;

const LEVEL_COLORS = {
  info: "text-muted-foreground",
  action: "text-blue-500",
  success: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-red-500",
} as const;

/**
 * Shows the live exploration progress as the agent explores the codebase.
 * Filters activity log entries to show only system/exploration entries.
 */
function ExplorationProgress({
  organizationId,
  analysisSince,
}: {
  organizationId: Id<"organizations">;
  analysisSince?: number;
}) {
  const activity = useQuery(api.autopilot.queries.activity.listActivity, {
    organizationId,
    limit: 30,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const activityCount = activity?.length ?? 0;

  useEffect(
    function syncExplorationScroll() {
      if (activityCount === 0) {
        return;
      }

      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    },
    [activityCount]
  );

  if (!activity || activity.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
        <IconLoader2 className="size-4 animate-spin" />
        <span>Starting exploration...</span>
      </div>
    );
  }

  // Only show entries from the current analysis run
  const cutoff = analysisSince ?? Date.now() - 5 * 60 * 1000;
  const explorationEntries = activity
    .filter((entry) => entry.agent === "system" && entry.createdAt >= cutoff)
    .reverse();

  if (explorationEntries.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
        <IconLoader2 className="size-4 animate-spin" />
        <span>Agent is exploring the codebase...</span>
      </div>
    );
  }

  return (
    <div className="max-h-64 space-y-2 overflow-y-auto pr-1" ref={scrollRef}>
      {explorationEntries.map((entry) => {
        const LevelIcon =
          LEVEL_ICONS[entry.level as keyof typeof LEVEL_ICONS] ??
          IconInfoCircle;
        const color =
          LEVEL_COLORS[entry.level as keyof typeof LEVEL_COLORS] ??
          "text-muted-foreground";

        return (
          <div className="flex items-start gap-2" key={entry._id}>
            <LevelIcon className={cn("mt-0.5 size-3.5 shrink-0", color)} />
            <div className="min-w-0 flex-1">
              <p className="text-foreground/80 text-xs leading-relaxed">
                {entry.message}
              </p>
              {entry.details && (
                <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground/50">
                  {entry.details}
                </p>
              )}
            </div>
            <span className="shrink-0 text-[10px] text-muted-foreground/40">
              {formatDistanceToNow(entry.createdAt, { addSuffix: true })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Read-only markdown preview of the product definition.
 * Uses Streamdown for nice rendering like the CEO chat.
 */
function ProductDefinitionPreview({ content }: { content: string }) {
  if (!content) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
        <div className="text-center">
          <IconSparkles className="mx-auto mb-2 size-6 text-muted-foreground/50" />
          <p>No product definition yet.</p>
          <p className="mt-1 text-muted-foreground/60 text-xs">
            Click &quot;Recompute&quot; to analyze your codebase, or write one
            manually.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="markdown-content max-w-none rounded-lg border bg-card p-6">
      <Streamdown mode="static">{content}</Streamdown>
    </div>
  );
}

export default function ProductPage() {
  const { organizationId } = useAutopilotContext();

  const doc = useQuery(api.autopilot.queries.knowledge.getProductDefinition, {
    organizationId,
  });
  const analysis = useQuery(
    api.integrations.github.repo_analysis.getLatestAnalysis,
    { organizationId }
  );
  const upsert = useMutation(
    api.autopilot.mutations.knowledge.upsertProductDefinition
  );
  const regenerate = useAction(
    api.autopilot.mutations.knowledge.regenerateProductDefinition
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Track the doc version to detect when it updates after regeneration
  const prevVersionRef = useRef(doc?.version);
  useEffect(
    function closeEditorAfterRegeneration() {
      if (
        doc?.version &&
        prevVersionRef.current &&
        doc.version > prevVersionRef.current
      ) {
        setIsEditing(false);
      }
      prevVersionRef.current = doc?.version;
    },
    [doc?.version]
  );

  if (doc === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const isAnalysisRunning =
    analysis?.status === "pending" || analysis?.status === "in_progress";

  const handleEdit = () => {
    setEditContent(doc?.contentFull ?? "");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await upsert({ organizationId, content: editContent });
      setIsEditing(false);
      setEditContent("");
      toast.success("Product definition saved");
    } catch {
      toast.error("Failed to save product definition");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setIsEditing(false);
    try {
      await regenerate({ organizationId });
      toast.success("Product exploration started");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start analysis";
      toast.error(message);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <Muted>
          Your product definition — the single source of truth that all AI
          agents use to understand your product.
        </Muted>
        <div className="flex shrink-0 gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleCancelEdit} size="sm" variant="ghost">
                Cancel
              </Button>
              <Button disabled={isSaving} onClick={handleSave} size="sm">
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </>
          ) : (
            <>
              <Button
                disabled={isRegenerating || isAnalysisRunning}
                onClick={handleRegenerate}
                size="sm"
                title="Re-analyze the codebase to regenerate the product definition"
                variant="outline"
              >
                <IconRefresh
                  className={cn(
                    "mr-1 size-4",
                    (isRegenerating || isAnalysisRunning) && "animate-spin"
                  )}
                />
                {isRegenerating || isAnalysisRunning
                  ? "Analyzing…"
                  : "Recompute"}
              </Button>
              <Button
                disabled={isAnalysisRunning}
                onClick={handleEdit}
                size="sm"
                variant="outline"
              >
                Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Analysis in progress panel */}
      {isAnalysisRunning && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center gap-3 border-blue-500/10 border-b px-4 py-3">
            <div className="relative flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-blue-500/50" />
              <span className="relative inline-flex size-3 rounded-full bg-blue-500" />
            </div>
            <div className="flex flex-1 items-center gap-2">
              <IconSearch className="size-4 text-blue-500" />
              <span className="font-medium text-blue-500 text-sm">
                Deep product exploration in progress
              </span>
            </div>
            <Badge className="bg-blue-500/10 text-blue-500" variant="outline">
              {analysis?.status === "pending" ? "Queued" : "Exploring"}
            </Badge>
          </div>
          <div className="px-4 py-3">
            <ExplorationProgress
              analysisSince={analysis?.createdAt}
              organizationId={organizationId}
            />
          </div>
          <div className="border-blue-500/10 border-t px-4 py-2">
            <p className="text-[11px] text-blue-500/60">
              The AI agent is reading your codebase to understand every feature.
              This typically takes 1-2 minutes. The page will update
              automatically when complete.
            </p>
          </div>
        </div>
      )}

      {/* Analysis error */}
      {analysis?.status === "error" && analysis.error && !isAnalysisRunning && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <IconAlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
          <div>
            <p className="font-medium text-red-500 text-sm">Analysis failed</p>
            <p className="mt-0.5 text-red-500/70 text-xs">{analysis.error}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {isEditing ? (
        <TiptapMarkdownEditor
          className="min-h-96"
          onChange={(value) => setEditContent(value)}
          placeholder="Describe your product: what it does, who it's for, the core value proposition…"
          value={editContent}
        />
      ) : (
        <ProductDefinitionPreview content={doc?.contentFull ?? ""} />
      )}

      {/* Last updated info */}
      {doc?.lastUpdatedAt && !isEditing && (
        <p className="text-muted-foreground/50 text-xs">
          Last updated{" "}
          {formatDistanceToNow(doc.lastUpdatedAt, { addSuffix: true })} · v
          {doc.version}
        </p>
      )}
    </div>
  );
}
