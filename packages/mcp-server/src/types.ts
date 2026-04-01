/**
 * Response types for the Reflet Admin API.
 *
 * IDs are plain strings (Convex branded Id<T> types are not
 * available outside the backend package).
 */

// ============================================
// Common
// ============================================

export interface SuccessResponse {
  success: boolean;
}

export interface CreatedResponse {
  id: string;
}

// ============================================
// Feedback (public endpoints)
// ============================================

export interface FeedbackAuthor {
  avatar?: string;
  email?: string;
  isExternal: boolean;
  name?: string;
}

export interface FeedbackTag {
  color: string;
  id: string;
  name: string;
  slug: string;
}

export interface OrganizationStatusRef {
  color: string;
  id: string;
  name: string;
}

export interface ConfigResponse {
  feedbackSettings?: Record<string, unknown>;
  id: string;
  isPublic: boolean;
  logo?: string;
  name: string;
  primaryColor?: string;
  slug: string;
  statuses: Array<{
    id: string;
    name: string;
    color: string;
    icon?: string;
    order: number;
  }>;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
    color: string;
    description?: string;
  }>;
}

export interface FeedbackItem {
  author?: FeedbackAuthor | null;
  commentCount: number;
  completedAt?: number;
  createdAt: number;
  description: string;
  hasVoted: boolean;
  id: string;
  isPinned: boolean;
  organizationStatus?: OrganizationStatusRef | null;
  status: string;
  tags: FeedbackTag[];
  title: string;
  updatedAt: number;
  voteCount: number;
}

export interface FeedbackListResponse {
  hasMore: boolean;
  items: FeedbackItem[];
  total: number;
}

export interface FeedbackDetailResponse extends FeedbackItem {
  isSubscribed: boolean;
}

export interface CreateFeedbackResponse {
  feedbackId: string;
  isApproved: boolean;
}

export interface VoteResponse {
  voteCount: number;
  voted: boolean;
}

export interface CommentResponse {
  author?: FeedbackAuthor | null;
  body: string;
  createdAt: number;
  id: string;
  isOfficial: boolean;
  replies: Array<{
    id: string;
    body: string;
    isOfficial: boolean;
    author?: FeedbackAuthor | null;
    createdAt: number;
    updatedAt: number;
  }>;
  updatedAt: number;
}

export interface RoadmapResponse {
  lanes: Array<{
    id: string;
    name: string;
    slug: string;
    color: string;
    items: Array<{
      id: string;
      title: string;
      status: string;
      voteCount: number;
    }>;
  }>;
}

export interface ChangelogEntryResponse {
  description?: string;
  id: string;
  items: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  publishedAt: number;
  title: string;
  version?: string;
}

// ============================================
// Tags
// ============================================

export interface TagResponse {
  color: string;
  createdAt: number;
  description?: string;
  icon?: string;
  id: string;
  isPublic?: boolean;
  name: string;
  slug: string;
}

// ============================================
// Releases
// ============================================

export interface ReleaseListItem {
  createdAt: number;
  description?: string;
  feedbackCount: number;
  id: string;
  publishedAt?: number;
  title: string;
  updatedAt: number;
  version?: string;
}

export interface ReleaseListResponse {
  hasMore: boolean;
  items: ReleaseListItem[];
  total: number;
}

export interface ReleaseDetailResponse {
  createdAt: number;
  description?: string;
  id: string;
  linkedFeedback: Array<{
    id: string;
    title: string;
    status: string;
    voteCount: number;
  }>;
  publishedAt?: number;
  title: string;
  updatedAt: number;
  version?: string;
}

// ============================================
// Milestones
// ============================================

export interface MilestoneListItem {
  color: string;
  completedAt?: number;
  createdAt: number;
  description?: string;
  emoji?: string;
  feedbackCount: number;
  id: string;
  isPublic: boolean;
  name: string;
  status: string;
  targetDate?: number;
  timeHorizon: string;
}

export interface MilestoneDetailResponse {
  color: string;
  completedAt?: number;
  createdAt: number;
  description?: string;
  emoji?: string;
  id: string;
  isPublic: boolean;
  linkedFeedback: Array<{
    id: string;
    title: string;
    status: string;
    voteCount: number;
  }>;
  name: string;
  status: string;
  targetDate?: number;
  timeHorizon: string;
}

// ============================================
// Statuses
// ============================================

export interface StatusResponse {
  color: string;
  icon?: string;
  id: string;
  name: string;
  order: number;
}

// ============================================
// Members & Invitations
// ============================================

export interface MemberResponse {
  createdAt: number;
  id: string;
  role: string;
  userId: string;
}

export interface InvitationResponse {
  createdAt: number;
  email: string;
  expiresAt: number;
  id: string;
  role: string;
  status: string;
}

// ============================================
// Organization
// ============================================

export interface OrganizationResponse {
  changelogSettings?: Record<string, unknown>;
  createdAt: number;
  feedbackSettings?: Record<string, unknown>;
  id: string;
  isPublic: boolean;
  logo?: string;
  name: string;
  primaryColor?: string;
  slug: string;
  subscriptionStatus?: string;
  subscriptionTier?: string;
  supportEnabled: boolean;
}

// ============================================
// Duplicates
// ============================================

export interface DuplicatePairResponse {
  _id: string;
  detectedAt: number;
  feedbackA: {
    _id: string;
    title: string;
    description: string;
    voteCount: number;
    status: string;
  };
  feedbackB: {
    _id: string;
    title: string;
    description: string;
    voteCount: number;
    status: string;
  };
  similarityScore: number;
}

// ============================================
// Screenshots
// ============================================

export interface ScreenshotResponse {
  _id: string;
  captureSource: string;
  createdAt: number;
  filename: string;
  mimeType: string;
  pageUrl?: string;
  size: number;
  url: string | null;
}

// ============================================
// Surveys
// ============================================

export interface SurveyListItem {
  _id: string;
  completionRate: number;
  createdAt: number;
  description?: string;
  questionCount: number;
  responseCount: number;
  status: string;
  title: string;
  triggerType: string;
}

export interface SurveyDetailResponse {
  _id: string;
  completionRate: number;
  createdAt: number;
  description?: string;
  endsAt?: number;
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
  }>;
  responseCount: number;
  startsAt?: number;
  status: string;
  title: string;
  triggerConfig: Record<string, unknown>;
  triggerType: string;
}

export interface SurveyAnalyticsResponse {
  completedResponses: number;
  completionRate: number;
  questionStats: Array<{
    questionId: string;
    title: string;
    type: string;
    totalAnswers: number;
    averageValue?: number;
    distribution?: Array<{
      label: string;
      count: number;
    }>;
  }>;
  totalResponses: number;
}

export interface SurveyResponseItem {
  _id: string;
  answerCount: number;
  completedAt?: number;
  pageUrl?: string;
  respondentId?: string;
  startedAt: number;
  status: string;
}
