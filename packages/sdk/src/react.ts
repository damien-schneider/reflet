/**
 * Reflet SDK - React Bindings
 *
 * React hooks and components for the Reflet SDK.
 *
 * @example
 * ```tsx
 * import { RefletProvider, useFeedbackList, useVote } from '@reflet/sdk/react';
 *
 * function App() {
 *   return (
 *     <RefletProvider publicKey="fb_pub_xxx" user={currentUser}>
 *       <FeedbackList />
 *     </RefletProvider>
 *   );
 * }
 *
 * function FeedbackList() {
 *   const { data, isLoading } = useFeedbackList({ sortBy: 'votes' });
 *   const { mutate: vote } = useVote();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return data?.items.map(item => (
 *     <div key={item.id}>
 *       <h3>{item.title}</h3>
 *       <button onClick={() => vote({ feedbackId: item.id })}>
 *         {item.voteCount} votes
 *       </button>
 *     </div>
 *   ));
 * }
 * ```
 */

// Surveys
export type {
  AnswerValue,
  PublicSurvey,
  SurveyEnding,
  SurveyPosition,
  SurveyQuestion,
} from "@reflet/survey-core";
export type {
  SurveySessionCallbacks,
  SurveySessionSnapshot,
  SurveyTransport,
} from "@reflet/survey-core/client";
// biome-ignore lint/performance/noBarrelFile: SDK packages need clean export API
export { previewTransport, SurveySession } from "@reflet/survey-core/client";
// Re-export client for advanced usage
export { Reflet } from "./client";
// Changelog Widget Component
export { ChangelogWidget } from "./react-changelog-widget";
export type { RefletContextValue, RefletProviderProps } from "./react-context";
// Provider
export {
  RefletContext,
  RefletProvider,
  useRefletClient,
  useRefletContext,
} from "./react-context";
export type { FeedbackButtonProps } from "./react-feedback-button";
// Feedback Components
export { FeedbackButton } from "./react-feedback-button";
export type {
  FeedbackDialogLabels,
  FeedbackDialogProps,
} from "./react-feedback-dialog";
export { FeedbackDialog } from "./react-feedback-dialog";
// Hooks - Mutations
export {
  useAddComment,
  useCreateFeedback,
  useSubscription,
  useVote,
} from "./react-mutation-hooks";
// Hooks - Queries
export type { UseFeedbackListOptions } from "./react-query-hooks";
export {
  useChangelog,
  useComments,
  useFeedback,
  useFeedbackList,
  useOrganizationConfig,
  useRoadmap,
  useUnreadChangelogCount,
} from "./react-query-hooks";
export type {
  SurveyCardProps,
  SurveyCardVariant,
  SurveyTheme,
} from "./surveys/card/survey-card";
export { SurveyCard } from "./surveys/card/survey-card";
export { createRefletSurveyTransport } from "./surveys/client-transport";
export type { RefletSurveysCallbacks } from "./surveys/controller";
export type { RefletSurveysProps } from "./surveys/reflet-surveys";
export { RefletSurveys } from "./surveys/reflet-surveys";
export type { RefletSurveysApi } from "./surveys/use-reflet-surveys";
export { useRefletSurveys } from "./surveys/use-reflet-surveys";
export type {
  SurveySessionHandle,
  UseSurveySessionOptions,
} from "./surveys/use-survey-session";
export { useSurveySession } from "./surveys/use-survey-session";
// Re-export types from main package
export type {
  AddCommentParams,
  ChangelogEntry,
  Comment,
  CreateFeedbackParams,
  FeedbackDetail,
  FeedbackItem,
  FeedbackListParams,
  FeedbackStatus,
  FeedbackTag,
  OrganizationConfig,
  OrganizationSettings,
  OrganizationStatus,
  RefletConfig,
  RefletUser,
  Roadmap,
  RoadmapItem,
  RoadmapLane,
} from "./types";
