import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { QuestionDraft } from "@reflet/backend/convex/surveys/lib/ai_draft_schema";
import {
  flowIssues,
  type SurveyEnding,
  takesAnswer,
} from "@reflet/survey-core";
import { useMutation } from "convex/react";
import type { FlowModel } from "@/features/surveys/components/flow/flow-model";
import { convexErrorMessage } from "@/features/surveys/lib/convex-error-message";
import { createRuleId, newRule } from "@/features/surveys/lib/flow/rules";
import type {
  FlowStepRef,
  QuestionId,
  QuestionTarget,
  SurveyQuestion,
} from "@/store/surveys";

export interface InsertAnchor {
  /** Insert after this question; `null` inserts first, `undefined` appends. */
  after: QuestionId | null | undefined;
  /** The jump being split, which must now lead to the first inserted step. */
  splits?: { questionId: QuestionId; ruleId?: string };
}

const NEW_ENDING: Omit<SurveyEnding, "id"> = {
  description: "Thanks for taking the time to answer.",
  title: "Thank you!",
};

/** Every write the flow editor makes, with errors surfaced as toasts. */
export function useFlowActions(model: FlowModel): FlowActions {
  const surveyId = model.survey._id;
  const insertStepsMutation = useMutation(api.surveys.mutations.insertSteps);
  const updateQuestion = useMutation(api.surveys.mutations.updateQuestion);
  const deleteQuestion = useMutation(api.surveys.mutations.deleteQuestion);
  const reorderQuestions = useMutation(api.surveys.mutations.reorderQuestions);
  const updateSurvey = useMutation(
    api.surveys.mutations.update
  ).withOptimisticUpdate((localStore, args) => {
    const survey = localStore.getQuery(api.surveys.queries.get, { surveyId });
    if (survey && args.endings) {
      localStore.setQuery(
        api.surveys.queries.get,
        { surveyId },
        { ...survey, endings: args.endings }
      );
    }
  });

  const targetForNode = (nodeId: string): QuestionTarget | null => {
    const question = model.questions.find((q) => q._id === nodeId);
    if (question) {
      return { kind: "question", questionId: question._id };
    }
    const node = model.layout.find((candidate) => candidate.id === nodeId);
    return node?.kind === "ending"
      ? { endingId: node.endingId, kind: "ending" }
      : null;
  };

  const insertSteps = async (
    anchor: InsertAnchor,
    drafts: QuestionDraft[]
  ): Promise<QuestionId[]> => {
    try {
      return await insertStepsMutation({
        after: anchor.after,
        drafts,
        splits: anchor.splits,
        surveyId,
      });
    } catch (error) {
      toast.error(
        convexErrorMessage(error, "Couldn’t add the step. Try again.")
      );
      return [];
    }
  };

  const moveQuestion = async (questionId: QuestionId, offset: -1 | 1) => {
    const ids = model.questions.map((question) => question._id);
    const from = ids.indexOf(questionId);
    const to = from + offset;
    const moved = ids[from];
    const displaced = ids[to];
    if (moved === undefined || displaced === undefined) {
      return;
    }
    ids[to] = moved;
    ids[from] = displaced;
    try {
      await reorderQuestions({ questionIds: ids, surveyId });
    } catch (error) {
      toast.error(
        convexErrorMessage(error, "Couldn’t move this step. Try again.")
      );
    }
  };

  const removeQuestion = async (questionId: QuestionId) => {
    try {
      await deleteQuestion({ questionId });
      return true;
    } catch (error) {
      toast.error(
        convexErrorMessage(error, "Couldn’t delete this step. Try again.")
      );
      return false;
    }
  };

  /** Asks core what would break if `source` jumped to `target`; only new problems count. */
  const jumpProblem = (source: SurveyQuestion, target: QuestionTarget) => {
    const knownMessages = new Set(
      model.issuesByQuestion.get(source._id)?.map((issue) => issue.message)
    );
    const withJump = model.questions.map((q) =>
      q._id === source._id ? { ...q, logic: [], next: target } : q
    );
    return flowIssues(withJump, model.endings).find(
      (issue) =>
        issue.questionId === source._id &&
        issue.ruleId === undefined &&
        !knownMessages.has(issue.message)
    );
  };

  /** Dragging a connection: a rule for questions that take answers, the default path otherwise. */
  const connect = async (
    sourceId: string,
    targetNodeId: string
  ): Promise<FlowStepRef | null> => {
    const source = model.questions.find((q) => q._id === sourceId);
    const target = targetForNode(targetNodeId);
    if (!(source && target)) {
      return null;
    }
    const problem = jumpProblem(source, target);
    if (problem) {
      toast.error(problem.message);
      return null;
    }
    const rule = takesAnswer(source.type) ? newRule(source, target) : null;
    try {
      await (rule
        ? updateQuestion({
            logic: [...(source.logic ?? []), rule],
            questionId: source._id,
          })
        : updateQuestion({ next: target, questionId: source._id }));
    } catch (error) {
      toast.error(convexErrorMessage(error, "Couldn’t connect these steps."));
      return null;
    }
    return { kind: "question", questionId: source._id, ruleId: rule?.id };
  };

  const saveEndings = async (endings: SurveyEnding[]) => {
    try {
      await updateSurvey({ endings, surveyId });
      return true;
    } catch (error) {
      toast.error(
        convexErrorMessage(error, "Couldn’t save the endings. Try again.")
      );
      return false;
    }
  };

  const addEnding = async (): Promise<FlowStepRef | null> => {
    const ending = { ...NEW_ENDING, id: createRuleId() };
    const saved = await saveEndings([...model.endings, ending]);
    return saved ? { endingId: ending.id, kind: "ending" } : null;
  };

  return {
    addEnding,
    connect,
    insertSteps,
    moveQuestion,
    removeQuestion,
    saveEndings,
  };
}

export interface FlowActions {
  addEnding: () => Promise<FlowStepRef | null>;
  connect: (
    sourceId: string,
    targetNodeId: string
  ) => Promise<FlowStepRef | null>;
  insertSteps: (
    anchor: InsertAnchor,
    drafts: QuestionDraft[]
  ) => Promise<QuestionId[]>;
  moveQuestion: (questionId: QuestionId, offset: -1 | 1) => Promise<void>;
  removeQuestion: (questionId: QuestionId) => Promise<boolean>;
  saveEndings: (endings: SurveyEnding[]) => Promise<boolean>;
}
