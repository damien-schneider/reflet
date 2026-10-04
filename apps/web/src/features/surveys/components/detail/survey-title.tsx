"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import { PageTitle } from "@ctrl-ui/react/ui/page-layout";
import { toast } from "@ctrl-ui/react/ui/toast";
import { PencilSimple } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";

export function SurveyTitle({
  surveyId,
  title,
}: {
  surveyId: Id<"surveys">;
  title: string;
}) {
  const updateSurvey = useMutation(api.surveys.mutations.update);
  const [draft, setDraft] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft === null || !draft.trim()) {
      return;
    }
    if (draft.trim() === title) {
      setDraft(null);
      return;
    }
    setIsSaving(true);
    try {
      await updateSurvey({ surveyId, title: draft.trim() });
      setDraft(null);
    } catch {
      toast.error("Couldn’t rename the survey. Try again.");
    }
    setIsSaving(false);
  };

  if (draft === null) {
    return (
      <PageTitle className="min-w-0 text-xl">
        <button
          className="group inline-flex max-w-full items-center gap-2 text-left"
          onClick={() => setDraft(title)}
          type="button"
        >
          <span className="truncate" title={title}>
            {title}
          </span>
          <PencilSimple
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground"
          />
          <span className="sr-only">Rename survey</span>
        </button>
      </PageTitle>
    );
  }

  return (
    <form
      className="flex min-w-0 flex-1 items-center gap-2"
      onSubmit={handleSubmit}
    >
      <Input
        aria-label="Survey title"
        autoFocus
        className="min-w-0 flex-1"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft(null);
          }
        }}
        value={draft}
      />
      <Button
        disabled={!draft.trim() || isSaving}
        tone="primary"
        type="submit"
        variant="solid"
      >
        {isSaving ? "Saving…" : "Save"}
      </Button>
      <Button onClick={() => setDraft(null)} variant="ghost">
        Cancel
      </Button>
    </form>
  );
}
