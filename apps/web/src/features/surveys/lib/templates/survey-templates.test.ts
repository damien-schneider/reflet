import type { DraftTarget } from "@reflet/backend/convex/surveys/lib/ai_draft_schema";
import { endingsOf, flowIssues } from "@reflet/survey-core";
import { describe, expect, it } from "vitest";
import { resolveDraftQuestions } from "@/features/surveys/lib/flow/drafts";
import { SURVEY_TEMPLATES } from "@/features/surveys/lib/templates/survey-templates";

const templateCases = SURVEY_TEMPLATES.map(
  (template) => [template.name, template] as const
);

describe("survey templates", () => {
  it.each(templateCases)(
    "“%s” is a valid flow with no issues once created",
    (_name, template) => {
      const ids = template.questions.map((_, index) => `q${index}`);
      const questions = resolveDraftQuestions(
        template.questions,
        ids,
        template.endings
      );
      expect(questions).toHaveLength(template.questions.length);
      expect(flowIssues(questions, template.endings)).toEqual([]);
    }
  );

  it.each(templateCases)(
    "“%s” branches, and only to steps and endings it defines",
    (_name, template) => {
      const endingIds = endingsOf(template.endings).map((ending) => ending.id);
      const targets: DraftTarget[] = template.questions.flatMap((question) => [
        ...(question.logic ?? []).map((rule) => rule.target),
        ...(question.next ? [question.next] : []),
      ]);
      expect(
        template.questions.some((question) => (question.logic?.length ?? 0) > 0)
      ).toBe(true);
      for (const target of targets) {
        if (target.kind === "ending") {
          expect(endingIds).toContain(target.endingId);
        } else {
          expect(target.questionIndex).toBeLessThan(template.questions.length);
        }
      }
    }
  );
});
