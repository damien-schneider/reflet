"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { ViewMode } from "@/features/autopilot/components/document-view-mode";
import { TYPE_LABELS } from "@/features/autopilot/lib/document-labels";

type DocumentType = Doc<"autopilotDocuments">["type"];

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
