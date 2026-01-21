"use client";

import { Check, PencilSimple, Tag, X } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface FeedbackHeaderProps {
  feedbackId: Id<"feedback">;
  title: string;
  description: string;
  tags?: Array<{ _id: Id<"tags">; name: string; color: string } | null>;
  isAdmin: boolean;
}

export function FeedbackHeader({
  feedbackId,
  title,
  description,
  tags = [],
  isAdmin,
}: FeedbackHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [editedDescription, setEditedDescription] = useState(description);

  const updateFeedback = useMutation(api.feedback.update);

  const handleSaveTitle = useCallback(async () => {
    if (editedTitle.trim() && editedTitle !== title) {
      await updateFeedback({ id: feedbackId, title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  }, [feedbackId, editedTitle, title, updateFeedback]);

  const handleSaveDescription = useCallback(async () => {
    if (editedDescription !== description) {
      await updateFeedback({ id: feedbackId, description: editedDescription });
    }
    setIsEditingDescription(false);
  }, [feedbackId, editedDescription, description, updateFeedback]);

  const handleCancelTitle = useCallback(() => {
    setEditedTitle(title);
    setIsEditingTitle(false);
  }, [title]);

  const handleCancelDescription = useCallback(() => {
    setEditedDescription(description);
    setIsEditingDescription(false);
  }, [description]);

  return (
    <div className="space-y-4">
      {/* Title */}
      <TitleSection
        editedTitle={editedTitle}
        isAdmin={isAdmin}
        isEditing={isEditingTitle}
        onCancel={handleCancelTitle}
        onEdit={() => setIsEditingTitle(true)}
        onSave={handleSaveTitle}
        onTitleChange={setEditedTitle}
        title={title}
      />

      {/* Tags */}
      {tags.length > 0 && <TagsList tags={tags} />}

      {/* Description */}
      <DescriptionSection
        description={description}
        editedDescription={editedDescription}
        isAdmin={isAdmin}
        isEditing={isEditingDescription}
        onCancel={handleCancelDescription}
        onDescriptionChange={setEditedDescription}
        onEdit={() => setIsEditingDescription(true)}
        onSave={handleSaveDescription}
      />
    </div>
  );
}

interface TitleSectionProps {
  title: string;
  editedTitle: string;
  isEditing: boolean;
  isAdmin: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onTitleChange: (value: string) => void;
}

function TitleSection({
  title,
  editedTitle,
  isEditing,
  isAdmin,
  onEdit,
  onSave,
  onCancel,
  onTitleChange,
}: TitleSectionProps) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          className="font-semibold text-xl"
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSave();
            }
            if (e.key === "Escape") {
              onCancel();
            }
          }}
          value={editedTitle}
        />
        <Button onClick={onSave} size="icon" variant="ghost">
          <Check className="h-4 w-4" />
        </Button>
        <Button onClick={onCancel} size="icon" variant="ghost">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-2">
      <h1 className="font-semibold text-xl">{title}</h1>
      {isAdmin && (
        <Button
          className="opacity-0 group-hover:opacity-100"
          onClick={onEdit}
          size="icon"
          variant="ghost"
        >
          <PencilSimple className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

interface TagsListProps {
  tags: Array<{ _id: Id<"tags">; name: string; color: string } | null>;
}

function TagsList({ tags }: TagsListProps) {
  const validTags = tags.filter(Boolean) as Array<{
    _id: Id<"tags">;
    name: string;
    color: string;
  }>;

  if (validTags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tag className="h-4 w-4 text-muted-foreground" />
      {validTags.map((tag) => (
        <Badge
          key={tag._id}
          style={{
            backgroundColor: `${tag.color}20`,
            color: tag.color,
            borderColor: tag.color,
          }}
          variant="outline"
        >
          {tag.name}
        </Badge>
      ))}
    </div>
  );
}

interface DescriptionSectionProps {
  description: string;
  editedDescription: string;
  isEditing: boolean;
  isAdmin: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDescriptionChange: (value: string) => void;
}

function DescriptionSection({
  description,
  editedDescription,
  isEditing,
  isAdmin,
  onEdit,
  onSave,
  onCancel,
  onDescriptionChange,
}: DescriptionSectionProps) {
  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          autoFocus
          className="min-h-25"
          onChange={(e) => onDescriptionChange(e.target.value)}
          value={editedDescription}
        />
        <div className="flex gap-2">
          <Button onClick={onSave} size="sm">
            <Check className="mr-1 h-4 w-4" />
            Save
          </Button>
          <Button onClick={onCancel} size="sm" variant="outline">
            <X className="mr-1 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (!description) {
    return null;
  }

  return (
    <div className="group relative">
      <p className="whitespace-pre-wrap text-muted-foreground">{description}</p>
      {isAdmin && (
        <Button
          className="absolute top-0 right-0 opacity-0 group-hover:opacity-100"
          onClick={onEdit}
          size="icon"
          variant="ghost"
        >
          <PencilSimple className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
