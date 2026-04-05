"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconBrandLinkedin,
  IconBrandReddit,
  IconBrandX,
  IconCopy,
  IconExternalLink,
  IconNews,
} from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { useAutopilotContext } from "@/features/autopilot/components/autopilot-context";
import {
  AGENT_LABELS,
  IMPACT_COLOR_MAP,
  STATUS_COLOR_MAP,
  STATUS_LABELS,
  TYPE_COLOR_MAP,
  TYPE_LABELS,
} from "@/features/autopilot/lib/document-labels";
import { cn } from "@/lib/utils";

type DocumentType = Doc<"autopilotDocuments">["type"];

const SOCIAL_TYPES = new Set<DocumentType>([
  "reddit_reply",
  "hn_comment",
  "linkedin_post",
  "twitter_post",
]);

const RESEARCH_TYPES = new Set<DocumentType>([
  "market_research",
  "report",
  "battlecard",
]);

const SOCIAL_ICONS: Partial<Record<DocumentType, typeof IconBrandReddit>> = {
  reddit_reply: IconBrandReddit,
  hn_comment: IconNews,
  linkedin_post: IconBrandLinkedin,
  twitter_post: IconBrandX,
};

const STATUS_DOT_COLORS = {
  draft: "bg-muted-foreground",
  pending_review: "bg-yellow-500",
  published: "bg-green-500",
  archived: "bg-red-500",
} as const;

const isDocumentType = (value: string): value is DocumentType =>
  value in TYPE_LABELS;

interface DocumentSheetProps {
  document: Doc<"autopilotDocuments"> | null;
  mode: "view" | "create";
  onOpenChange: (open: boolean) => void;
  open: boolean;
  organizationId: Id<"organizations">;
}

export function DocumentSheet({
  document,
  mode,
  onOpenChange,
  open,
  organizationId,
}: DocumentSheetProps) {
  const createDoc = useMutation(
    api.autopilot.mutations.documents.createDocument
  );
  const updateDoc = useMutation(
    api.autopilot.mutations.documents.updateDocument
  );
  const archiveDoc = useMutation(
    api.autopilot.mutations.documents.archiveDocument
  );

  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<DocumentType>("note");
  const [newContent, setNewContent] = useState("");

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      return;
    }
    try {
      await createDoc({
        organizationId,
        type: newType,
        title: newTitle.trim(),
        content: newContent,
      });
      toast.success("Document created");
      setNewTitle("");
      setNewType("note");
      setNewContent("");
      onOpenChange(false);
    } catch {
      toast.error("Failed to create document");
    }
  };

  const handleArchive = async () => {
    if (!document) {
      return;
    }
    try {
      await archiveDoc({ documentId: document._id });
      toast.success("Document archived");
      onOpenChange(false);
    } catch {
      toast.error("Failed to archive document");
    }
  };

  const handleStatusTransition = async () => {
    if (!document) {
      return;
    }
    const nextStatus =
      document.status === "draft" ? "pending_review" : "published";
    try {
      await updateDoc({ documentId: document._id, status: nextStatus });
      toast.success(
        nextStatus === "pending_review" ? "Submitted for review" : "Published"
      );
    } catch {
      toast.error("Failed to update status");
    }
  };

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="md:w-[50vw] md:max-w-2xl"
        side="right"
        variant="panel"
      >
        <SheetBody
          document={document}
          mode={mode}
          newContent={newContent}
          newTitle={newTitle}
          newType={newType}
          onArchive={handleArchive}
          onContentChange={setNewContent}
          onCreate={handleCreate}
          onOpenChange={onOpenChange}
          onStatusTransition={handleStatusTransition}
          onTitleChange={setNewTitle}
          onTypeChange={setNewType}
        />
      </SheetContent>
    </Sheet>
  );
}

function SheetBody({
  document,
  mode,
  newContent,
  newTitle,
  newType,
  onArchive,
  onContentChange,
  onCreate,
  onOpenChange,
  onStatusTransition,
  onTitleChange,
  onTypeChange,
}: {
  document: Doc<"autopilotDocuments"> | null;
  mode: "view" | "create";
  newContent: string;
  newTitle: string;
  newType: DocumentType;
  onArchive: () => void;
  onContentChange: (value: string) => void;
  onCreate: () => void;
  onOpenChange: (open: boolean) => void;
  onStatusTransition: () => void;
  onTitleChange: (value: string) => void;
  onTypeChange: (value: DocumentType) => void;
}) {
  if (mode === "create") {
    return (
      <CreateMode
        content={newContent}
        onContentChange={onContentChange}
        onCreate={onCreate}
        onOpenChange={onOpenChange}
        onTitleChange={onTitleChange}
        onTypeChange={onTypeChange}
        title={newTitle}
        type={newType}
      />
    );
  }

  if (document) {
    return (
      <ViewMode
        document={document}
        onArchive={onArchive}
        onStatusTransition={onStatusTransition}
      />
    );
  }

  return null;
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

function CreateMode({
  content,
  onContentChange,
  onCreate,
  onOpenChange,
  onTitleChange,
  onTypeChange,
  title,
  type,
}: {
  content: string;
  onContentChange: (value: string) => void;
  onCreate: () => void;
  onOpenChange: (open: boolean) => void;
  onTitleChange: (value: string) => void;
  onTypeChange: (value: DocumentType) => void;
  title: string;
  type: DocumentType;
}) {
  return (
    <>
      <SheetHeader>
        <SheetTitle>New Document</SheetTitle>
        <SheetDescription>Create a new document</SheetDescription>
      </SheetHeader>
      <ScrollArea className="flex-1" classNameViewport="px-4">
        <div className="space-y-4">
          <Input
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Document title..."
            value={title}
          />
          <Select
            onValueChange={(v) => {
              if (v && isDocumentType(v)) {
                onTypeChange(v);
              }
            }}
            value={type}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TiptapMarkdownEditor
            onChange={onContentChange}
            placeholder="Write something... Type '/' for commands"
            value={content}
          />
        </div>
      </ScrollArea>
      <SheetFooter className="flex-row justify-end gap-2">
        <Button onClick={() => onOpenChange(false)} variant="outline">
          Cancel
        </Button>
        <Button disabled={!title.trim()} onClick={onCreate}>
          Create
        </Button>
      </SheetFooter>
    </>
  );
}

function ViewMode({
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

  // Allow editing for pending_review documents so the president can
  // tweak content (e.g., Growth posts) before approving.
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

function DocumentContent({
  document,
  editedContent,
  isEditable,
  onContentChange,
}: {
  document: Doc<"autopilotDocuments">;
  editedContent: string | null;
  isEditable: boolean;
  onContentChange?: (value: string) => void;
}) {
  if (SOCIAL_TYPES.has(document.type)) {
    return (
      <SocialDraftContent
        content={editedContent ?? document.content}
        isEditable={isEditable}
        onContentChange={onContentChange}
        targetUrl={document.targetUrl}
        type={document.type}
      />
    );
  }

  if (RESEARCH_TYPES.has(document.type)) {
    return (
      <ResearchContent
        content={editedContent ?? document.content}
        isEditable={isEditable}
        keyFindings={document.keyFindings}
        onContentChange={onContentChange}
        relevanceScore={document.relevanceScore}
        sourceUrls={document.sourceUrls}
      />
    );
  }

  return (
    <TiptapMarkdownEditor
      editable={isEditable}
      minimal={!isEditable}
      onChange={onContentChange}
      placeholder={isEditable ? "Edit content before approving..." : undefined}
      value={editedContent ?? document.content}
    />
  );
}

function SocialDraftContent({
  content,
  isEditable,
  onContentChange,
  targetUrl,
  type,
}: {
  content: string;
  isEditable: boolean;
  onContentChange?: (value: string) => void;
  targetUrl?: string;
  type: DocumentType;
}) {
  const PlatformIcon = SOCIAL_ICONS[type] ?? IconExternalLink;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-3">
      {targetUrl && (
        <a
          className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm transition-colors hover:bg-muted/60"
          href={targetUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <PlatformIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            {targetUrl}
          </span>
          <IconExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
        </a>
      )}

      <div className="rounded-lg border-2 border-primary/30 border-dashed p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Draft Reply
          </span>
          <div className="flex gap-1">
            <Button onClick={handleCopy} size="icon-sm" variant="ghost">
              <IconCopy className="size-3.5" />
            </Button>
            {targetUrl && (
              <Button asChild size="sm" variant="outline">
                <a href={targetUrl} rel="noopener noreferrer" target="_blank">
                  <PlatformIcon className="mr-1 size-3.5" />
                  Open & Reply
                </a>
              </Button>
            )}
          </div>
        </div>
        <TiptapMarkdownEditor
          editable={isEditable}
          minimal={!isEditable}
          onChange={onContentChange}
          placeholder={
            isEditable ? "Edit your reply before posting..." : undefined
          }
          value={content}
        />
      </div>
    </div>
  );
}

function ResearchContent({
  content,
  isEditable,
  keyFindings,
  onContentChange,
  relevanceScore,
  sourceUrls,
}: {
  content: string;
  isEditable: boolean;
  keyFindings?: string[];
  onContentChange?: (value: string) => void;
  relevanceScore?: number;
  sourceUrls?: string[];
}) {
  return (
    <div className="space-y-4">
      {relevanceScore !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Relevance</span>
          <RelevanceScoreBadge score={relevanceScore} />
        </div>
      )}

      {keyFindings && keyFindings.length > 0 && (
        <div>
          <span className="font-medium text-xs uppercase tracking-wider">
            Key Findings
          </span>
          <ul className="mt-2 space-y-1.5">
            {keyFindings.map((finding) => (
              <li className="flex items-start gap-2 text-sm" key={finding}>
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                {finding}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sourceUrls && sourceUrls.length > 0 && (
        <div>
          <span className="font-medium text-xs uppercase tracking-wider">
            Sources
          </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sourceUrls.map((url) => (
              <SourceLink key={url} url={url} />
            ))}
          </div>
        </div>
      )}

      <Separator />

      <TiptapMarkdownEditor
        editable={isEditable}
        minimal={!isEditable}
        onChange={onContentChange}
        placeholder={
          isEditable ? "Edit content before approving..." : undefined
        }
        value={content}
      />
    </div>
  );
}

function getScoreColor(score: number): string {
  const HIGH_THRESHOLD = 8;
  const MED_THRESHOLD = 5;
  if (score >= HIGH_THRESHOLD) {
    return "bg-green-500 text-white";
  }
  if (score >= MED_THRESHOLD) {
    return "bg-amber-500 text-white";
  }
  return "bg-muted text-muted-foreground";
}

function RelevanceScoreBadge({ score }: { score: number }) {
  const color = getScoreColor(score);

  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full font-bold text-xs",
        color
      )}
    >
      {score}
    </span>
  );
}

const PLATFORM_LABELS: Record<string, string> = {
  "reddit.com": "Reddit",
  "news.ycombinator.com": "Hacker News",
  "linkedin.com": "LinkedIn",
  "twitter.com": "X (Twitter)",
  "x.com": "X (Twitter)",
  "github.com": "GitHub",
  "producthunt.com": "Product Hunt",
};

function formatSourceLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    return PLATFORM_LABELS[hostname] ?? hostname;
  } catch {
    return url;
  }
}

function SourceLink({ url }: { url: string }) {
  const label = formatSourceLabel(url);
  return (
    <a
      className="inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-foreground text-xs transition-colors hover:bg-muted"
      href={url}
      rel="noopener noreferrer"
      target="_blank"
    >
      <IconExternalLink className="size-3 shrink-0 text-muted-foreground" />
      {label}
    </a>
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
