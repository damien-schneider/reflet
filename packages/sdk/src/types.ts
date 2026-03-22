/**
 * Reflet SDK Types
 */

// ============================================
// Configuration
// ============================================

export interface RefletConfig {
  /** API base URL (optional, defaults to Reflet production API) */
  baseUrl?: string;
  /** Your organization's public API key (fb_pub_xxx) */
  publicKey: string;
  /** User identification for SSO */
  user?: RefletUser;
  /** Pre-signed user token (alternative to user object) */
  userToken?: string;
}

export interface RefletUser {
  /** URL to user's avatar image */
  avatar?: string;
  /** User's email address */
  email?: string;
  /** Unique identifier for the user in your system */
  id: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** User's display name */
  name?: string;
}

// ============================================
// API Responses
// ============================================

export interface OrganizationConfig {
  description?: string;
  id: string;
  isPublic: boolean;
  logo?: string;
  name: string;
  primaryColor?: string;
  settings?: OrganizationSettings;
  slug: string;
  statuses: OrganizationStatus[];
}

export interface OrganizationSettings {
  allowAnonymousVoting?: boolean;
  defaultStatus?: FeedbackStatus;
  requireApproval?: boolean;
}

export interface OrganizationStatus {
  color: string;
  icon?: string;
  id: string;
  name: string;
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
  author: FeedbackAuthor | null;
  commentCount: number;
  completedAt?: number;
  createdAt: number;
  description: string;
  hasVoted: boolean;
  id: string;
  isPinned: boolean;
  organizationStatus: {
    id: string;
    name: string;
    color: string;
  } | null;
  status: FeedbackStatus;
  tags: FeedbackTag[];
  title: string;
  updatedAt: number;
  voteCount: number;
}

export interface FeedbackDetail extends FeedbackItem {
  isSubscribed: boolean;
}

export interface FeedbackTag {
  color: string;
  id: string;
  name: string;
}

export interface FeedbackAuthor {
  avatar?: string;
  email?: string;
  isExternal: boolean;
  name?: string;
}

export interface FeedbackListResponse {
  hasMore: boolean;
  items: FeedbackItem[];
  total: number;
}

export interface FeedbackListParams {
  /** Number of items to return (max 100) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Search in title and description */
  search?: string;
  /** Sort order */
  sortBy?: "votes" | "newest" | "oldest" | "comments";
  /** Filter by status name */
  status?: FeedbackStatus;
  /** Filter by custom status ID */
  statusId?: string;
}

export interface CreateFeedbackParams {
  description: string;
  title: string;
}

export interface CreateFeedbackResponse {
  feedbackId: string;
  isApproved: boolean;
}

export interface VoteResponse {
  voteCount: number;
  voted: boolean;
}

// ============================================
// Comments
// ============================================

export interface Comment {
  author: FeedbackAuthor | null;
  body: string;
  createdAt: number;
  id: string;
  isOfficial: boolean;
  replies: CommentReply[];
  updatedAt: number;
}

export interface CommentReply {
  author: FeedbackAuthor | null;
  body: string;
  createdAt: number;
  id: string;
  isOfficial: boolean;
  updatedAt: number;
}

export interface AddCommentParams {
  body: string;
  feedbackId: string;
  parentId?: string;
}

export interface AddCommentResponse {
  commentId: string;
}

// ============================================
// Subscriptions
// ============================================

export interface SubscribeResponse {
  alreadySubscribed?: boolean;
  subscribed: boolean;
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
  color: string;
  id: string;
  items: RoadmapItem[];
  name: string;
}

export interface RoadmapItem {
  id: string;
  status: FeedbackStatus;
  title: string;
  voteCount: number;
}

// ============================================
// Changelog
// ============================================

export interface ChangelogEntry {
  description?: string;
  feedback: { id: string; title: string }[];
  id: string;
  publishedAt?: number;
  title: string;
  version?: string;
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
