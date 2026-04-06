"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import {
  DocumentContent,
  RESEARCH_TYPES,
  SOCIAL_TYPES,
  SourceLink,
} from "@/features/autopilot/components/document-content";
import {
  AGENT_LABELS,
  IMPACT_COLOR_MAP,
  STATUS_COLOR_MAP,
  STATUS_LABELS,
  TYPE_COLOR_MAP,
  TYPE_LABELS,
} from "@/features/autopilot/lib/document-labels";
import { cn } from "@/lib/utils";

const STATUS_DOT_COLORS = {
  draft: "bg-muted-foreground",
  pending_review: "bg-yellow-500",
  published: "bg-green-500",
  archived: "bg-red-500",
} as const;

export function ViewMode({
  document,
  onArchive,
  onStatusTransition,
}: {
  document: Doc<"autopilotDocuments">;
  onArchive: () => void;
  onStatusTransition: () => void;
}) {
  const { orgSlug } = useAutopilotContext();
  const updateDoc = useMutation(
    api.autopilot.mutations.documents.updateDocument
  );
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isEditable = document.status === "pending_review";
  const hasEdits = editedContent !== null && editedContent !== document.content;

  const handleSaveEdits = async () => {
    if (!hasEdits || editedContent === null) {
      return;
    }
    setIsSaving(true);
    try {
      await updateDoc({ documentId: document._id, content: editedContent });
      setEditedContent(null);
      toast.success("Content updated");
    } catch {
      toast.error("Failed to save edits");
    } finally {
      setIsSaving(false);
    }
  };

  let statusAction: string | null = null;
  if (document.status === "draft") {
    statusAction = "Submit for Review";
  } else if (document.status === "pending_review") {
    statusAction = "Approve & Publish";
  }

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              STATUS_DOT_COLORS[document.status]
            )}
          />
          <Badge color={TYPE_COLOR_MAP[document.type]}>
            {TYPE_LABELS[document.type]}
          </Badge>
          {isEditable && (
            <Badge color="blue" variant="outline">
              Editable
            </Badge>
          )}
          <span className="text-muted-foreground text-xs">
            {formatDistanceToNow(document.createdAt, { addSuffix: true })}
          </span>
        </div>
        <SheetTitle>{document.title}</SheetTitle>
        <SheetDescription className="sr-only">
          Document details
        </SheetDescription>
      </SheetHeader>
      <ScrollArea className="flex-1" classNameViewport="px-4">
        <PropertyGrid document={document} orgSlug={orgSlug} />
        <Separator className="my-4" />
        <DocumentContent
          document={document}
          editedContent={editedContent}
          isEditable={isEditable}
          onContentChange={isEditable ? setEditedContent : undefined}
        />
      </ScrollArea>
      <SheetFooter className="flex-row justify-between gap-2">
        <Button onClick={onArchive} variant="outline">
          Archive
        </Button>
        <div className="flex gap-2">
          {hasEdits && (
            <Button
              disabled={isSaving}
              onClick={handleSaveEdits}
              variant="secondary"
            >
              {isSaving ? "Saving..." : "Save Edits"}
            </Button>
          )}
          {statusAction && (
            <Button onClick={onStatusTransition}>{statusAction}</Button>
          )}
        </div>
      </SheetFooter>
    </>
  );
}

function PropertyRow({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-24 shrink-0 text-muted-foreground text-xs">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5">{children}</div>
    </div>
  );
}

function PropertyGrid({
  document,
  orgSlug,
}: {
  document: Doc<"autopilotDocuments">;
  orgSlug: string;
}) {
  return (
    <div className="text-sm">
      <PropertyRow label="Status">
        <Badge color={STATUS_COLOR_MAP[document.status]}>
          {STATUS_LABELS[document.status]}
        </Badge>
      </PropertyRow>

      {document.sourceAgent && (
        <PropertyRow label="Agent">
          <Badge variant="secondary">
            {AGENT_LABELS[document.sourceAgent] ?? document.sourceAgent}
          </Badge>
        </PropertyRow>
      )}

      {document.impactLevel && (
        <PropertyRow label="Impact">
          <Badge color={IMPACT_COLOR_MAP[document.impactLevel]}>
            {document.impactLevel}
          </Badge>
        </PropertyRow>
      )}

      {document.tags.length > 0 && (
        <PropertyRow label="Tags">
          <div className="flex flex-wrap gap-1">
            {document.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </PropertyRow>
      )}

      {document.needsReview && (
        <PropertyRow label="Needs Review">
          <Badge color="yellow">Yes</Badge>
        </PropertyRow>
      )}

      {document.reviewType && (
        <PropertyRow label="Review Type">
          <span>{document.reviewType}</span>
        </PropertyRow>
      )}

      {document.platform && (
        <PropertyRow label="Platform">
          <span>{document.platform}</span>
        </PropertyRow>
      )}

      {document.targetUrl && !SOCIAL_TYPES.has(document.type) && (
        <PropertyRow label="Target URL">
          <a
            className="truncate text-primary hover:underline"
            href={document.targetUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {document.targetUrl}
          </a>
        </PropertyRow>
      )}

      {document.publishedUrl && (
        <PropertyRow label="Published URL">
          <a
            className="truncate text-primary hover:underline"
            href={document.publishedUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            {document.publishedUrl}
          </a>
        </PropertyRow>
      )}

      {document.publishedAt && (
        <PropertyRow label="Published">
          <span>
            {formatDistanceToNow(document.publishedAt, { addSuffix: true })}
          </span>
        </PropertyRow>
      )}

      {document.sourceUrls &&
        document.sourceUrls.length > 0 &&
        !RESEARCH_TYPES.has(document.type) && (
          <PropertyRow label="Sources">
            <div className="flex flex-wrap gap-1.5">
              {document.sourceUrls.map((url) => (
                <SourceLink key={url} url={url} />
              ))}
            </div>
          </PropertyRow>
        )}

      {document.keyFindings &&
        document.keyFindings.length > 0 &&
        !RESEARCH_TYPES.has(document.type) && (
          <PropertyRow label="Key Findings">
            <ul className="list-inside list-disc space-y-0.5 text-sm">
              {document.keyFindings.map((finding) => (
                <li key={finding}>{finding}</li>
              ))}
            </ul>
          </PropertyRow>
        )}

      {document.relevanceScore !== undefined &&
        !RESEARCH_TYPES.has(document.type) && (
          <PropertyRow label="Relevance">
            <span>{String(document.relevanceScore)}/10</span>
          </PropertyRow>
        )}

      {document.linkedWorkItemId && (
        <PropertyRow label="Work Item">
          <Link
            className="text-primary hover:underline"
            href={`/dashboard/${orgSlug}/autopilot/roadmap`}
          >
            View linked work item
          </Link>
        </PropertyRow>
      )}

      {document.linkedCompetitorId && (
        <PropertyRow label="Competitor">
          <Link
            className="text-primary hover:underline"
            href={`/dashboard/${orgSlug}/autopilot/growth`}
          >
            View linked competitor
          </Link>
        </PropertyRow>
      )}

      {document.linkedLeadId && (
        <PropertyRow label="Lead">
          <Link
            className="text-primary hover:underline"
            href={`/dashboard/${orgSlug}/autopilot/sales`}
          >
            View linked lead
          </Link>
        </PropertyRow>
      )}

      <PropertyRow label="Updated">
        <span>
          {formatDistanceToNow(document.updatedAt, { addSuffix: true })}
        </span>
      </PropertyRow>
    </div>
  );
}
