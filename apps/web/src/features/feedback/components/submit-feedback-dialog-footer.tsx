"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useId } from "react";
import { toId } from "@/lib/convex-helpers";
import { getTagSwatchClass } from "@/lib/tag-colors";
import { AssigneeSelect } from "./assignee-select";

export const MAX_TITLE_LENGTH = 100;

export interface Tag {
  _id: string;
  color: string;
  icon?: string;
  name: string;
}

export interface FeedbackDraft {
  attachments: string[];
  description: string;
  email: string;
  title: string;
}

export interface TitleValidationState {
  canSubmit: boolean;
  isTitleMissing: boolean;
  isTitleOverLimit: boolean;
  showTitleCounter: boolean;
  titleLength: number;
}

export interface FeedbackMetaFieldsProps {
  feedback: FeedbackDraft;
  isAdmin?: boolean;
  isMember: boolean;
  onAssigneeChange?: (assigneeId: string | undefined) => void;
  onFeedbackChange: (feedback: FeedbackDraft) => void;
  onTagChange?: (tagId: Id<"tags"> | undefined) => void;
  organizationId?: Id<"organizations">;
  selectedAssigneeId?: string;
  selectedTagId?: Id<"tags">;
  tags?: Tag[];
}

export interface SubmitFeedbackFooterProps extends FeedbackMetaFieldsProps {
  error?: string | null;
  isSubmitting: boolean;
  onCancel: () => void;
  validation: TitleValidationState;
}

export function SubmitFeedbackFooter({
  error,
  isSubmitting,
  onCancel,
  validation,
  ...metaProps
}: SubmitFeedbackFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t bg-muted/30 px-6 py-4">
      <FeedbackMetaFields {...metaProps} />
      <SubmitActions
        isSubmitting={isSubmitting}
        onCancel={onCancel}
        validation={validation}
      />
      {error && (
        <p className="w-full text-destructive-text text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function FeedbackMetaFields({
  feedback,
  isAdmin,
  isMember,
  onAssigneeChange,
  onFeedbackChange,
  onTagChange,
  organizationId,
  selectedAssigneeId,
  selectedTagId,
  tags,
}: FeedbackMetaFieldsProps) {
  const members = useQuery(
    api.organizations.members.list,
    isAdmin && organizationId ? { organizationId } : "skip"
  );
  const showTagSelector = isAdmin && tags && tags.length > 0 && onTagChange;
  const showAssigneeSelector = isAdmin && members && onAssigneeChange;

  return (
    <div className="flex flex-1 flex-wrap items-center gap-3">
      {!isMember && (
        <Input
          aria-label="Email for updates (optional)"
          autoComplete="email"
          className="max-w-60"
          onChange={(e) =>
            onFeedbackChange({ ...feedback, email: e.target.value })
          }
          placeholder="Email for updates (optional)"
          size="sm"
          type="email"
          value={feedback.email}
        />
      )}
      {showTagSelector && (
        <TagSelect
          onTagChange={onTagChange}
          selectedTagId={selectedTagId}
          tags={tags}
        />
      )}
      {showAssigneeSelector && (
        <AssigneeSelect
          members={members}
          onAssigneeChange={onAssigneeChange}
          selectedAssigneeId={selectedAssigneeId}
        />
      )}
    </div>
  );
}

function SubmitActions({
  isSubmitting,
  onCancel,
  validation,
}: {
  isSubmitting: boolean;
  onCancel: () => void;
  validation: TitleValidationState;
}) {
  const validationId = useId();
  const { canSubmit, isTitleMissing, isTitleOverLimit } = validation;
  const hasValidationMessage = isTitleOverLimit || isTitleMissing;

  return (
    <div className="flex items-center gap-2">
      <TitleValidation
        id={validationId}
        isTitleMissing={isTitleMissing}
        isTitleOverLimit={isTitleOverLimit}
      />
      <Button onClick={onCancel} size="sm" type="button" variant="ghost">
        Cancel
      </Button>
      <Button
        aria-describedby={hasValidationMessage ? validationId : undefined}
        disabled={!canSubmit}
        size="sm"
        tone="primary"
        type="submit"
        variant="solid"
      >
        {isSubmitting ? "Submitting…" : "Submit"}
      </Button>
    </div>
  );
}

function TitleValidation({
  id,
  isTitleOverLimit,
  isTitleMissing,
}: {
  id: string;
  isTitleOverLimit: boolean;
  isTitleMissing: boolean;
}) {
  if (isTitleOverLimit) {
    return (
      <p className="text-destructive-text text-xs" id={id}>
        Shorten the title to {MAX_TITLE_LENGTH} characters
      </p>
    );
  }
  if (isTitleMissing) {
    return (
      <p className="text-destructive-text text-xs" id={id}>
        Add a title to submit
      </p>
    );
  }
  return null;
}

function TagSelect({
  tags,
  selectedTagId,
  onTagChange,
}: {
  tags: Tag[];
  selectedTagId?: Id<"tags">;
  onTagChange: (tagId: Id<"tags"> | undefined) => void;
}) {
  return (
    <Select
      onValueChange={(value) =>
        onTagChange(value && value !== "none" ? toId("tags", value) : undefined)
      }
      value={selectedTagId || "none"}
    >
      <SelectTrigger
        aria-label="Tag"
        className="w-auto min-w-32 max-w-48"
        size="sm"
      >
        <SelectValue placeholder="Tag" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No tag</SelectItem>
        {tags.map((tag) => (
          <SelectItem key={tag._id} value={tag._id}>
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "size-3 shrink-0 rounded-sm border",
                  getTagSwatchClass(tag.color)
                )}
              />
              {tag.icon && <span aria-hidden="true">{tag.icon}</span>}
              {tag.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
