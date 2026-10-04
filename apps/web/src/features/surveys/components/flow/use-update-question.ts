import { toast } from "@ctrl-ui/react/ui/toast";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import type { FunctionArgs } from "convex/server";
import { convexErrorMessage } from "@/lib/convex-error-message";

export type QuestionPatch = Omit<
  FunctionArgs<typeof api.surveys.mutations.updateQuestion>,
  "questionId"
>;

/** Saves question edits with an optimistic update, so the canvas and inspector react immediately. */
export function useUpdateQuestion(surveyId: Id<"surveys">) {
  const updateQuestion = useMutation(
    api.surveys.mutations.updateQuestion
  ).withOptimisticUpdate((localStore, args) => {
    const survey = localStore.getQuery(api.surveys.queries.get, { surveyId });
    if (!survey) {
      return;
    }
    const questions = survey.questions.map((question) => {
      if (question._id !== args.questionId) {
        return question;
      }
      return {
        ...question,
        config: args.config ?? question.config,
        description: args.description ?? question.description,
        logic: args.logic ?? question.logic,
        next:
          args.next === undefined ? question.next : (args.next ?? undefined),
        required: args.required ?? question.required,
        title: args.title ?? question.title,
        type: args.type ?? question.type,
      };
    });
    localStore.setQuery(
      api.surveys.queries.get,
      { surveyId },
      { ...survey, questions }
    );
  });

  return async (
    questionId: Id<"surveyQuestions">,
    patch: QuestionPatch
  ): Promise<boolean> => {
    try {
      await updateQuestion({ questionId, ...patch });
      return true;
    } catch (error) {
      toast.error(
        convexErrorMessage(error, "Couldn’t save this step. Try again.")
      );
      return false;
    }
  };
}
