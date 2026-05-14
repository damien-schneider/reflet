"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconAlertTriangle,
  IconCheck,
  IconCode,
  IconInfoCircle,
  IconLoader2,
  IconMessageCircle,
  IconPlayerPlay,
  IconRefresh,
  IconRulerMeasure,
  IconSearch,
  IconSparkles,
  IconUserStar,
} from "@tabler/icons-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { type ComponentType, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

import "@/components/ui/tiptap/styles.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { Muted } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { getAutopilotErrorMessage } from "@/features/autopilot/lib/error-messages";
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

type TypedKnowledgeDocType =
  | "identity"
  | "brand_voice"
  | "feature_catalog"
  | "scope";

interface KnowledgeSectionConfig {
  description: string;
  docType: TypedKnowledgeDocType;
  emptyHint: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
}

// Order matters: this is the editorial top-to-bottom flow the user sees on the
// page. It mirrors the chain DAG produced by the CTO (identity first, then
// brand voice, features, scope).
const KNOWLEDGE_SECTIONS: readonly KnowledgeSectionConfig[] = [
  {
    docType: "identity",
    title: "Product Identity",
    description:
      "What the product is, who it's for, primary user verbs, value proposition.",
    icon: IconSparkles,
    emptyHint:
      "The CTO produces this from the codebase analysis. Click Recompute to trigger it, or write it manually.",
  },
  {
    docType: "brand_voice",
    title: "Brand Voice",
    description:
      "Tone, audience framing, vocabulary, do/don't list for written communications.",
    icon: IconMessageCircle,
    emptyHint:
      "Auto-derived from the codebase once codebase_understanding is published.",
  },
  {
    docType: "feature_catalog",
    title: "Feature Catalog",
    description:
      "Typed list of user-facing features with maturity (experimental, beta, stable, deprecated).",
    icon: IconCode,
    emptyHint:
      "Auto-derived from the codebase. Used by downstream agents to ground use cases.",
  },
  {
    docType: "scope",
    title: "Scope",
    description:
      "Current scope, out-of-scope statement, hard boundaries. Used to refuse irrelevant work.",
    icon: IconRulerMeasure,
    emptyHint:
      "Auto-derived from the codebase. Tells the chain what the product is and is NOT.",
  },
];

const KNOWLEDGE_DOC_TYPES = new Set<string>(
  KNOWLEDGE_SECTIONS.map((s) => s.docType)
);

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
        <span>Starting exploration&hellip;</span>
      </div>
    );
  }

  const cutoff = analysisSince ?? 0;
  const explorationEntries = activity
    .filter((entry) => entry.agent === "system" && entry.createdAt >= cutoff)
    .reverse();

  if (explorationEntries.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
        <IconLoader2 className="size-4 animate-spin" />
        <span>Agent is exploring the codebase&hellip;</span>
      </div>
    );
  }

  return (
    <div className="max-h-48 space-y-1 overflow-y-auto" ref={scrollRef}>
      {explorationEntries.map((entry) => {
        const Icon = LEVEL_ICONS[entry.level] ?? IconInfoCircle;
        const color = LEVEL_COLORS[entry.level] ?? "text-muted-foreground";
        return (
          <div className="flex items-start gap-2 text-xs" key={entry._id}>
            <Icon className={cn("mt-0.5 size-3.5 shrink-0", color)} />
            <span className="text-muted-foreground">{entry.message}</span>
          </div>
        );
      })}
    </div>
  );
}

interface KnowledgeDocCardProps {
  config: KnowledgeSectionConfig;
  doc: KnowledgeDoc | null;
  isAnyEditing: boolean;
  onEditEnd: () => void;
  onEditStart: () => void;
}

interface KnowledgeDoc {
  _id: Id<"autopilotKnowledgeDocs">;
  contentFull: string;
  contentSummary: string;
  docType: string;
  lastUpdatedAt: number;
  title: string;
  userEdited: boolean;
  version: number;
}

function KnowledgeDocCard({
  config,
  doc,
  isAnyEditing,
  onEditStart,
  onEditEnd,
}: KnowledgeDocCardProps) {
  const update = useMutation(
    api.autopilot.mutations.knowledge.updateKnowledgeDoc
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const Icon = config.icon;
  const isLockedByOtherEdit = isAnyEditing && !isEditing;

  const handleEdit = () => {
    if (!doc) {
      return;
    }
    setEditContent(doc.contentFull);
    setIsEditing(true);
    onEditStart();
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent("");
    onEditEnd();
  };

  const handleSave = async () => {
    if (!doc) {
      return;
    }
    setIsSaving(true);
    try {
      await update({
        docId: doc._id,
        contentFull: editContent,
        contentSummary: editContent.slice(0, 200).trimEnd(),
      });
      toast.success(`${config.title} saved`);
      setIsEditing(false);
      setEditContent("");
      onEditEnd();
    } catch (error) {
      toast.error(
        getAutopilotErrorMessage(error, {
          fallback: `Failed to save ${config.title.toLowerCase()}`,
        })
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-2 rounded-xl border bg-card p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Icon className="mt-0.5 size-5 text-muted-foreground" />
          <div>
            <h3 className="font-medium text-sm">{config.title}</h3>
            <p className="mt-0.5 text-muted-foreground text-xs">
              {config.description}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {isEditing ? (
            <>
              <Button
                disabled={isSaving}
                onClick={handleCancel}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button disabled={isSaving} onClick={handleSave} size="sm">
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </>
          ) : (
            <Button
              disabled={!doc || isLockedByOtherEdit}
              onClick={handleEdit}
              size="sm"
              variant="outline"
            >
              Edit
            </Button>
          )}
        </div>
      </header>

      {isEditing ? (
        <TiptapMarkdownEditor
          className="min-h-64"
          onChange={(value) => setEditContent(value)}
          placeholder={config.emptyHint}
          value={editContent}
        />
      ) : (
        <KnowledgeDocPreview doc={doc} emptyHint={config.emptyHint} />
      )}

      {doc?.lastUpdatedAt && !isEditing && (
        <p className="text-[11px] text-muted-foreground/50">
          Updated {formatDistanceToNow(doc.lastUpdatedAt, { addSuffix: true })}{" "}
          · v{doc.version}
          {doc.userEdited && " · user-edited"}
        </p>
      )}
    </section>
  );
}

function KnowledgeDocPreview({
  doc,
  emptyHint,
}: {
  doc: KnowledgeDoc | null;
  emptyHint: string;
}) {
  if (!doc?.contentFull) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-xs">
        <div className="text-center">
          <IconUserStar className="mx-auto mb-2 size-5 text-muted-foreground/40" />
          <p>Not produced yet.</p>
          <p className="mt-1 max-w-md text-[11px] text-muted-foreground/60">
            {emptyHint}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="markdown-content max-w-none rounded-lg border bg-background p-4">
      <Streamdown mode="static">{doc.contentFull}</Streamdown>
    </div>
  );
}

export default function ProductPage() {
  const { organizationId } = useAutopilotContext();

  const allDocs = useQuery(api.autopilot.queries.knowledge.listKnowledgeDocs, {
    organizationId,
  });
  const analysis = useQuery(
    api.integrations.github.repo_analysis.getLatestAnalysis,
    { organizationId }
  );
  const regenerate = useAction(
    api.autopilot.mutations.knowledge.regenerateProductDefinition
  );

  const [editingDocType, setEditingDocType] =
    useState<TypedKnowledgeDocType | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Index typed docs by type so each section can find its doc in O(1)
  const docsByType = new Map<string, KnowledgeDoc>();
  for (const doc of allDocs ?? []) {
    if (KNOWLEDGE_DOC_TYPES.has(doc.docType)) {
      docsByType.set(doc.docType, doc);
    }
  }

  if (allDocs === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const isAnalysisRunning =
    analysis?.status === "pending" || analysis?.status === "in_progress";

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setEditingDocType(null);
    try {
      await regenerate({ organizationId });
      toast.success("Product exploration started");
    } catch (error) {
      toast.error(
        getAutopilotErrorMessage(error, {
          fallback: "Failed to start analysis",
        })
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <Muted>
          Four typed knowledge docs produced by the CTO from the codebase
          analysis. Each one grounds the downstream agents — edit any of them to
          override what the AI produced.
        </Muted>
        <Button
          disabled={isRegenerating || isAnalysisRunning}
          onClick={handleRegenerate}
          size="sm"
          title="Re-analyze the codebase to regenerate all four typed knowledge docs"
          variant="outline"
        >
          <IconRefresh
            className={cn(
              "mr-1 size-4",
              (isRegenerating || isAnalysisRunning) && "animate-spin"
            )}
          />
          {isRegenerating || isAnalysisRunning ? "Analyzing…" : "Recompute"}
        </Button>
      </div>

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
              The AI agent is reading your codebase to produce the four typed
              knowledge docs. This typically takes 1-2 minutes. The page will
              update automatically when complete.
            </p>
          </div>
        </div>
      )}

      {analysis?.status === "error" && analysis.error && !isAnalysisRunning && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <IconAlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" />
          <div>
            <p className="font-medium text-red-500 text-sm">Analysis failed</p>
            <p className="mt-0.5 text-red-500/70 text-xs">{analysis.error}</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {KNOWLEDGE_SECTIONS.map((section) => (
          <KnowledgeDocCard
            config={section}
            doc={docsByType.get(section.docType) ?? null}
            isAnyEditing={editingDocType !== null}
            key={section.docType}
            onEditEnd={() => setEditingDocType(null)}
            onEditStart={() => setEditingDocType(section.docType)}
          />
        ))}
      </div>
    </div>
  );
}
