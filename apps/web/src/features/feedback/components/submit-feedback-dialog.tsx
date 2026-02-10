"use client";

import { User, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { TiptapTitleEditor } from "@/components/ui/tiptap/title-editor";
import { getTagSwatchClass } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";
import { AttachmentUpload } from "./attachment-upload";

const MAX_TITLE_LENGTH = 100;
const TITLE_COUNTER_THRESHOLD = 90;

interface Tag {
  _id: string;
  name: string;
  color: string;
  icon?: string;
}

interface SubmitFeedbackDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => Promise<void>;
  feedback: {
    title: string;
    description: string;
    email: string;
    attachments: string[];
  };
  onFeedbackChange: (feedback: {
    title: string;
    description: string;
    email: string;
    attachments: string[];
  }) => void;
  isSubmitting: boolean;
  isMember: boolean;
  isAdmin?: boolean;
  organizationId?: Id<"organizations">;
  tags?: Tag[];
  selectedTagId?: string;
  onTagChange?: (tagId: string | undefined) => void;
  selectedAssigneeId?: string;
  onAssigneeChange?: (assigneeId: string | undefined) => void;
}

export function SubmitFeedbackDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  feedback,
  onFeedbackChange,
  isSubmitting,
  isMember,
  isAdmin,
  organizationId,
  tags,
  selectedTagId,
  onTagChange,
  selectedAssigneeId,
  onAssigneeChange,
}: SubmitFeedbackDialogProps) {
  const members = useQuery(
    api.members.list,
    isAdmin && organizationId ? { organizationId } : "skip"
  );

  const titleLength = feedback.title.length;
  const isTitleOverLimit = titleLength > MAX_TITLE_LENGTH;
  const showTitleCounter = titleLength >= TITLE_COUNTER_THRESHOLD;
  const canSubmit = !isSubmitting && feedback.title.trim() && !isTitleOverLimit;

  const handleSubmit = () => {
    if (canSubmit) {
      onSubmit();
    }
  };

  const showTagSelector = isAdmin && tags && tags.length > 0 && onTagChange;
  const showAssigneeSelector = isAdmin && members && onAssigneeChange;

  return (
    <Sheet onOpenChange={onOpenChange} open={isOpen}>
      <SheetContent
        className="gap-0 overflow-hidden p-0 md:w-[50vw] md:max-w-2xl"
        showCloseButton={false}
        side="right"
        variant="panel"
      >
        {/* Header */}
        <SheetHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-3">
          <SheetTitle className="font-medium text-base">
            Submit Feedback
          </SheetTitle>
          <SheetDescription className="sr-only">
            Share your ideas, report bugs, or request features.
          </SheetDescription>

          {/* Close button */}
          <SheetClose
            render={
              <Button
                onClick={() => onOpenChange(false)}
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        </SheetHeader>

        {/* Document-like content area */}
        <div className="flex min-h-100 flex-1 flex-col overflow-y-auto">
          {/* Title area */}
          <div className="px-6 pt-6 pb-2">
            <TiptapTitleEditor
              autoFocus
              onChange={(value) =>
                onFeedbackChange({ ...feedback, title: value })
              }
              onSubmit={handleSubmit}
              placeholder="Untitled"
              value={feedback.title}
            />
            {showTitleCounter && (
              <p
                className={cn(
                  "mt-1 text-right text-xs tabular-nums",
                  isTitleOverLimit
                    ? "text-destructive"
                    : "text-muted-foreground"
                )}
              >
                {titleLength}/{MAX_TITLE_LENGTH}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="mx-6 border-border/50 border-b" />

          {/* Description area - takes up remaining space */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <TiptapMarkdownEditor
              minimal
              onChange={(value) =>
                onFeedbackChange({ ...feedback, description: value })
              }
              onSubmit={handleSubmit}
              placeholder="Add a description... Type '/' for commands, or drag and drop images/videos"
              value={feedback.description}
            />
          </div>

          {/* Attachments */}
          <div className="px-6 pb-4">
            <AttachmentUpload
              attachments={feedback.attachments}
              disabled={isSubmitting}
              onAttachmentsChange={(attachments) =>
                onFeedbackChange({ ...feedback, attachments })
              }
            />
          </div>

          {/* Footer */}
          <div
            className={cn(
              "border-t bg-muted/30 px-6 py-4",
              "flex items-center justify-between gap-4"
            )}
          >
            {/* Left side - email for non-members, tag/assignee selectors for admins */}
            <div className="flex flex-1 flex-wrap items-center gap-3">
              {!isMember && (
                <Input
                  className="h-8 max-w-60 text-sm"
                  onChange={(e) =>
                    onFeedbackChange({ ...feedback, email: e.target.value })
                  }
                  placeholder="Email for updates (optional)"
                  type="email"
                  value={feedback.email}
                />
              )}
              {showTagSelector && (
                <Select
                  onValueChange={(value) =>
                    onTagChange(value && value !== "none" ? value : undefined)
                  }
                  value={selectedTagId || "none"}
                >
                  <SelectTrigger className="h-8 w-auto min-w-32 max-w-48 text-sm">
                    <SelectValue placeholder="Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No tag</SelectItem>
                    {tags.map((tag) => (
                      <SelectItem key={tag._id} value={tag._id}>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "h-3 w-3 shrink-0 rounded-sm border",
                              getTagSwatchClass(tag.color)
                            )}
                          />
                          {tag.icon && <span>{tag.icon}</span>}
                          {tag.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {showAssigneeSelector && (
                <Select
                  onValueChange={(value) =>
                    onAssigneeChange(
                      value && value !== "unassigned" ? value : undefined
                    )
                  }
                  value={selectedAssigneeId || "unassigned"}
                >
                  <SelectTrigger className="h-8 w-auto min-w-36 max-w-52 text-sm">
                    <SelectValue placeholder="Assignee">
                      {selectedAssigneeId ? (
                        <AssigneeTriggerContent
                          members={members}
                          selectedAssigneeId={selectedAssigneeId}
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span>Assignee</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Unassigned</span>
                      </div>
                    </SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage
                              src={member.user?.image ?? undefined}
                            />
                            <AvatarFallback className="text-[8px]">
                              {member.user?.name?.charAt(0) ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            {member.user?.name ??
                              member.user?.email ??
                              "Unknown"}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Right side - actions */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => onOpenChange(false)}
                size="sm"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button disabled={!canSubmit} onClick={onSubmit} size="sm">
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface AssigneeTriggerContentProps {
  members: Array<{
    userId: string;
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    } | null;
  }>;
  selectedAssigneeId: string;
}

function AssigneeTriggerContent({
  members,
  selectedAssigneeId,
}: AssigneeTriggerContentProps) {
  const selected = members.find((m) => m.userId === selectedAssigneeId);
  if (!selected) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <User className="h-3.5 w-3.5" />
        <span>Assignee</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-4 w-4">
        <AvatarImage src={selected.user?.image ?? undefined} />
        <AvatarFallback className="text-[8px]">
          {selected.user?.name?.charAt(0) ?? "?"}
        </AvatarFallback>
      </Avatar>
      <span>{selected.user?.name ?? selected.user?.email ?? "Unknown"}</span>
    </div>
  );
}
