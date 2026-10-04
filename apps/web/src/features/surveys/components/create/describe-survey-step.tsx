"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { DialogFooter } from "@ctrl-ui/react/ui/dialog";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Textarea } from "@ctrl-ui/react/ui/textarea";
import { ArrowLeft } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import type { SurveyDraft } from "@reflet/backend/convex/surveys/lib/ai_draft_schema";
import { useAction } from "convex/react";
import { type FormEvent, useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { convexErrorMessage } from "@/lib/convex-error-message";

interface DescribeSurveyStepProps {
  onBack: () => void;
  onDrafted: (draft: SurveyDraft) => void;
  organizationId: Id<"organizations">;
}

export function DescribeSurveyStep({
  onBack,
  onDrafted,
  organizationId,
}: DescribeSurveyStepProps) {
  const generateDraft = useAction(api.surveys.ai.generateDraft);
  const formId = useId();
  const [prompt, setPrompt] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim()) {
      return;
    }
    setError(null);
    setIsDrafting(true);
    try {
      onDrafted(await generateDraft({ organizationId, prompt: prompt.trim() }));
    } catch (draftError) {
      setError(
        convexErrorMessage(
          draftError,
          "Couldn’t draft a survey from that. Try adding more detail."
        )
      );
    }
    setIsDrafting(false);
  };

  return (
    <>
      <form
        className="flex flex-col gap-1.5"
        id={formId}
        onSubmit={handleSubmit}
      >
        <Label htmlFor={`${formId}-prompt`}>What do you want to learn?</Label>
        <Textarea
          aria-describedby={`${formId}-status`}
          autoFocus
          disabled={isDrafting}
          id={`${formId}-prompt`}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="e.g. Why trial users don’t upgrade. Ask unhappy people what’s missing and thank happy ones."
          rows={4}
          value={prompt}
        />
        <p
          aria-live="polite"
          className={
            error ? "text-destructive text-xs" : "text-muted-foreground text-xs"
          }
          id={`${formId}-status`}
        >
          {error ??
            (isDrafting
              ? "Drafting your survey…"
              : "You can edit everything before publishing.")}
        </p>
      </form>
      <DialogFooter>
        <Button className="sm:mr-auto" onClick={onBack} variant="ghost">
          <ArrowLeft aria-hidden />
          Back
        </Button>
        <Button
          disabled={!prompt.trim() || isDrafting}
          form={formId}
          tone="primary"
          type="submit"
          variant="solid"
        >
          {isDrafting ? <Spinner data-icon="inline-start" size="xs" /> : null}
          {isDrafting ? "Drafting…" : "Draft survey"}
        </Button>
      </DialogFooter>
    </>
  );
}
