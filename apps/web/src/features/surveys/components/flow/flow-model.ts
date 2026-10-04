import type { api } from "@reflet/backend/convex/_generated/api";
import {
  type FlowIssue,
  flowIssues,
  hasBlockingIssues,
  type SurveyEnding,
} from "@reflet/survey-core";
import type { FunctionReturnType } from "convex/server";
import {
  type FlowConnection,
  type FlowLayoutNode,
  flowConnections,
  layoutSurveyFlow,
} from "@/features/surveys/lib/flow/layout";
import type { SurveyQuestion } from "@/store/surveys";

export type FlowSurvey = NonNullable<
  FunctionReturnType<typeof api.surveys.queries.get>
>;

export type SurveyAnalytics = FunctionReturnType<
  typeof api.surveys.analytics.getAnalytics
>;

export interface QuestionStats {
  answered: number;
  dropOffs: number;
  reached: number;
}

export interface FlowStats {
  byEnding: ReadonlyMap<string, number>;
  byQuestion: ReadonlyMap<string, QuestionStats>;
  started: number;
}

export interface FlowModel {
  connections: FlowConnection[];
  endings: SurveyEnding[];
  hasBlockingIssues: boolean;
  issues: FlowIssue[];
  issuesByQuestion: ReadonlyMap<string, FlowIssue[]>;
  layout: FlowLayoutNode[];
  questions: SurveyQuestion[];
  /** Present once the survey has at least one response. */
  stats: FlowStats | null;
  survey: FlowSurvey;
}

const statsFrom = (
  analytics: SurveyAnalytics | undefined
): FlowStats | null => {
  if (!analytics || analytics.totalResponses === 0) {
    return null;
  }
  return {
    byEnding: new Map(
      analytics.endings.map((ending) => [ending.endingId, ending.count])
    ),
    byQuestion: new Map(
      analytics.questionStats.map((stat) => [
        stat.questionId,
        {
          answered: stat.answered,
          dropOffs: stat.dropOffs,
          reached: stat.reached,
        },
      ])
    ),
    started: analytics.sampledResponses ?? analytics.totalResponses,
  };
};

export const buildFlowModel = (
  survey: FlowSurvey,
  analytics: SurveyAnalytics | undefined
): FlowModel => {
  const { endings, questions } = survey;
  const issues = flowIssues(questions, endings);
  const issuesByQuestion = new Map<string, FlowIssue[]>();
  for (const issue of issues) {
    if (issue.questionId) {
      issuesByQuestion.set(issue.questionId, [
        ...(issuesByQuestion.get(issue.questionId) ?? []),
        issue,
      ]);
    }
  }
  return {
    connections: flowConnections(questions, endings),
    endings,
    hasBlockingIssues: hasBlockingIssues(issues),
    issues,
    issuesByQuestion,
    layout: layoutSurveyFlow(questions, endings),
    questions,
    stats: statsFrom(analytics),
    survey,
  };
};

/** Share of respondents who reached a step and stopped there, as a whole percent. */
export const dropOffPercent = ({ dropOffs, reached }: QuestionStats): number =>
  reached === 0 ? 0 : Math.round((dropOffs / reached) * 100);
