"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { ArrowCounterClockwise, X } from "@phosphor-icons/react";
import type { PublicSurvey } from "@reflet/survey-core";
import { useSetAtom } from "jotai";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import {
  previewTransport,
  SurveyCard,
  type SurveyTheme,
  useSurveySession,
} from "reflet-sdk/surveys";
import { useFlowEditor } from "@/features/surveys/components/flow/flow-context";
import { flowPreviewOpenAtom } from "@/store/surveys";

/** Runs the survey exactly as respondents see it; nothing is saved. Restarts whenever the flow changes. */
export function PreviewPanel() {
  const { model } = useFlowEditor();
  const setPreviewOpen = useSetAtom(flowPreviewOpenAtom);
  const [runCount, setRunCount] = useState(0);
  const { resolvedTheme } = useTheme();
  const { survey } = model;
  const publicSurvey = useMemo(
    (): PublicSurvey => ({
      _id: survey._id,
      description: survey.description,
      display: survey.display,
      endings: survey.endings,
      questions: survey.questions,
      title: survey.title,
      triggerConfig: survey.triggerConfig,
      triggerType: survey.triggerType,
    }),
    [survey]
  );

  return (
    <section
      aria-label="Live preview"
      className="pointer-events-none absolute right-4 bottom-4 z-10 flex w-[22rem] max-w-[calc(100%-2rem)] flex-col items-stretch gap-2"
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-xl border bg-card py-1 ps-3 pe-1 shadow-xs">
        <h2 className="flex-1 font-medium text-sm">Live preview</h2>
        <Button
          onClick={() => setRunCount((count) => count + 1)}
          size="xs"
          variant="ghost"
        >
          <ArrowCounterClockwise aria-hidden />
          Restart
        </Button>
        <Button
          aria-label="Close preview"
          iconOnly
          onClick={() => setPreviewOpen(false)}
          size="xs"
          variant="ghost"
        >
          <X aria-hidden />
        </Button>
      </div>
      <div className="pointer-events-auto">
        <PreviewRun
          key={runCount}
          onClose={() => setPreviewOpen(false)}
          survey={publicSurvey}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
        />
      </div>
    </section>
  );
}

interface PreviewRunProps {
  onClose: () => void;
  survey: PublicSurvey;
  theme: SurveyTheme;
}

function PreviewRun({ onClose, survey, theme }: PreviewRunProps) {
  const session = useSurveySession(survey, { transport: previewTransport });
  return (
    <SurveyCard
      onClose={onClose}
      session={session}
      theme={theme}
      variant="floating"
    />
  );
}
