"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconArchive,
  IconFileText,
  IconFilter,
  IconPlus,
  IconRobot,
  IconTag,
} from "@tabler/icons-react";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { H2 } from "@/components/ui/typography";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import { MarkdownContent } from "@/features/autopilot/components/markdown-content";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Partial<Record<Doc<"autopilotDocuments">["type"], string>> =
  {
    market_research: "bg-blue-500/10 text-blue-500",
    report: "bg-red-500/10 text-red-500",
    prospect_brief: "bg-purple-500/10 text-purple-500",
    battlecard: "bg-orange-500/10 text-orange-500",
    note: "bg-green-500/10 text-green-500",
  };

const AGENT_LABELS: Record<string, string> = {
  pm: "PM",
  cto: "CTO",
  dev: "Dev",
  growth: "Growth",
  sales: "Sales",
  security: "Security",
  architect: "Architect",
  support: "Support",
  docs: "Docs",
  ceo: "CEO",
};

export default function DocumentsPage() {
  const { organizationId } = useAutopilotContext();

  const documents = useQuery(api.autopilot.queries.documents.listDocuments, {
    organizationId,
    limit: 100,
  });

  const createDoc = useMutation(
    api.autopilot.mutations.documents.createDocument
  );
  const archiveDoc = useMutation(
    api.autopilot.mutations.documents.archiveDocument
  );

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] =
    useState<Doc<"autopilotDocuments">["type"]>("note");
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!(newTitle.trim() && newContent.trim())) {
      return;
    }
    try {
      await createDoc({
        organizationId,
        type: newType,
        title: newTitle.trim(),
        content: newContent.trim(),
      });
      toast.success("Document created");
      setIsCreating(false);
      setNewTitle("");
      setNewContent("");
    } catch {
      toast.error("Failed to create document");
    }
  };

  const handleArchive = async (docId: Id<"autopilotDocuments">) => {
    try {
      await archiveDoc({ documentId: docId });
      toast.success("Document archived");
    } catch {
      toast.error("Failed to archive document");
    }
  };

  if (documents === undefined) {
    return (
      <div className="space-y-6">
        <H2 variant="card">Documents</H2>
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton
              className="h-32 w-full rounded-lg"
              key={`skel-${String(i)}`}
            />
          ))}
        </div>
      </div>
    );
  }

  const filteredDocs =
    filterType === "all"
      ? documents.filter((d) => d.status !== "archived")
      : documents.filter(
          (d) => d.type === filterType && d.status !== "archived"
        );

  const docTypes = [...new Set(documents.map((d) => d.type))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <H2 variant="card">Documents</H2>
        <Button onClick={() => setIsCreating(!isCreating)} size="sm">
          <IconPlus className="mr-1 size-4" />
          New Document
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Document title..."
              value={newTitle}
            />
            <Select
              onValueChange={(v) => {
                if (v) {
                  setNewType(v as Doc<"autopilotDocuments">["type"]);
                }
              }}
              value={newType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Note</SelectItem>
                <SelectItem value="market_research">Market Research</SelectItem>
                <SelectItem value="report">Report</SelectItem>
                <SelectItem value="prospect_brief">Prospect Brief</SelectItem>
                <SelectItem value="battlecard">Battlecard</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              className="min-h-32"
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Document content (Markdown supported)..."
              value={newContent}
            />
            <div className="flex gap-2">
              <Button onClick={handleCreate} size="sm">
                Create
              </Button>
              <Button
                onClick={() => setIsCreating(false)}
                size="sm"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <IconFilter className="size-4 text-muted-foreground" />
        <Select
          onValueChange={(v) => {
            if (v) {
              setFilterType(v);
            }
          }}
          value={filterType}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {docTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground text-sm">
          {filteredDocs.length} document{filteredDocs.length === 1 ? "" : "s"}
        </span>
      </div>

      {filteredDocs.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-muted-foreground text-sm">
          <div className="text-center">
            <IconFileText className="mx-auto mb-2 size-8" />
            <p>No documents yet. Agents will create documents as they work.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocs.map((doc) => {
            const isExpanded = expandedDocId === doc._id;

            return (
              <Card key={doc._id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <button
                        className="text-left"
                        onClick={() =>
                          setExpandedDocId(isExpanded ? null : doc._id)
                        }
                        type="button"
                      >
                        <CardTitle className="text-base hover:underline">
                          {doc.title}
                        </CardTitle>
                      </button>
                      <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge
                          className={cn(
                            "text-xs",
                            TYPE_STYLES[doc.type] ??
                              "bg-muted text-muted-foreground"
                          )}
                          variant="outline"
                        >
                          {doc.type.replaceAll("_", " ")}
                        </Badge>
                        {doc.sourceAgent && (
                          <Badge className="text-xs" variant="secondary">
                            <IconRobot className="mr-1 size-3" />
                            {AGENT_LABELS[doc.sourceAgent] ?? doc.sourceAgent}
                          </Badge>
                        )}
                        {doc.tags.map((tag) => (
                          <Badge
                            className="text-xs"
                            key={tag}
                            variant="outline"
                          >
                            <IconTag className="mr-1 size-3" />
                            {tag}
                          </Badge>
                        ))}
                        <span className="text-muted-foreground text-xs">
                          {formatDistanceToNow(doc.createdAt, {
                            addSuffix: true,
                          })}
                        </span>
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => handleArchive(doc._id)}
                      size="icon"
                      title="Archive document"
                      variant="ghost"
                    >
                      <IconArchive className="size-4" />
                    </Button>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent>
                    <div className="rounded-md bg-muted/50 p-4">
                      <MarkdownContent>{doc.content}</MarkdownContent>
                    </div>
                  </CardContent>
                )}
                {!isExpanded && (
                  <CardContent className="pt-0">
                    <p className="line-clamp-2 text-muted-foreground text-sm">
                      {doc.content}
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
