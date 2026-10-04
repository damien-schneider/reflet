"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ctrl-ui/react/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { toast } from "@ctrl-ui/react/ui/toast";
import { type FormEvent, useId, useState } from "react";

const STATUS_CODE_SEPARATOR = /[\s,]+/;
const MAX_KEYWORD_CHARS = 200;

export interface ResponseChecksDraft {
  keyword: string;
  statusCodes: string;
}

export interface ResponseChecks {
  bodyKeyword?: string;
  expectedStatusCodes?: number[];
}

export const EMPTY_RESPONSE_CHECKS_DRAFT: ResponseChecksDraft = {
  keyword: "",
  statusCodes: "",
};

export const responseChecksFromDraft = (
  draft: ResponseChecksDraft
): ResponseChecks => {
  const codes = draft.statusCodes
    .split(STATUS_CODE_SEPARATOR)
    .filter(Boolean)
    .map(Number);
  return {
    bodyKeyword: draft.keyword.trim() || undefined,
    expectedStatusCodes: codes.length > 0 ? codes : undefined,
  };
};

export function ResponseChecksFields({
  draft,
  onDraftChange,
}: {
  draft: ResponseChecksDraft;
  onDraftChange: (draft: ResponseChecksDraft) => void;
}) {
  const statusCodesId = useId();
  const keywordId = useId();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor={statusCodesId}>Expected status codes</FieldLabel>
        <Input
          autoComplete="off"
          className="tabular-nums"
          id={statusCodesId}
          inputMode="numeric"
          onChange={(event) =>
            onDraftChange({ ...draft, statusCodes: event.target.value })
          }
          placeholder="Any 2xx or 3xx"
          spellCheck={false}
          value={draft.statusCodes}
        />
        <FieldDescription>Separate codes with commas.</FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor={keywordId}>Response contains</FieldLabel>
        <Input
          autoComplete="off"
          id={keywordId}
          maxLength={MAX_KEYWORD_CHARS}
          onChange={(event) =>
            onDraftChange({ ...draft, keyword: event.target.value })
          }
          placeholder="Optional keyword"
          spellCheck={false}
          value={draft.keyword}
        />
        <FieldDescription>
          Case-sensitive. Keyword checks pass on 2xx responses only.
        </FieldDescription>
      </Field>
    </div>
  );
}

interface ResponseChecksDialogProps {
  monitor: ResponseChecks & { name: string };
  onOpenChange: (open: boolean) => void;
  onSave: (changes: {
    bodyKeyword: string | null;
    expectedStatusCodes: number[] | null;
  }) => Promise<unknown>;
  open: boolean;
}

export function ResponseChecksDialog({
  monitor,
  onOpenChange,
  onSave,
  open,
}: ResponseChecksDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-120">
        <DialogHeader>
          <DialogTitle>Response checks for {monitor.name}</DialogTitle>
          <DialogDescription>
            A check fails when the response doesn’t match. Leave a field empty
            to skip it.
          </DialogDescription>
        </DialogHeader>
        <ResponseChecksForm
          monitor={monitor}
          onSave={async (changes) => {
            await onSave(changes);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function ResponseChecksForm({
  monitor,
  onSave,
}: Pick<ResponseChecksDialogProps, "monitor" | "onSave">) {
  const [draft, setDraft] = useState<ResponseChecksDraft>({
    keyword: monitor.bodyKeyword ?? "",
    statusCodes: monitor.expectedStatusCodes?.join(", ") ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }
    const { bodyKeyword, expectedStatusCodes } = responseChecksFromDraft(draft);
    setIsSaving(true);
    try {
      await onSave({
        bodyKeyword: bodyKeyword ?? null,
        expectedStatusCodes: expectedStatusCodes ?? null,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Couldn’t save the checks. Try again."
      );
    }
    setIsSaving(false);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <ResponseChecksFields draft={draft} onDraftChange={setDraft} />
      <DialogFooter>
        <DialogClose>Cancel</DialogClose>
        <Button
          disabled={isSaving}
          tone="primary"
          type="submit"
          variant="solid"
        >
          {isSaving ? "Saving…" : "Save checks"}
        </Button>
      </DialogFooter>
    </form>
  );
}
