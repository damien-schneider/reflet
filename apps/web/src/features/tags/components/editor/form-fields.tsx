"use client";

import { Field, FieldError, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Radio, RadioGroup } from "@ctrl-ui/react/ui/radio-group";
import { useId } from "react";
import { EmojiPicker } from "@/components/ui/emoji-picker";
import type { TagFormState } from "@/features/tags/components/editor/form-state";

export function TagNameField({ form }: { form: TagFormState }) {
  const nameId = useId();
  const errorId = `${nameId}-error`;
  return (
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
          onChange={(event) => form.handleNameChange(event.target.value)}
          placeholder="e.g. Bug"
          size="sm"
          value={form.name}
        />
      </div>
      <FieldError id={errorId} match={Boolean(form.error)}>
        {form.error}
      </FieldError>
    </Field>
  );
}

export function CategoryAudienceField({ form }: { form: TagFormState }) {
  const audienceId = useId();
  return (
    <div className="space-y-2">
      <span className="font-medium text-label" id={audienceId}>
        Audience
      </span>
      <RadioGroup<string>
        aria-labelledby={audienceId}
        className="flex gap-4"
        disabled={form.isSubmitting}
        onValueChange={(value) => form.setIsPublic(value === "public")}
        orientation="horizontal"
        value={form.isPublic ? "public" : "team"}
      >
        <label
          className="flex min-h-11 cursor-pointer items-center gap-2"
          htmlFor={`${audienceId}-team`}
        >
          <Radio id={`${audienceId}-team`} value="team" />
          Team
        </label>
        <label
          className="flex min-h-11 cursor-pointer items-center gap-2"
          htmlFor={`${audienceId}-public`}
        >
          <Radio id={`${audienceId}-public`} value="public" />
          Public
        </label>
      </RadioGroup>
    </div>
  );
}
