import type {
  ChangelogEntryResponse,
  CommentResponse,
  ConfigResponse,
  CreatedResponse,
  CreateFeedbackResponse,
  DuplicatePairResponse,
  FeedbackDetailResponse,
  FeedbackListResponse,
  InvitationResponse,
  MemberResponse,
  MilestoneDetailResponse,
  MilestoneListItem,
  OrganizationResponse,
  ReleaseDetailResponse,
  ReleaseListResponse,
  RoadmapResponse,
  ScreenshotResponse,
  StatusResponse,
  SuccessResponse,
  SurveyAnalyticsResponse,
  SurveyDetailResponse,
  SurveyListItem,
  SurveyResponseItem,
  TagResponse,
  VoteResponse,
} from "./types.js";

const DEFAULT_BASE_URL = "https://harmless-clam-802.convex.site";

interface ClientConfig {
  readonly baseUrl?: string;
  readonly secretKey: string;
}

export class RefletAdminClient {
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(config: ClientConfig) {
    this.secretKey = config.secretKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
    };

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to connect";
      throw new Error(`Network error: ${message}`);
    }

    const text = await response.text();

    if (!text) {
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return {} as T;
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON response (status ${response.status})`);
    }

    if (!response.ok) {
      const errorMessage =
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof (data as Record<string, unknown>).error === "string"
          ? (data as { error: string }).error
          : `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return data as T;
  }

  // ============================================
  // Query param helpers
  // ============================================

  private buildQuery(
    params: Record<string, string | number | boolean | undefined>
  ): string {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const query = searchParams.toString();
    return query ? `?${query}` : "";
  }

  // ============================================
  // FEEDBACK (existing public API)
  // ============================================

  getConfig(): Promise<ConfigResponse> {
    return this.request("GET", "/api/v1/feedback");
  }

  listFeedback(params?: {
    statusId?: string;
    tagId?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<FeedbackListResponse> {
    const query = this.buildQuery(params ?? {});
    return this.request("GET", `/api/v1/feedback/list${query}`);
  }

  getFeedback(feedbackId: string): Promise<FeedbackDetailResponse> {
    return this.request(
      "GET",
      `/api/v1/feedback/item?id=${encodeURIComponent(feedbackId)}`
    );
  }

  createFeedback(params: {
    title: string;
    description: string;
    tagId?: string;
  }): Promise<CreateFeedbackResponse> {
    return this.request("POST", "/api/v1/feedback/create", params);
  }

  voteFeedback(
    feedbackId: string,
    voteType?: "upvote" | "downvote"
  ): Promise<VoteResponse> {
    return this.request("POST", "/api/v1/feedback/vote", {
      feedbackId,
      voteType,
    });
  }

  listComments(
    feedbackId: string,
    sortBy?: "newest" | "oldest"
  ): Promise<CommentResponse[]> {
    const params = new URLSearchParams({ feedbackId });
    if (sortBy) {
      params.set("sortBy", sortBy);
    }
    return this.request("GET", `/api/v1/feedback/comments?${params}`);
  }

  createComment(params: {
    feedbackId: string;
    body: string;
    parentId?: string;
  }): Promise<CreatedResponse> {
    return this.request("POST", "/api/v1/feedback/comment", params);
  }

  getRoadmap(): Promise<RoadmapResponse> {
    return this.request("GET", "/api/v1/feedback/roadmap");
  }

  getChangelog(limit?: number): Promise<ChangelogEntryResponse[]> {
    const url = limit
      ? `/api/v1/feedback/changelog?limit=${limit}`
      : "/api/v1/feedback/changelog";
    return this.request("GET", url);
  }

  // ============================================
  // FEEDBACK ADMIN
  // ============================================

  updateFeedback(params: {
    feedbackId: string;
    title?: string;
    description?: string;
  }): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/feedback/update", params);
  }

  deleteFeedback(feedbackId: string): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/feedback/delete", {
      feedbackId,
    });
  }

  restoreFeedback(feedbackId: string): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/feedback/restore", {
      feedbackId,
    });
  }

  assignFeedback(
    feedbackId: string,
    assigneeId?: string
  ): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/feedback/assign", {
      feedbackId,
      assigneeId,
    });
  }

  setFeedbackStatus(
    feedbackId: string,
    statusId?: string,
    status?: string
  ): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/feedback/set-status", {
      feedbackId,
      statusId,
      status,
    });
  }

  updateFeedbackTags(
    feedbackId: string,
    addTagIds?: string[],
    removeTagIds?: string[]
  ): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/feedback/update-tags", {
      feedbackId,
      addTagIds,
      removeTagIds,
    });
  }

  updateFeedbackAnalysis(params: {
    feedbackId: string;
    priority?: string;
    complexity?: string;
    timeEstimate?: string;
    deadline?: number;
  }): Promise<SuccessResponse> {
    return this.request(
      "POST",
      "/api/v1/admin/feedback/update-analysis",
      params
    );
  }

  // ============================================
  // COMMENTS ADMIN
  // ============================================

  updateComment(commentId: string, body: string): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/comment/update", {
      commentId,
      body,
    });
  }

  deleteComment(commentId: string): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/comment/delete", {
      commentId,
    });
  }

  markCommentOfficial(
    commentId: string,
    isOfficial: boolean
  ): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/comment/mark-official", {
      commentId,
      isOfficial,
    });
  }

  // ============================================
  // TAGS
  // ============================================

  listTags(): Promise<TagResponse[]> {
    return this.request("GET", "/api/v1/admin/tags");
  }

  createTag(params: {
    name: string;
    color: string;
    icon?: string;
    description?: string;
    isPublic?: boolean;
  }): Promise<CreatedResponse> {
    return this.request("POST", "/api/v1/admin/tag/create", params);
  }

  updateTag(params: {
    tagId: string;
    name?: string;
    color?: string;
    icon?: string;
    description?: string;
    isPublic?: boolean;
  }): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/tag/update", params);
  }

  deleteTag(tagId: string): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/tag/delete", { tagId });
  }

  // ============================================
  // RELEASES
  // ============================================

  listReleases(params?: {
    status?: "draft" | "published" | "all";
    limit?: number;
    offset?: number;
  }): Promise<ReleaseListResponse> {
    const query = this.buildQuery(params ?? {});
    return this.request("GET", `/api/v1/admin/releases${query}`);
  }

  getRelease(releaseId: string): Promise<ReleaseDetailResponse | null> {
    return this.request(
      "GET",
      `/api/v1/admin/release?id=${encodeURIComponent(releaseId)}`
    );
  }

  createRelease(params: {
    title: string;
    description?: string;
    version?: string;
  }): Promise<CreatedResponse> {
    return this.request("POST", "/api/v1/admin/release/create", params);
  }

  updateRelease(params: {
    releaseId: string;
    title?: string;
    description?: string;
    version?: string;
  }): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/release/update", params);
  }

  publishRelease(releaseId: string): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/release/publish", {
      releaseId,
    });
  }

  unpublishRelease(releaseId: string): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/release/unpublish", {
      releaseId,
    });
  }

  deleteRelease(releaseId: string): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/release/delete", {
      releaseId,
    });
  }

  linkReleaseFeedback(
    releaseId: string,
    feedbackId: string,
    action: "link" | "unlink"
  ): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/release/link-feedback", {
      releaseId,
      feedbackId,
      action,
    });
  }

  scheduleRelease(params: {
    releaseId: string;
    scheduledPublishAt: number;
    feedbackStatus?: string;
  }): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/release/schedule", params);
  }

  cancelScheduledRelease(releaseId: string): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/release/cancel-schedule", {
      releaseId,
    });
  }

  // ============================================
  // MILESTONES
  // ============================================

  listMilestones(params?: {
    status?: "active" | "completed" | "archived" | "all";
  }): Promise<MilestoneListItem[]> {
    const query = this.buildQuery(params ?? {});
    return this.request("GET", `/api/v1/admin/milestones${query}`);
  }

  getMilestone(milestoneId: string): Promise<MilestoneDetailResponse | null> {
    return this.request(
      "GET",
      `/api/v1/admin/milestone?id=${encodeURIComponent(milestoneId)}`
    );
  }

  createMilestone(params: {
    name: string;
    description?: string;
    emoji?: string;
    color: string;
    timeHorizon: string;
    targetDate?: number;
    isPublic?: boolean;
  }): Promise<CreatedResponse> {
    return this.request("POST", "/api/v1/admin/milestone/create", params);
  }

  updateMilestone(params: {
    milestoneId: string;
    name?: string;
    description?: string;
    emoji?: string;
    color?: string;
    timeHorizon?: string;
    targetDate?: number;
    isPublic?: boolean;
  }): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/milestone/update", params);
  }

  completeMilestone(milestoneId: string): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/milestone/complete", {
      milestoneId,
    });
  }

  deleteMilestone(milestoneId: string): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/milestone/delete", {
      milestoneId,
    });
  }

  linkMilestoneFeedback(
    milestoneId: string,
    feedbackId: string,
    action: "link" | "unlink"
  ): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/milestone/link-feedback", {
      milestoneId,
      feedbackId,
      action,
    });
  }

  // ============================================
  // STATUSES
  // ============================================

  listStatuses(): Promise<StatusResponse[]> {
    return this.request("GET", "/api/v1/admin/statuses");
  }

  createStatus(params: {
    name: string;
    color: string;
    icon?: string;
  }): Promise<CreatedResponse> {
    return this.request("POST", "/api/v1/admin/status/create", params);
  }

  updateStatus(params: {
    statusId: string;
    name?: string;
    color?: string;
    icon?: string;
  }): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/status/update", params);
  }

  deleteStatus(statusId: string): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/status/delete", { statusId });
  }

  // ============================================
  // MEMBERS
  // ============================================

  listMembers(): Promise<MemberResponse[]> {
    return this.request("GET", "/api/v1/admin/members");
  }

  createInvitation(params: {
    email: string;
    role: "admin" | "member";
  }): Promise<CreatedResponse> {
    return this.request("POST", "/api/v1/admin/invitation/create", params);
  }

  cancelInvitation(invitationId: string): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/invitation/cancel", {
      invitationId,
    });
  }

  listInvitations(): Promise<InvitationResponse[]> {
    return this.request("GET", "/api/v1/admin/invitations");
  }

  // ============================================
  // ORGANIZATION
  // ============================================

  getOrganization(): Promise<OrganizationResponse | null> {
    return this.request("GET", "/api/v1/admin/organization");
  }

  updateOrganization(params: {
    name?: string;
    isPublic?: boolean;
    primaryColor?: string;
    supportEnabled?: boolean;
  }): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/organization/update", params);
  }

  // ============================================
  // DUPLICATES
  // ============================================

  listPendingDuplicates(): Promise<DuplicatePairResponse[]> {
    return this.request("GET", "/api/v1/admin/duplicates");
  }

  resolveDuplicate(params: {
    pairId: string;
    action: "confirm" | "reject";
  }): Promise<null> {
    return this.request("POST", "/api/v1/admin/duplicate/resolve", params);
  }

  mergeFeedback(params: {
    sourceFeedbackId: string;
    targetFeedbackId: string;
    pairId?: string;
  }): Promise<null> {
    return this.request("POST", "/api/v1/admin/duplicate/merge", params);
  }

  // ============================================
  // SCREENSHOTS
  // ============================================

  listScreenshots(feedbackId: string): Promise<ScreenshotResponse[]> {
    return this.request(
      "GET",
      `/api/v1/admin/screenshots?feedbackId=${encodeURIComponent(feedbackId)}`
    );
  }

  deleteScreenshot(screenshotId: string): Promise<null> {
    return this.request("POST", "/api/v1/admin/screenshot/delete", {
      screenshotId,
    });
  }

  // ============================================
  // SURVEYS
  // ============================================

  listSurveys(params?: {
    status?: "draft" | "active" | "paused" | "closed";
  }): Promise<SurveyListItem[]> {
    const query = this.buildQuery(params ?? {});
    return this.request("GET", `/api/v1/admin/surveys${query}`);
  }

  getSurvey(surveyId: string): Promise<SurveyDetailResponse | null> {
    return this.request(
      "GET",
      `/api/v1/admin/survey?id=${encodeURIComponent(surveyId)}`
    );
  }

  createSurvey(params: {
    title: string;
    description?: string;
    triggerType: string;
    triggerConfig?: {
      pageUrl?: string;
      delayMs?: number;
      sampleRate?: number;
    };
    questions: Array<{
      type: string;
      title: string;
      description?: string;
      required?: boolean;
      order?: number;
      config?: {
        minValue?: number;
        maxValue?: number;
        minLabel?: string;
        maxLabel?: string;
        choices?: string[];
        placeholder?: string;
        maxLength?: number;
      };
    }>;
  }): Promise<string> {
    return this.request("POST", "/api/v1/admin/survey/create", params);
  }

  updateSurveyStatus(
    surveyId: string,
    status: "draft" | "active" | "paused" | "closed"
  ): Promise<null> {
    return this.request("POST", "/api/v1/admin/survey/update-status", {
      surveyId,
      status,
    });
  }

  deleteSurvey(surveyId: string): Promise<null> {
    return this.request("POST", "/api/v1/admin/survey/delete", {
      surveyId,
    });
  }

  getSurveyAnalytics(surveyId: string): Promise<SurveyAnalyticsResponse> {
    return this.request(
      "GET",
      `/api/v1/admin/survey/analytics?id=${encodeURIComponent(surveyId)}`
    );
  }

  duplicateSurvey(surveyId: string, title?: string): Promise<string> {
    return this.request("POST", "/api/v1/admin/survey/duplicate", {
      surveyId,
      title,
    });
  }

  updateSurvey(params: {
    surveyId: string;
    title?: string;
    description?: string;
    triggerType?: string;
    triggerConfig?: {
      pageUrl?: string;
      delayMs?: number;
      sampleRate?: number;
    };
    maxResponses?: number;
  }): Promise<null> {
    return this.request("POST", "/api/v1/admin/survey/update", params);
  }

  listSurveyResponses(
    surveyId: string,
    params?: {
      status?: "started" | "completed" | "abandoned";
      limit?: number;
    }
  ): Promise<SurveyResponseItem[]> {
    const searchParams = new URLSearchParams();
    searchParams.set("id", surveyId);
    if (params?.status) {
      searchParams.set("status", params.status);
    }
    if (params?.limit) {
      searchParams.set("limit", String(params.limit));
    }
    return this.request(
      "GET",
      `/api/v1/admin/survey/responses?${searchParams}`
    );
  }
}
