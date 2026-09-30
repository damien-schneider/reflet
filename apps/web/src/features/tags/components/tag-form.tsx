"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { DialogFooter } from "@ctrl-ui/react/ui/dialog";
import { Field, FieldError, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { type FormEvent, useId, useState } from "react";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import { NotionColorPicker } from "@/components/ui/notion-color-picker";
import {
  isValidTagColor,
  migrateHexToNamedColor,
  type TagColor,
} from "@/lib/tag-colors";

export interface EditableTag {
  _id: Id<"tags">;
  color: string;
  icon?: string;
  name: string;
}

interface TagFormProps {
  editingTag?: EditableTag | null;
  layout: "popover" | "dialog";
  onCancel: () => void;
  onSuccess: () => void;
  organizationId: Id<"organizations">;
}

const NAME_REQUIRED = "Give the tag a name.";
const SAVE_FAILED =
  "Couldn’t save the tag. Check your connection and try again.";

function initialColor(tag: EditableTag | null | undefined): TagColor {
  if (!tag) {
    return "blue";
  }
  return isValidTagColor(tag.color)
    ? tag.color
    : migrateHexToNamedColor(tag.color);
}

interface SubmitArgs {
  editingTag?: EditableTag | null;
  onSuccess: () => void;
  organizationId: Id<"organizations">;
}

function useTagFormState({
  editingTag,
  onSuccess,
  organizationId,
}: SubmitArgs) {
  const createTag = useMutation(api.organizations.tag_manager_actions.create);
  const updateTag = useMutation(api.organizations.tag_manager_actions.update);

  const [name, setName] = useState(editingTag?.name ?? "");
  const [icon, setIcon] = useState(editingTag?.icon);
  const [color, setColor] = useState<TagColor>(() => initialColor(editingTag));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(NAME_REQUIRED);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (editingTag) {
        await updateTag({ color, icon, id: editingTag._id, name: trimmedName });
      } else {
        await createTag({ color, icon, name: trimmedName, organizationId });
      }
      onSuccess();
    } catch {
      setError(SAVE_FAILED);
    }
    setIsSubmitting(false);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setError(null);
  };

  return {
    color,
    error,
    handleNameChange,
    handleSubmit,
    icon,
    isSubmitting,
    name,
    setColor,
    setIcon,
  };
}

interface TagFormActionsProps {
  isDialog: boolean;
  isEditing: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
}

function TagFormActions({
  isDialog,
  isEditing,
  isSubmitting,
  onCancel,
}: TagFormActionsProps) {
  const size = isDialog ? "md" : "xs";
  const actions = (
    <>
      <Button
        disabled={isSubmitting}
        onClick={onCancel}
        size={size}
        variant={isDialog ? "surface" : "ghost"}
      >
        Cancel
      </Button>
      <Button
        disabled={isSubmitting}
        size={size}
        tone="primary"
        type="submit"
        variant="solid"
      >
        {isSubmitting && <Spinner data-icon="inline-start" size="xs" />}
        {isEditing ? "Save" : "Create"}
      </Button>
    </>
  );

  if (isDialog) {
    return <DialogFooter>{actions}</DialogFooter>;
  }
  return <div className="flex justify-end gap-2 pt-1">{actions}</div>;
}

export function TagForm({
  editingTag,
  layout,
  onCancel,
  onSuccess,
  organizationId,
}: TagFormProps) {
  const nameId = useId();
  const errorId = `${nameId}-error`;
  const form = useTagFormState({ editingTag, onSuccess, organizationId });

  return (
    <form className="space-y-3" noValidate onSubmit={form.handleSubmit}>
      <Field invalid={Boolean(form.error)}>
        <FieldLabel htmlFor={nameId}>Name</FieldLabel>
        <div className="flex items-center gap-2">
          <EmojiPicker onChange={form.setIcon} value={form.icon} />
          <Input
            aria-describedby={form.error ? errorId : undefined}
            autoComplete="off"
            autoFocus
            className="min-w-0 flex-1"
            disabled={form.isSubmitting}
            id={nameId}
            onChange={(e) => form.handleNameChange(e.target.value)}
            placeholder="e.g. Bug"
            size="sm"
            value={form.name}
          />
        </div>
        <FieldError id={errorId} match={Boolean(form.error)}>
          {form.error}
        </FieldError>
      </Field>
      <NotionColorPicker onChange={form.setColor} value={form.color} />
      <TagFormActions
        isDialog={layout === "dialog"}
        isEditing={Boolean(editingTag)}
        isSubmitting={form.isSubmitting}
        onCancel={onCancel}
      />
    </form>
  );
}
