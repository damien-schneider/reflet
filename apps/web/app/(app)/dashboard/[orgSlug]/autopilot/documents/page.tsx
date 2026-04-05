"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { IconFileText, IconPlus, IconSearch } from "@tabler/icons-react";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { H2 } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { DocumentSheet } from "@/features/autopilot/components/document-sheet";
import {
  AGENT_LABELS,
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

type StatusPreset = "all" | "draft" | "review" | "published";

export default function DocumentsPage() {
  const { organizationId } = useAutopilotContext();

  const documents = useQuery(api.autopilot.queries.documents.listDocuments, {
    organizationId,
    limit: 100,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusPreset, setStatusPreset] = useState<StatusPreset>("all");
  const [filterType, setFilterType] = useState("all");
  const [filterAgent, setFilterAgent] = useState("all");
  const [selectedDocId, setSelectedDocId] =
    useState<Id<"autopilotDocuments"> | null>(null);
  const [sheetMode, setSheetMode] = useState<"view" | "create">("view");

  if (documents === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <H2 variant="card">Documents</H2>
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="overflow-hidden rounded-xl border border-border">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton
              className="h-10 w-full border-border border-b last:border-b-0"
              key={`skel-${String(i)}`}
            />
          ))}
        </div>
      </div>
    );
  }

  const filteredDocs = documents.filter((doc) => {
    if (
      searchQuery &&
      !doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (filterType !== "all" && doc.type !== filterType) {
      return false;
    }
    if (filterAgent !== "all" && doc.sourceAgent !== filterAgent) {
      return false;
    }
    if (statusPreset === "draft" && doc.status !== "draft") {
      return false;
    }
    if (statusPreset === "review" && !doc.needsReview) {
      return false;
    }
    if (statusPreset === "published" && doc.status !== "published") {
      return false;
    }
    return true;
  });

  const sheetOpen = selectedDocId !== null || sheetMode === "create";
  const selectedDoc = documents.find((d) => d._id === selectedDocId) ?? null;

  const handleSheetOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedDocId(null);
      setSheetMode("view");
    }
  };

  const presets: Array<{ label: string; value: StatusPreset }> = [
    { label: "All", value: "all" },
    { label: "Draft", value: "draft" },
    { label: "Review", value: "review" },
    { label: "Published", value: "published" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <H2 variant="card">Documents</H2>
        <Button
          onClick={() => {
            setSheetMode("create");
            setSelectedDocId(null);
          }}
          size="sm"
        >
          <IconPlus className="mr-1 size-4" />
          New Document
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <IconSearch className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            value={searchQuery}
          />
        </div>

        <div className="flex overflow-hidden rounded-md border border-border">
          {presets.map((preset) => (
            <button
              className={cn(
                "px-3 py-1.5 font-medium text-xs transition-colors",
                statusPreset === preset.value
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                preset.value !== "all" && "border-border border-l"
              )}
              key={preset.value}
              onClick={() => setStatusPreset(preset.value)}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <Select
          onValueChange={(v) => {
            if (v) {
              setFilterType(v);
            }
          }}
          value={filterType}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={(v) => {
            if (v) {
              setFilterAgent(v);
            }
          }}
          value={filterAgent}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agents</SelectItem>
            {Object.entries(AGENT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-muted-foreground text-sm">
          {filteredDocs.length} document
          {filteredDocs.length === 1 ? "" : "s"}
        </span>
      </div>

      {filteredDocs.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-muted-foreground text-sm">
          <div className="text-center">
            <IconFileText className="mx-auto mb-2 size-8" />
            <p>No documents found</p>
            <Button
              className="mt-2"
              onClick={() => {
                setSheetMode("create");
                setSelectedDocId(null);
              }}
              size="sm"
              variant="outline"
            >
              Create your first document
            </Button>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {filteredDocs.map((doc) => (
            <button
              className={cn(
                "flex w-full items-center gap-3 border-border border-b px-3 py-2.5 text-left text-sm transition-colors last:border-b-0 hover:bg-accent/50",
                selectedDocId === doc._id && "bg-muted"
              )}
              key={doc._id}
              onClick={() => {
                setSelectedDocId(doc._id);
                setSheetMode("view");
              }}
              type="button"
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
            </button>
          ))}
        </div>
      )}

      <DocumentSheet
        document={selectedDoc}
        mode={sheetMode}
        onOpenChange={handleSheetOpenChange}
        open={sheetOpen}
        organizationId={organizationId}
      />
    </div>
  );
}
