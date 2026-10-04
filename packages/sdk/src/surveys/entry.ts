/**
 * Reflet SDK - survey rendering without in-app delivery: the headless session
 * hook, the presentational card and the transports behind them.
 *
 * @example Preview a draft survey (nothing is saved)
 * ```tsx
 * import { previewTransport, SurveyCard, useSurveySession } from 'reflet-sdk/surveys';
 *
 * function Preview({ survey }) {
 *   const session = useSurveySession(survey, { transport: previewTransport });
 *   return <SurveyCard session={session} variant="inline" />;
 * }
 * ```
 */

export type {
  AnswerValue,
  DisplayFrequency,
  FlowTarget,
  LogicOperator,
  LogicRule,
  PublicSurvey,
  QuestionConfig,
  QuestionType,
  RatingStyle,
  SurveyDisplay,
  SurveyEnding,
  SurveyPosition,
  SurveyQuestion,
  TriggerConfig,
  TriggerType,
} from "@reflet/survey-core";
export type {
  SurveySessionCallbacks,
  SurveySessionPhase,
  SurveySessionSnapshot,
  SurveyTransport,
} from "@reflet/survey-core/client";
// biome-ignore lint/performance/noBarrelFile: package entry for `reflet-sdk/surveys`
export { previewTransport, SurveySession } from "@reflet/survey-core/client";
export type {
  SurveyCardProps,
  SurveyCardVariant,
  SurveyTheme,
} from "./card/survey-card";
export { SurveyCard } from "./card/survey-card";
export { createRefletSurveyTransport } from "./client-transport";
export type {
  SurveySessionHandle,
  UseSurveySessionOptions,
} from "./use-survey-session";
export { useSessionHandle, useSurveySession } from "./use-survey-session";
