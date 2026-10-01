"use client";

import { NotionColorPicker } from "@/components/ui/notion-color-picker";
import { TagFormActions } from "@/features/tags/components/editor/form-actions";
import {
  CategoryAudienceField,
  TagNameField,
} from "@/features/tags/components/editor/form-fields";
import {
  type TagFormTarget,
  useTagFormState,
} from "@/features/tags/components/editor/form-state";

interface TagFormProps {
  actions: { onCancel: () => void; onSuccess: () => void };
  layout: "popover" | "dialog";
  target: TagFormTarget;
}

export function TagForm({ target, layout, actions }: TagFormProps) {
  const form = useTagFormState(target, actions.onSuccess);
  return (
    <form className="space-y-3" noValidate onSubmit={form.handleSubmit}>
      <TagNameField form={form} />
      <NotionColorPicker onChange={form.setColor} value={form.color} />
      <CategoryAudienceField form={form} />
      <TagFormActions
        layout={layout}
        onCancel={actions.onCancel}
        state={{
          isEditing: Boolean(target.editingTag),
          isSubmitting: form.isSubmitting,
        }}
      />
    </form>
  );
}
