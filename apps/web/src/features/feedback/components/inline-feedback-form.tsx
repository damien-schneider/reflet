"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { ArrowRight, Lightning, X } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useId } from "react";
import { TiptapMarkdownEditor } from "@/components/ui/tiptap/markdown-editor";
import { getTagSwatchClass } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";
import { AttachmentUpload } from "./attachment-upload";
import {
  type InlineFeedbackComposerState,
  MAX_TITLE_LENGTH,
} from "./use-inline-feedback-composer";

export interface InlineFeedbackTag {
  _id: Id<"tags">;
  color: string;
  icon?: string;
  name: string;
}

export function ComposerIcon() {
  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
    >
      <Lightning className="size-4" weight="fill" />
    </span>
  );
}

function TagOptionLabel({ tag }: { tag: InlineFeedbackTag }) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          "size-2.5 shrink-0 rounded-sm border",
          getTagSwatchClass(tag.color)
        )}
      />
      {tag.icon && <span aria-hidden="true">{tag.icon}</span>}
      {tag.name}
    </span>
  );
}

function TagSelect({
  tags,
  value,
  onChange,
}: {
  tags: InlineFeedbackTag[];
  value: Id<"tags"> | undefined;
  onChange: (tagId: Id<"tags"> | undefined) => void;
}) {
  return (
    <Select
      onValueChange={(next) =>
        onChange(tags.find((tag) => tag._id === next)?._id)
      }
      value={value ?? "none"}
    >
      <SelectTrigger
        aria-label="Tag"
        className="w-auto min-w-28 max-w-44"
        size="xs"
      >
        <SelectValue placeholder="Tag" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No tag</SelectItem>
        {tags.map((tag) => (
          <SelectItem key={tag._id} value={tag._id}>
            <TagOptionLabel tag={tag} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface ComposerSectionProps {
  composer: InlineFeedbackComposerState;
}

function TitleRow({
  composer,
  describedBy,
  inputRef,
  onEscapeWhenEmpty,
}: ComposerSectionProps & {
  describedBy: string | undefined;
  inputRef: React.Ref<HTMLInputElement>;
  onEscapeWhenEmpty: () => void;
}) {
  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !composer.hasContent) {
      onEscapeWhenEmpty();
    }
  };

  return (
    <div className="flex items-center gap-3 pr-10">
      <ComposerIcon />
      <input
        aria-describedby={describedBy}
        aria-invalid={composer.isTitleOverLimit || undefined}
        aria-label="Feedback title"
        className="h-9 min-w-0 flex-1 bg-transparent font-medium text-base outline-none placeholder:text-muted-foreground disabled:opacity-60 sm:text-sm"
        disabled={composer.isSubmitting}
        maxLength={MAX_TITLE_LENGTH + 10}
        onChange={(e) => composer.updateForm({ title: e.target.value })}
        onKeyDown={handleTitleKeyDown}
        placeholder="What would you improve?"
        ref={inputRef}
        value={composer.form.title}
      />
    </div>
  );
}

function TitleCounter({ composer, id }: ComposerSectionProps & { id: string }) {
  return (
    <p
      className={cn(
        "mt-1 text-right text-xs tabular-nums",
        composer.isTitleOverLimit
          ? "text-destructive-text"
          : "text-muted-foreground"
      )}
      id={id}
    >
      {composer.titleLength}/{MAX_TITLE_LENGTH}
    </p>
  );
}

function DetailFields({
  composer,
  isMember,
}: ComposerSectionProps & { isMember: boolean }) {
  const { form, isSubmitting, updateForm } = composer;
  return (
    <>
      <div className="mt-2 border-border/40 border-t pt-2">
        <TiptapMarkdownEditor
          disabled={isSubmitting}
          minimal
          onChange={(value) => updateForm({ description: value })}
          onSubmit={composer.handleSubmit}
          placeholder="Add details (optional)"
          value={form.description}
        />
      </div>

      <div className="mt-2">
        <AttachmentUpload
          attachments={form.attachments}
          disabled={isSubmitting}
          onAttachmentsChange={(attachments) => updateForm({ attachments })}
        />
      </div>

      {!isMember && (
        <Input
          aria-label="Email for updates (optional)"
          autoComplete="email"
          className="mt-2"
          disabled={isSubmitting}
          onChange={(e) => updateForm({ email: e.target.value })}
          placeholder="Email for updates (optional)"
          size="sm"
          type="email"
          value={form.email}
        />
      )}
    </>
  );
}

function ComposerFooter({
  composer,
  tags,
}: ComposerSectionProps & { tags: InlineFeedbackTag[] | undefined }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {tags && tags.length > 0 && (
          <TagSelect
            onChange={(tagId) => composer.updateForm({ tagId })}
            tags={tags}
            value={composer.form.tagId}
          />
        )}
      </div>
      <Button
        disabled={!composer.canSubmit}
        size="xs"
        tone="primary"
        type="submit"
        variant="solid"
      >
        {composer.isSubmitting ? "Sending…" : "Submit"}
        <ArrowRight data-icon="inline-end" />
      </Button>
    </div>
  );
}

function DiscardDraftButton({ composer }: ComposerSectionProps) {
  return (
    <Button
      aria-label="Discard draft"
      className="absolute top-2 right-2"
      disabled={composer.isSubmitting}
      iconOnly
      onClick={composer.handleCancel}
      size="sm"
      type="button"
      variant="ghost"
    >
      <X />
    </Button>
  );
}

function ComposerError({ id, message }: { id: string; message: string }) {
  return (
    <p className="mt-2 text-destructive-text text-xs" id={id} role="alert">
      {message}
    </p>
  );
}

interface InlineFeedbackFormProps extends ComposerSectionProps {
  inputRef: React.Ref<HTMLInputElement>;
  isMember: boolean;
  onCollapse: () => void;
  tagOptions: InlineFeedbackTag[] | undefined;
}

export function InlineFeedbackForm({
  composer,
  inputRef,
  isMember,
  onCollapse,
  tagOptions,
}: InlineFeedbackFormProps) {
  const counterId = useId();
  const errorId = useId();
  const { error } = composer;
  const describedBy =
    [composer.showTitleCounter ? counterId : "", error ? errorId : ""]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <form
      action={() => {
        composer.handleSubmit();
      }}
      aria-label="Share feedback"
      className="relative p-3"
    >
      <DiscardDraftButton composer={composer} />
      <TitleRow
        composer={composer}
        describedBy={describedBy}
        inputRef={inputRef}
        onEscapeWhenEmpty={onCollapse}
      />
      {composer.showTitleCounter && (
        <TitleCounter composer={composer} id={counterId} />
      )}
      <DetailFields composer={composer} isMember={isMember} />
      {error && <ComposerError id={errorId} message={error} />}
      <ComposerFooter composer={composer} tags={tagOptions} />
    </form>
  );
}
