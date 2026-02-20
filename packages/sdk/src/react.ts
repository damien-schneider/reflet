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

// Re-export client for advanced usage
// biome-ignore lint/performance/noBarrelFile: SDK packages need clean export API
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
  FeedbackCategory,
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
