import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconFileText } from "@tabler/icons-react";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AGENT_LABELS,
  TYPE_COLOR_MAP,
  TYPE_LABELS,
} from "@/features/autopilot/lib/document-labels";
import { cn } from "@/lib/utils";
import type { AutopilotDocumentListItem } from "./types";

const STATUS_DOT_COLORS = {
  archived: "bg-red-500",
  draft: "bg-muted-foreground",
  pending_review: "bg-yellow-500",
  published: "bg-green-500",
} as const;

interface DocumentListProps {
  documents: AutopilotDocumentListItem[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onCreate: () => void;
  onSelect: (documentId: Id<"autopilotDocuments">) => void;
  selectedDocId: Id<"autopilotDocuments"> | null;
}

export function DocumentList({
  documents,
  hasActiveFilters,
  onClearFilters,
  onCreate,
  onSelect,
  selectedDocId,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-muted-foreground text-sm">
        <div className="text-center">
          <IconFileText className="mx-auto mb-2 size-8" />
          <p>{hasActiveFilters ? "No documents match" : "No documents yet"}</p>
          {hasActiveFilters ? (
            <Button
              className="mt-2"
              onClick={onClearFilters}
              size="sm"
              variant="outline"
            >
              Clear filters
            </Button>
          ) : (
            <Button
              className="mt-2"
              onClick={onCreate}
              size="sm"
              variant="outline"
            >
              Create your first document
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {documents.map((doc) => (
        <Button
          className={cn(
            "h-auto w-full justify-start rounded-none border-0 border-border border-b px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-accent/50",
            selectedDocId === doc._id && "bg-muted"
          )}
          key={doc._id}
          onClick={() => onSelect(doc._id)}
          type="button"
          variant="ghost"
        >
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              STATUS_DOT_COLORS[doc.status]
            )}
          />

          <Badge className="shrink-0" color={TYPE_COLOR_MAP[doc.type]}>
            {TYPE_LABELS[doc.type]}
          </Badge>

          <span className="min-w-0 flex-1 truncate font-medium">
            {doc.title}
          </span>

          {doc.sourceAgent && (
            <Badge
              className="hidden shrink-0 sm:inline-flex"
              variant="secondary"
            >
              {AGENT_LABELS[doc.sourceAgent] ?? doc.sourceAgent}
            </Badge>
          )}

          {doc.tags.length > 0 && (
            <div className="hidden shrink-0 items-center gap-1 md:flex">
              {doc.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
              {doc.tags.length > 2 && (
                <Badge variant="outline">+{doc.tags.length - 2}</Badge>
              )}
            </div>
          )}

          <span className="shrink-0 text-muted-foreground text-xs">
            {formatDistanceToNow(doc.createdAt, { addSuffix: true })}
          </span>

          {doc.needsReview && (
            <span className="size-2 shrink-0 rounded-full bg-blue-500" />
          )}
        </Button>
      ))}
    </div>
  );
}
