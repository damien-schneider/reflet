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
export type { RefletProviderProps } from "./react-context";

// Provider
export {
  RefletProvider,
  useRefletClient,
  useRefletContext,
} from "./react-context";
// Hooks - Queries
export type { UseFeedbackListOptions } from "./react-hooks";
// Hooks - Mutations
export {
  useAddComment,
  useBoardConfig,
  useChangelog,
  useComments,
  useCreateFeedback,
  useFeedback,
  useFeedbackList,
  useRoadmap,
  useSubscription,
  useVote,
} from "./react-hooks";
// Re-export types from main package
export type {
  AddCommentParams,
  BoardConfig,
  ChangelogEntry,
  Comment,
  CreateFeedbackParams,
  FeedbackDetail,
  FeedbackItem,
  FeedbackListParams,
  FeedbackStatus,
  FeedbackTag,
  RefletConfig,
  RefletUser,
  Roadmap,
  RoadmapItem,
  RoadmapLane,
} from "./types";
