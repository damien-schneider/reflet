"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import {
  IconBrandLinkedin,
  IconBrandReddit,
  IconBrandX,
  IconCheck,
  IconExternalLink,
  IconNews,
  IconPencil,
  IconSend,
} from "@tabler/icons-react";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
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
import { ConversationContent } from "@/features/autopilot/components/content-sheet-conversation";
import { ContentPropertyGrid } from "@/features/autopilot/components/content-sheet-property-grid";
import {
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
    statusAction = "Approve & Publish";
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
