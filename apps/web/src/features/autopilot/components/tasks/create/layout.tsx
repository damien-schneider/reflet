"use client";

import {
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconChevronRight,
  IconCloud,
  IconX,
} from "@tabler/icons-react";
import type { KeyboardEvent, RefObject } from "react";

import { Button } from "@/components/ui/button";
import { DialogClose, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function CreateDialogHeader({
  expanded,
  onExpandedChange,
  teamKey,
}: {
  expanded: boolean;
  onExpandedChange: () => void;
  teamKey: string;
}) {
  const ExpandIcon = expanded ? IconArrowsMinimize : IconArrowsMaximize;
  return (
    <DialogHeader className="flex-row items-center justify-between border-b px-5 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full border bg-muted/70 px-2.5 font-medium text-muted-foreground text-xs">
          <IconCloud className="size-3.5" />
          {teamKey}
        </span>
        <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
        <DialogTitle className="truncate text-base">New issue</DialogTitle>
      </div>
      <div className="flex items-center gap-1">
        <Button
          aria-label={expanded ? "Collapse composer" : "Expand composer"}
          onClick={onExpandedChange}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <ExpandIcon className="size-4" />
        </Button>
        <DialogClose
          render={
            <Button
              aria-label="Close new issue dialog"
              size="icon-sm"
              type="button"
              variant="ghost"
            />
          }
        >
          <IconX className="size-4" />
        </DialogClose>
      </div>
    </DialogHeader>
  );
}

export function ComposerFields({
  description,
  disabled,
  onDescriptionChange,
  onKeyDown,
  onTitleChange,
  title,
  titleRef,
}: {
  description: string;
  disabled: boolean;
  onDescriptionChange: (value: string) => void;
  onKeyDown: (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onTitleChange: (value: string) => void;
  title: string;
  titleRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="space-y-2">
      <Label className="sr-only" htmlFor="new-task-title">
        Issue title
      </Label>
      <Input
        aria-label="Issue title"
        className="h-auto border-0 bg-transparent px-0 py-0 font-semibold text-2xl shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0! md:text-2xl"
        disabled={disabled}
        id="new-task-title"
        onChange={(event) => onTitleChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Issue title"
        ref={titleRef}
        value={title}
      />
      <Label className="sr-only" htmlFor="new-task-desc">
        Issue description
      </Label>
      <Textarea
        aria-label="Issue description"
        className="min-h-32 resize-none border-0 bg-transparent px-0 py-1 text-base shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0!"
        disabled={disabled}
        id="new-task-desc"
        onChange={(event) => onDescriptionChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Add description..."
        value={description}
      />
    </div>
  );
}

export function CreateDialogFooter({
  canSubmit,
  createMore,
  onCreateMoreChange,
  onSubmit,
  submitting,
}: {
  canSubmit: boolean;
  createMore: boolean;
  onCreateMoreChange: (value: boolean) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-4 border-t px-5 py-4 sm:px-6">
      <div className="flex items-center gap-2">
        <Switch
          aria-label="Create more"
          checked={createMore}
          disabled={submitting}
          id="create-more"
          onCheckedChange={onCreateMoreChange}
        />
        <Label
          className="font-normal text-muted-foreground"
          htmlFor="create-more"
        >
          Create more
        </Label>
      </div>
      <Button disabled={!canSubmit} onClick={onSubmit} type="button">
        {submitting ? "Creating..." : "Create issue"}
      </Button>
    </div>
  );
}
