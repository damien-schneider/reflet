"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Trash } from "@phosphor-icons/react";
import type { SurveyEnding } from "@reflet/survey-core";
import { useId } from "react";
import { useFlowEditor } from "@/features/surveys/components/flow/flow-context";
import { AutosavedField } from "@/features/surveys/components/flow/inspector/autosaved-field";

export function EndingInspector({ ending }: { ending: SurveyEnding }) {
  const { actions, model, requestDelete } = useFlowEditor();
  const isOnlyEnding = model.endings.length === 1;
  const deleteHintId = useId();

  const saveEnding = (changes: Partial<Omit<SurveyEnding, "id">>) =>
    actions.saveEndings(
      model.endings.map((candidate) =>
        candidate.id === ending.id ? { ...candidate, ...changes } : candidate
      )
    );

  return (
    <div className="flex flex-col gap-5">
      <p className="text-pretty text-muted-foreground text-sm">
        People see this when their path through the survey ends here.
      </p>
      <AutosavedField
        label="Title"
        onSave={(title) => saveEnding({ title })}
        saved={ending.title}
      />
      <AutosavedField
        label="Message"
        multiline
        onSave={(description) => saveEnding({ description })}
        optional
        saved={ending.description ?? ""}
      />
      <AutosavedField
        label="Button label"
        onSave={(buttonLabel) =>
          saveEnding({ buttonLabel: buttonLabel.trim() || undefined })
        }
        optional
        placeholder="e.g. Back to the app"
        saved={ending.buttonLabel ?? ""}
      />
      <AutosavedField
        label="Button link"
        onSave={(buttonUrl) =>
          saveEnding({ buttonUrl: buttonUrl.trim() || undefined })
        }
        optional
        placeholder="https://"
        saved={ending.buttonUrl ?? ""}
      />
      <hr className="border-border" />
      <div className="flex flex-col gap-1.5">
        <Button
          aria-describedby={isOnlyEnding ? deleteHintId : undefined}
          className="self-start"
          disabled={isOnlyEnding}
          onClick={() => requestDelete({ endingId: ending.id, kind: "ending" })}
          size="sm"
          tone="danger"
          variant="ghost"
        >
          <Trash aria-hidden />
          Delete ending
        </Button>
        {isOnlyEnding ? (
          <p className="text-muted-foreground text-xs" id={deleteHintId}>
            Every survey needs at least one ending.
          </p>
        ) : null}
      </div>
    </div>
  );
}
