export interface SurveyListItem {
  _id: string;
  completedCount: number;
  completionRate: number;
  createdAt: number;
  description?: string;
  linkEnabled: boolean;
  questionCount: number;
  responseCount: number;
  status: string;
  title: string;
  triggerType: string;
}

export type SurveyFlowTarget =
  | { kind: "question"; questionId: string }
  | { kind: "ending"; endingId: string };

export type SurveyDraftTarget =
  | { kind: "question"; questionIndex: number }
  | { kind: "ending"; endingId: string };

export interface SurveyLogicRule<Target> {
  id: string;
  operator: string;
  target: Target;
  value?: string | number | boolean;
}

export interface SurveyEnding {
  buttonLabel?: string;
  buttonUrl?: string;
  description?: string;
  id: string;
  title: string;
}

export interface SurveyDisplay {
  frequency: "once" | "until_completed" | "recurring";
  position?: "bottom_right" | "bottom_left" | "center";
  recontactDays?: number;
}

export interface SurveyTriggerConfig {
  delayMs?: number;
  eventName?: string;
  pageUrl?: string;
  sampleRate?: number;
}

/** Jumps reference other questions by their index in the `questions` array. */
export interface SurveyQuestionDraft {
  config?: Record<string, unknown>;
  description?: string;
  logic?: SurveyLogicRule<SurveyDraftTarget>[];
  next?: SurveyDraftTarget;
  required?: boolean;
  title: string;
  type: string;
}

export interface SurveyDetailResponse {
  _id: string;
  completedCount: number;
  completionRate: number;
  createdAt: number;
  description?: string;
  display: SurveyDisplay;
  endings: SurveyEnding[];
  endsAt?: number;
  linkEnabled: boolean;
  maxResponses?: number;
  organizationId: string;
  questions: Array<{
    _id: string;
    type: string;
    title: string;
    description?: string;
    required: boolean;
    order: number;
    config?: Record<string, unknown>;
    logic?: SurveyLogicRule<SurveyFlowTarget>[];
    next?: SurveyFlowTarget;
  }>;
  responseCount: number;
  startsAt?: number;
  status: string;
  title: string;
  triggerConfig?: SurveyTriggerConfig;
  triggerType: string;
}

export interface SurveyAnalyticsResponse {
  abandonedResponses: number;
  completedResponses: number;
  completionRate: number;
  endings: Array<{ endingId: string; title: string; count: number }>;
  inProgressResponses: number;
  medianCompletionMs: number | null;
  nps: {
    questionId: string;
    score: number | null;
    promoters: number;
    passives: number;
    detractors: number;
    total: number;
  } | null;
  questionStats: Array<{
    questionId: string;
    title: string;
    type: string;
    order: number;
    reached: number;
    answered: number;
    dropOffs: number;
    averageValue?: number;
    distribution?: Array<{ label: string; count: number }>;
    otherAnswers?: string[];
    recentTextAnswers?: Array<{ value: string; answeredAt: number }>;
  }>;
  responsesByDay: Array<{ date: string; started: number; completed: number }>;
  sampledResponses: number | null;
  totalResponses: number;
}

export interface SurveyResponseItem {
  _id: string;
  answers: Array<{
    questionId: string;
    questionTitle: string;
    questionType: string;
    value: string | number | boolean | string[];
  }>;
  channel: "in_app" | "link";
  completedAt?: number;
  endingId?: string;
  pageUrl?: string;
  respondent: {
    id?: string;
    identified: boolean;
    name?: string;
    email?: string;
  };
  startedAt: number;
  status: string;
}

export interface SurveyResponsePage {
  continueCursor: string;
  isDone: boolean;
  page: SurveyResponseItem[];
}
