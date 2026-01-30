/**
 * Reflet SDK Types
 */

// ============================================
// Configuration
// ============================================

export interface RefletConfig {
  /** Your board's public API key (fb_pub_xxx) */
  publicKey: string;
  /** Your Convex deployment URL (e.g., https://your-deployment.convex.cloud) */
  baseUrl: string;
  /** User identification for SSO */
  user?: RefletUser;
  /** Pre-signed user token (alternative to user object) */
  userToken?: string;
}

export interface RefletUser {
  /** Unique identifier for the user in your system */
  id: string;
  /** User's email address */
  email?: string;
  /** User's display name */
  name?: string;
  /** URL to user's avatar image */
  avatar?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================
// API Responses
// ============================================

export interface BoardConfig {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isPublic: boolean;
  settings?: BoardSettings;
  organization: {
    id: string;
    name: string;
    slug: string;
    logo?: string;
    primaryColor?: string;
  };
  statuses: BoardStatus[];
}

export interface BoardSettings {
  allowAnonymousVoting?: boolean;
  requireApproval?: boolean;
  defaultStatus?: FeedbackStatus;
}

export interface BoardStatus {
  id: string;
  name: string;
  color: string;
  icon?: string;
  order: number;
}

export type FeedbackStatus =
  | "open"
  | "under_review"
  | "planned"
  | "in_progress"
  | "completed"
  | "closed";

// ============================================
// Feedback
// ============================================

export interface FeedbackItem {
  id: string;
  title: string;
  description: string;
  status: FeedbackStatus;
  voteCount: number;
  commentCount: number;
  isPinned: boolean;
  hasVoted: boolean;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  tags: FeedbackTag[];
  boardStatus: {
    id: string;
    name: string;
    color: string;
  } | null;
  author: FeedbackAuthor | null;
}

export interface FeedbackDetail extends FeedbackItem {
  isSubscribed: boolean;
}

export interface FeedbackTag {
  id: string;
  name: string;
  color: string;
}

export interface FeedbackAuthor {
  name?: string;
  email?: string;
  avatar?: string;
  isExternal: boolean;
}

export interface FeedbackListResponse {
  items: FeedbackItem[];
  total: number;
  hasMore: boolean;
}

export interface FeedbackListParams {
  /** Filter by custom status ID */
  statusId?: string;
  /** Filter by status name */
  status?: FeedbackStatus;
  /** Search in title and description */
  search?: string;
  /** Sort order */
  sortBy?: "votes" | "newest" | "oldest" | "comments";
  /** Number of items to return (max 100) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

export interface CreateFeedbackParams {
  title: string;
  description: string;
}

export interface CreateFeedbackResponse {
  feedbackId: string;
  isApproved: boolean;
}

export interface VoteResponse {
  voted: boolean;
  voteCount: number;
}

// ============================================
// Comments
// ============================================

export interface Comment {
  id: string;
  body: string;
  isOfficial: boolean;
  author: FeedbackAuthor | null;
  replies: CommentReply[];
  createdAt: number;
  updatedAt: number;
}

export interface CommentReply {
  id: string;
  body: string;
  isOfficial: boolean;
  author: FeedbackAuthor | null;
  createdAt: number;
  updatedAt: number;
}

export interface AddCommentParams {
  feedbackId: string;
  body: string;
  parentId?: string;
}

export interface AddCommentResponse {
  commentId: string;
}

// ============================================
// Subscriptions
// ============================================

export interface SubscribeResponse {
  subscribed: boolean;
  alreadySubscribed?: boolean;
}

export interface UnsubscribeResponse {
  unsubscribed: boolean;
  wasNotSubscribed?: boolean;
}

// ============================================
// Roadmap
// ============================================

export interface Roadmap {
  lanes: RoadmapLane[];
}

export interface RoadmapLane {
  id: string;
  name: string;
  color: string;
  items: RoadmapItem[];
}

export interface RoadmapItem {
  id: string;
  title: string;
  status: FeedbackStatus;
  voteCount: number;
}

// ============================================
// Changelog
// ============================================

export interface ChangelogEntry {
  id: string;
  title: string;
  description?: string;
  version?: string;
  publishedAt?: number;
  feedback: { id: string; title: string }[];
}

// ============================================
// Errors
// ============================================

export class RefletError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "RefletError";
    this.status = status;
    this.code = code;
  }
}

export class RefletAuthError extends RefletError {
  constructor(message: string) {
    super(message, 401, "AUTH_ERROR");
    this.name = "RefletAuthError";
  }
}

export class RefletValidationError extends RefletError {
  constructor(message: string) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "RefletValidationError";
  }
}

export class RefletNotFoundError extends RefletError {
  constructor(message: string) {
    super(message, 404, "NOT_FOUND");
    this.name = "RefletNotFoundError";
  }
}
