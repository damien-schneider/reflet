"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconBrandLinkedin,
  IconBrandReddit,
  IconBrandX,
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconNews,
  IconPencil,
  IconSend,
} from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  AGENT_LABELS,
  PLATFORM_CONFIG,
  STATUS_COLOR_MAP,
  STATUS_LABELS,
  TYPE_COLOR_MAP,
  TYPE_LABELS,
} from "@/features/autopilot/lib/document-labels";

type DocumentType = Doc<"autopilotDocuments">["type"];

const BLOG_TYPES = new Set<DocumentType>(["blog_post", "changelog"]);

const PLATFORM_ICONS: Record<string, typeof IconBrandReddit> = {
  reddit: IconBrandReddit,
  hn: IconNews,
  linkedin: IconBrandLinkedin,
  twitter: IconBrandX,
  pencil: IconPencil,
};

interface ContentSheetProps {
  document: Doc<"autopilotDocuments"> | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function ContentSheet({
  document,
  onOpenChange,
  open,
}: ContentSheetProps) {
  const updateDoc = useMutation(
    api.autopilot.mutations.documents.updateDocument
  );
  const archiveDoc = useMutation(
    api.autopilot.mutations.documents.archiveDocument
  );

  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isEditable = document !== null && document.status === "pending_review";
  const hasEdits =
    editedContent !== null && editedContent !== document?.content;

  const handleArchive = async () => {
    if (!document) {
      return;
    }
    try {
      await archiveDoc({ documentId: document._id });
      toast.success("Archived");
      onOpenChange(false);
    } catch {
      toast.error("Failed to archive");
    }
  };

  const handleSaveEdits = async () => {
    if (!(document && hasEdits) || editedContent === null) {
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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setEditedContent(null);
    }
    onOpenChange(open);
  };

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetContent
        className="md:w-[50vw] md:max-w-2xl"
        side="right"
        variant="panel"
      >
        {document ? (
          <ContentSheetBody
            document={document}
            editedContent={editedContent}
            hasEdits={hasEdits}
            isEditable={isEditable}
            isSaving={isSaving}
            onArchive={handleArchive}
            onContentChange={isEditable ? setEditedContent : undefined}
            onSaveEdits={handleSaveEdits}
            onStatusTransition={handleStatusTransition}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ContentSheetBody({
  document,
  editedContent,
  hasEdits,
  isEditable,
  isSaving,
  onArchive,
  onContentChange,
  onSaveEdits,
  onStatusTransition,
}: {
  document: Doc<"autopilotDocuments">;
  editedContent: string | null;
  hasEdits: boolean;
  isEditable: boolean;
  isSaving: boolean;
  onArchive: () => void;
  onContentChange?: (value: string) => void;
  onSaveEdits: () => void;
  onStatusTransition: () => void;
}) {
  const platformConf = PLATFORM_CONFIG[document.type];
  const iconKey = platformConf?.icon ?? "pencil";
  const PlatformIcon = PLATFORM_ICONS[iconKey] ?? IconPencil;
  const isBlogType = BLOG_TYPES.has(document.type);
  const isPublished = document.status === "published";

  let statusAction: string | null = null;
  if (document.status === "draft") {
    statusAction = "Submit for Review";
  } else if (document.status === "pending_review") {
    statusAction = isBlogType ? "Approve & Publish" : "Approve & Publish";
  }

  return (
    <>
      <SheetHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={TYPE_COLOR_MAP[document.type]}>
            {TYPE_LABELS[document.type]}
          </Badge>
          <Badge color={STATUS_COLOR_MAP[document.status]}>
            {STATUS_LABELS[document.status]}
          </Badge>
          <span className="text-muted-foreground text-xs">
            {formatDistanceToNow(document.updatedAt ?? document.createdAt, {
              addSuffix: true,
            })}
          </span>
        </div>
        <SheetTitle>{document.title}</SheetTitle>
        <SheetDescription className="sr-only">Content details</SheetDescription>
      </SheetHeader>

      <ScrollArea className="flex-1" classNameViewport="px-4">
        {isBlogType ? (
          <BlogContent
            content={editedContent ?? document.content}
            isEditable={isEditable}
            onContentChange={onContentChange}
          />
        ) : (
          <ConversationContent
            content={editedContent ?? document.content}
            isEditable={isEditable}
            onContentChange={onContentChange}
            platformIcon={PlatformIcon}
            targetUrl={document.targetUrl}
            type={document.type}
          />
        )}

        <Separator className="my-4" />

        <ContentPropertyGrid document={document} />
      </ScrollArea>

      <SheetFooter className="flex-row justify-between gap-2">
        <Button onClick={onArchive} variant="outline">
          Archive
        </Button>

        {isPublished && document.publishedUrl && (
          <a
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            href={document.publishedUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <IconExternalLink className="size-4" />
            View Published
          </a>
        )}
        {!isPublished && (
          <div className="flex gap-2">
            {hasEdits && (
              <Button
                disabled={isSaving}
                onClick={onSaveEdits}
                variant="secondary"
              >
                {isSaving ? "Saving..." : "Save Edits"}
              </Button>
            )}
            {!isBlogType && document.targetUrl && (
              <a
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                href={document.targetUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <IconSend className="size-4" />
                Open & Reply
              </a>
            )}
            {statusAction && (
              <Button onClick={onStatusTransition}>
                <IconCheck className="mr-1.5 size-4" />
                {statusAction}
              </Button>
            )}
          </div>
        )}
      </SheetFooter>
    </>
  );
}

function ConversationContent({
  content,
  isEditable,
  onContentChange,
  platformIcon: PlatformIcon,
  targetUrl,
  type,
}: {
  content: string;
  isEditable: boolean;
  onContentChange?: (value: string) => void;
  platformIcon: typeof IconBrandReddit;
  targetUrl?: string;
  type: DocumentType;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Received bubble — the original post being replied to */}
      {targetUrl && (
        <div className="max-w-[85%]">
          <a
            className="block rounded-lg bg-muted p-3 transition-colors hover:bg-muted/80"
            href={targetUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <div className="mb-1 flex items-center gap-1.5">
              <PlatformIcon className="size-3.5 text-muted-foreground" />
              <span className="font-medium text-muted-foreground text-xs">
                {PLATFORM_CONFIG[type]?.label ?? TYPE_LABELS[type]}
              </span>
            </div>
            <p className="truncate text-foreground text-sm">{targetUrl}</p>
            <span className="mt-1 flex items-center gap-1 text-muted-foreground text-xs">
              View original
              <IconExternalLink className="size-3" />
            </span>
          </a>
        </div>
      )}

      {/* Sent bubble — our draft reply */}
      <div className="ml-auto max-w-[90%]">
        <div className="rounded-lg border-2 border-primary/30 border-dashed p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Your Draft
            </span>
            <div className="flex items-center gap-1">
              <Button onClick={handleCopy} size="icon-sm" variant="ghost">
                {copied ? (
                  <IconCheck className="size-3.5 text-green-500" />
                ) : (
                  <IconCopy className="size-3.5" />
                )}
              </Button>
              {targetUrl && (
                <a
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-input bg-background px-2.5 font-medium text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                  href={targetUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <PlatformIcon className="size-3" />
                  Reply
                </a>
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
          <p className="mt-2 text-right text-muted-foreground text-xs">
            {content.length} chars
          </p>
        </div>
      </div>
    </div>
  );
}

function BlogContent({
  content,
  isEditable,
  onContentChange,
}: {
  content: string;
  isEditable: boolean;
  onContentChange?: (value: string) => void;
}) {
  return (
    <TiptapMarkdownEditor
      editable={isEditable}
      minimal={!isEditable}
      onChange={onContentChange}
      placeholder={isEditable ? "Edit content before approving..." : undefined}
      value={content}
    />
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

function ContentPropertyGrid({
  document,
}: {
  document: Doc<"autopilotDocuments">;
}) {
  return (
    <div className="text-sm">
      <PropertyRow label="Platform">
        <span>
          {PLATFORM_CONFIG[document.type]?.label ?? TYPE_LABELS[document.type]}
        </span>
      </PropertyRow>

      {document.sourceAgent && (
        <PropertyRow label="Agent">
          <Badge variant="secondary">
            {AGENT_LABELS[document.sourceAgent] ?? document.sourceAgent}
          </Badge>
        </PropertyRow>
      )}

      <PropertyRow label="Status">
        <Badge color={STATUS_COLOR_MAP[document.status]}>
          {STATUS_LABELS[document.status]}
        </Badge>
      </PropertyRow>

      {document.targetUrl && (
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

      <PropertyRow label="Created">
        <span>
          {formatDistanceToNow(document.createdAt, { addSuffix: true })}
        </span>
      </PropertyRow>

      {document.updatedAt && (
        <PropertyRow label="Updated">
          <span>
            {formatDistanceToNow(document.updatedAt, { addSuffix: true })}
          </span>
        </PropertyRow>
      )}
    </div>
  );
}
