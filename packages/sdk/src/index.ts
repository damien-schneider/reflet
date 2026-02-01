/**
 * Reflet SDK
 *
 * Official SDK for integrating Reflet feedback collection into your application.
 *
 * @packageDocumentation
 *
 * @example Basic usage
 * ```ts
 * import { Reflet } from '@reflet/sdk';
 *
 * const reflet = new Reflet({
 *   publicKey: 'fb_pub_xxx',
 *   user: { id: 'user_123', email: 'user@example.com', name: 'John' }
 * });
 *
 * // List feedback
 * const { items } = await reflet.list({ status: 'open' });
 *
 * // Vote on feedback
 * await reflet.vote('feedback_id');
 *
 * // Submit new feedback
 * await reflet.create({ title: 'Great idea', description: 'Details...' });
 * ```
 *
 * @example Server-side user signing
 * ```ts
 * // On your server
 * import { signUser } from '@reflet/sdk/server';
 *
 * const { token } = signUser(
 *   { id: user.id, email: user.email, name: user.name },
 *   process.env.REFLET_SECRET_KEY!
 * );
 *
 * // On the client
 * import { Reflet } from '@reflet/sdk';
 *
 * const reflet = new Reflet({
 *   publicKey: 'fb_pub_xxx',
 *   userToken: token, // From your server
 * });
 * ```
 *
 * @example React usage
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

// Main client
// biome-ignore lint/performance/noBarrelFile: SDK packages need clean export API
export { Reflet } from "./client";

// Types
export type {
  AddCommentParams,
  AddCommentResponse,
  ChangelogEntry,
  Comment,
  CommentReply,
  CreateFeedbackParams,
  CreateFeedbackResponse,
  FeedbackAuthor,
  FeedbackDetail,
  FeedbackItem,
  FeedbackListParams,
  FeedbackListResponse,
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
  SubscribeResponse,
  UnsubscribeResponse,
  VoteResponse,
} from "./types";

// Errors
export {
  RefletAuthError,
  RefletError,
  RefletNotFoundError,
  RefletValidationError,
} from "./types";
