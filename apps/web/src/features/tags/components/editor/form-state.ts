"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { categoryIsPublic } from "@reflet/backend/convex/feedback/categories/audience";
import type { TagColor } from "@reflet/backend/convex/feedback/tag_colors";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";

export type EditableTag = Pick<
  Doc<"tags">,
  "_id" | "color" | "icon" | "name" | "settings"
>;
export interface TagFormTarget {
  editingTag?: EditableTag | null;
  organizationId: Id<"organizations">;
}
interface TagDraft {
  color: TagColor;
  icon?: string;
  isPublic: boolean;
  name: string;
}

export interface TagFormState extends TagDraft {
  error: string | null;
  handleNameChange: (value: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isSubmitting: boolean;
  setColor: (value: TagColor) => void;
  setIcon: (value: string | undefined) => void;
  setIsPublic: (value: boolean) => void;
}

function initialColor(tag: EditableTag | null | undefined): TagColor {
  return tag?.color ?? "blue";
}

function useTagSubmission(target: TagFormTarget, onSuccess: () => void) {
  const create = useMutation(api.organizations.tag_manager_actions.create);
  const update = useMutation(api.organizations.tag_manager_actions.update);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function submit(draft: TagDraft) {
    const name = draft.name.trim();
    if (!name) {
      setError("Give the tag a name.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      if (target.editingTag) {
        await update({ ...draft, id: target.editingTag._id, name });
      } else {
        await create({ ...draft, name, organizationId: target.organizationId });
      }
      onSuccess();
    } catch {
      setError("Couldn’t save the tag. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }
  return { clearError: () => setError(null), error, isSubmitting, submit };
}

export function useTagFormState(
  target: TagFormTarget,
  onSuccess: () => void
): TagFormState {
  const [name, setName] = useState(target.editingTag?.name ?? "");
  const [icon, setIcon] = useState(target.editingTag?.icon);
  const [color, setColor] = useState<TagColor>(() =>
    initialColor(target.editingTag)
  );
  const [isPublic, setIsPublic] = useState(() =>
    categoryIsPublic(target.editingTag ?? {})
  );
  const submission = useTagSubmission(target, onSuccess);
  function handleNameChange(value: string) {
    setName(value);
    submission.clearError();
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    return submission.submit({ color, icon, isPublic, name });
  }
  return {
    color,
    error: submission.error,
    handleNameChange,
    handleSubmit,
    icon,
    isPublic,
    isSubmitting: submission.isSubmitting,
    name,
    setColor,
    setIcon,
    setIsPublic,
  };
}
