"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import {
  IconCheck,
  IconChevronRight,
  IconClock,
  IconEdit,
  IconFileText,
  IconX,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { H2 } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { cn } from "@/lib/utils";

const DOC_TYPE_LABELS: Record<string, string> = {
  product_definition: "Product Definition",
  user_personas_icp: "User Personas & ICP",
  competitive_landscape: "Competitive Landscape",
  brand_voice: "Brand Voice",
  technical_architecture: "Technical Architecture",
  goals_okrs: "Goals & OKRs",
  product_roadmap: "Product Roadmap",
};

const DOC_TYPE_ICONS: Record<string, string> = {
  product_definition: "📦",
  user_personas_icp: "👥",
  competitive_landscape: "🏆",
  brand_voice: "🎨",
  technical_architecture: "🏗️",
  goals_okrs: "🎯",
  product_roadmap: "🗺️",
};

const STALENESS_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export default function KnowledgePage() {
  const { organizationId } = useAutopilotContext();

  const docs = useQuery(api.autopilot.queries.knowledge.listKnowledgeDocs, {
    organizationId,
  });

  const updateDoc = useMutation(
    api.autopilot.mutations.knowledge.updateKnowledgeDoc
  );

  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSummary, setEditSummary] = useState("");

  if (docs === undefined) {
    return (
      <div className="space-y-6">
        <H2 variant="card">Knowledge Base</H2>
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton
              className="h-20 w-full rounded-lg"
              key={`skel-${String(i)}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="space-y-6">
        <H2 variant="card">Knowledge Base</H2>
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
          <div className="text-center">
            <IconFileText className="mx-auto mb-2 size-8" />
            <p>
              No knowledge docs yet. They&apos;ll be generated when agents start
              working.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleEdit = (doc: (typeof docs)[number]) => {
    setEditingDocId(doc._id);
    setExpandedDocId(doc._id);
    setEditContent(doc.contentFull);
    setEditSummary(doc.contentSummary);
  };

  const handleCancel = () => {
    setEditingDocId(null);
    setEditContent("");
    setEditSummary("");
  };

  const handleSave = async (docId: (typeof docs)[number]["_id"]) => {
    try {
      await updateDoc({
        docId,
        contentFull: editContent,
        contentSummary: editSummary,
      });
      toast.success("Knowledge doc updated");
      setEditingDocId(null);
      setEditContent("");
      setEditSummary("");
    } catch {
      toast.error("Failed to update knowledge doc");
    }
  };

  const toggleExpand = (docId: string) => {
    if (editingDocId === docId) {
      return;
    }
    setExpandedDocId(expandedDocId === docId ? null : docId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <H2 variant="card">Knowledge Base</H2>
        <p className="text-muted-foreground text-sm">
          {docs.length} document{docs.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="space-y-2">
        {docs.map((doc) => {
          const isStale =
            Date.now() - doc.lastUpdatedAt > STALENESS_THRESHOLD_MS;
          const isEditing = editingDocId === doc._id;
          const isExpanded = expandedDocId === doc._id;
          const icon = DOC_TYPE_ICONS[doc.docType] ?? "📄";

          return (
            <div
              className={cn(
                "rounded-lg border transition-colors",
                isExpanded ? "bg-card" : "hover:bg-muted/30",
                isStale && !isExpanded && "border-amber-500/30"
              )}
              key={doc._id}
            >
              {/* Header row — click to expand */}
              <button
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                onClick={() => toggleExpand(doc._id)}
                type="button"
              >
                <IconChevronRight
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    isExpanded && "rotate-90"
                  )}
                />
                <span className="text-lg">{icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-sm">
                      {doc.title}
                    </span>
                    <Badge className="shrink-0 text-xs" variant="secondary">
                      {DOC_TYPE_LABELS[doc.docType] ?? doc.docType}
                    </Badge>
                    {doc.userEdited && (
                      <Badge
                        className="shrink-0 bg-blue-500/10 text-blue-500 text-xs"
                        variant="outline"
                      >
                        Edited
                      </Badge>
                    )}
                    {isStale && (
                      <Badge
                        className="shrink-0 bg-amber-500/10 text-amber-500 text-xs"
                        variant="outline"
                      >
                        <IconClock className="mr-1 size-3" />
                        Stale
                      </Badge>
                    )}
                  </div>
                  {!isExpanded && (
                    <p className="mt-0.5 truncate text-muted-foreground text-xs">
                      {doc.contentSummary}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-muted-foreground text-xs">
                  v{doc.version} &middot;{" "}
                  {formatDistanceToNow(doc.lastUpdatedAt, {
                    addSuffix: true,
                  })}
                </span>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t px-4 py-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label
                          className="mb-1 block font-medium text-sm"
                          htmlFor={`summary-${doc._id}`}
                        >
                          Summary
                        </label>
                        <Input
                          id={`summary-${doc._id}`}
                          onChange={(e) => setEditSummary(e.target.value)}
                          placeholder="Brief summary..."
                          value={editSummary}
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1 block font-medium text-sm"
                          htmlFor={`content-${doc._id}`}
                        >
                          Full Content
                        </label>
                        <Textarea
                          className="min-h-64 font-mono text-sm"
                          id={`content-${doc._id}`}
                          onChange={(e) => setEditContent(e.target.value)}
                          placeholder="Full content..."
                          value={editContent}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleSave(doc._id)} size="sm">
                          <IconCheck className="mr-1 size-4" />
                          Save
                        </Button>
                        <Button
                          onClick={handleCancel}
                          size="sm"
                          variant="outline"
                        >
                          <IconX className="mr-1 size-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                          Summary
                        </p>
                        <Button
                          onClick={() => handleEdit(doc)}
                          size="sm"
                          variant="ghost"
                        >
                          <IconEdit className="mr-1 size-4" />
                          Edit
                        </Button>
                      </div>
                      <p className="text-sm">{doc.contentSummary}</p>
                      <div className="border-t pt-3">
                        <p className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                          Full Content
                        </p>
                        <div className="whitespace-pre-wrap rounded-md bg-muted/50 p-4 text-sm">
                          {doc.contentFull}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
