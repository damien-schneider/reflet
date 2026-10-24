"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import { InputGroup, InputGroupAddon } from "@ctrl-ui/react/ui/input-group";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Sparkle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import { useAction } from "convex/react";
import { type FormEvent, useId, useState } from "react";
import { useFlowEditor } from "@/features/surveys/components/flow/flow-context";
import type { InsertAnchor } from "@/features/surveys/components/flow/use-flow-actions";
import { convexErrorMessage } from "@/lib/convex-error-message";
import type { QuestionId } from "@/store/surveys";

interface DescribeStepsFormProps {
  anchor: InsertAnchor;
  onInserted: (firstQuestionId: QuestionId) => void;
}

/** Drafts steps with AI from a sentence, then inserts them at the anchor with their jumps. */
export function DescribeStepsForm({
  anchor,
  onInserted,
}: DescribeStepsFormProps) {
  const { actions, model } = useFlowEditor();
  const generateDraft = useAction(api.surveys.ai.generateDraft);
  const [prompt, setPrompt] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const statusId = useId();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim() || progress) {
      return;
    }
    setError(null);
    setProgress("Drafting steps…");
    try {
      const draft = await generateDraft({
        organizationId: model.survey.organizationId,
        prompt: prompt.trim(),
      });
      setProgress(
        draft.questions.length === 1
          ? "Adding 1 step…"
          : `Adding ${draft.questions.length} steps…`
      );
      const [firstId] = await actions.insertSteps(anchor, draft.questions);
      if (firstId) {
        setPrompt("");
        onInserted(firstId);
      }
    } catch (draftError) {
      setError(
        convexErrorMessage(
          draftError,
          "Couldn’t draft steps from that. Try describing it differently."
        )
      );
    }
    setProgress(null);
  };

  return (
    <form className="flex flex-col gap-1.5" onSubmit={handleSubmit}>
      <InputGroup>
        <Input
          aria-describedby={statusId}
          aria-label="Describe the steps to add"
          disabled={progress !== null}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Or just describe it"
          value={prompt}
        />
        <InputGroupAddon>
          <Button
            aria-label="Draft steps"
            disabled={!prompt.trim() || progress !== null}
            iconOnly
            size="sm"
            type="submit"
            variant="ghost"
          >
            {progress ? <Spinner size="xs" /> : <Sparkle aria-hidden />}
          </Button>
        </InputGroupAddon>
      </InputGroup>
      <p
        aria-live="polite"
        className={
          error ? "text-destructive text-xs" : "text-muted-foreground text-xs"
        }
        id={statusId}
      >
        {error ?? progress ?? ""}
      </p>
    </form>
  );
}
