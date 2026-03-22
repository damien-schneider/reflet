const DEFAULT_BASE_URL = "https://harmless-clam-802.convex.site";

interface ClientConfig {
  readonly secretKey: string;
  readonly baseUrl?: string;
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
  // FEEDBACK (existing public API)
  // ============================================

  getConfig(): Promise<unknown> {
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
  }): Promise<unknown> {
    const searchParams = new URLSearchParams();
    if (params?.statusId) {
      searchParams.set("statusId", params.statusId);
    }
    if (params?.tagId) {
      searchParams.set("tagId", params.tagId);
    }
    if (params?.status) {
      searchParams.set("status", params.status);
    }
    if (params?.search) {
      searchParams.set("search", params.search);
    }
    if (params?.sortBy) {
      searchParams.set("sortBy", params.sortBy);
    }
    if (params?.limit) {
      searchParams.set("limit", String(params.limit));
    }
    if (params?.offset) {
      searchParams.set("offset", String(params.offset));
    }
    const query = searchParams.toString();
    return this.request(
      "GET",
      `/api/v1/feedback/list${query ? `?${query}` : ""}`
    );
  }

  getFeedback(feedbackId: string): Promise<unknown> {
    return this.request(
      "GET",
      `/api/v1/feedback/item?id=${encodeURIComponent(feedbackId)}`
    );
  }

  createFeedback(params: {
    title: string;
    description: string;
    tagId?: string;
  }): Promise<unknown> {
    return this.request("POST", "/api/v1/feedback/create", params);
  }

  voteFeedback(
    feedbackId: string,
    voteType?: "upvote" | "downvote"
  ): Promise<unknown> {
    return this.request("POST", "/api/v1/feedback/vote", {
      feedbackId,
      voteType,
    });
  }

  listComments(
    feedbackId: string,
    sortBy?: "newest" | "oldest"
  ): Promise<unknown> {
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
  }): Promise<unknown> {
    return this.request("POST", "/api/v1/feedback/comment", params);
  }

  getRoadmap(): Promise<unknown> {
    return this.request("GET", "/api/v1/feedback/roadmap");
  }

  getChangelog(limit?: number): Promise<unknown> {
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
  }): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/feedback/update", params);
  }

  deleteFeedback(feedbackId: string): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/feedback/delete", {
      feedbackId,
    });
  }

  restoreFeedback(feedbackId: string): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/feedback/restore", {
      feedbackId,
    });
  }

  assignFeedback(feedbackId: string, assigneeId?: string): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/feedback/assign", {
      feedbackId,
      assigneeId,
    });
  }

  setFeedbackStatus(
    feedbackId: string,
    statusId?: string,
    status?: string
  ): Promise<unknown> {
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
  ): Promise<unknown> {
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
  }): Promise<unknown> {
    return this.request(
      "POST",
      "/api/v1/admin/feedback/update-analysis",
      params
    );
  }

  // ============================================
  // COMMENTS ADMIN
  // ============================================

  updateComment(commentId: string, body: string): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/comment/update", {
      commentId,
      body,
    });
  }

  deleteComment(commentId: string): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/comment/delete", {
      commentId,
    });
  }

  markCommentOfficial(
    commentId: string,
    isOfficial: boolean
  ): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/comment/mark-official", {
      commentId,
      isOfficial,
    });
  }

  // ============================================
  // TAGS
  // ============================================

  listTags(): Promise<unknown> {
    return this.request("GET", "/api/v1/admin/tags");
  }

  createTag(params: {
    name: string;
    color: string;
    icon?: string;
    description?: string;
    isPublic?: boolean;
  }): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/tag/create", params);
  }

  updateTag(params: {
    tagId: string;
    name?: string;
    color?: string;
    icon?: string;
    description?: string;
    isPublic?: boolean;
  }): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/tag/update", params);
  }

  deleteTag(tagId: string): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/tag/delete", { tagId });
  }

  // ============================================
  // RELEASES
  // ============================================

  listReleases(params?: {
    status?: "draft" | "published" | "all";
    limit?: number;
    offset?: number;
  }): Promise<unknown> {
    const searchParams = new URLSearchParams();
    if (params?.status) {
      searchParams.set("status", params.status);
    }
    if (params?.limit) {
      searchParams.set("limit", String(params.limit));
    }
    if (params?.offset) {
      searchParams.set("offset", String(params.offset));
    }
    const query = searchParams.toString();
    return this.request(
      "GET",
      `/api/v1/admin/releases${query ? `?${query}` : ""}`
    );
  }

  getRelease(releaseId: string): Promise<unknown> {
    return this.request(
      "GET",
      `/api/v1/admin/release?id=${encodeURIComponent(releaseId)}`
    );
  }

  createRelease(params: {
    title: string;
    description?: string;
    version?: string;
  }): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/release/create", params);
  }

  updateRelease(params: {
    releaseId: string;
    title?: string;
    description?: string;
    version?: string;
  }): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/release/update", params);
  }

  publishRelease(releaseId: string): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/release/publish", {
      releaseId,
    });
  }

  unpublishRelease(releaseId: string): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/release/unpublish", {
      releaseId,
    });
  }

  deleteRelease(releaseId: string): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/release/delete", {
      releaseId,
    });
  }

  linkReleaseFeedback(
    releaseId: string,
    feedbackId: string,
    action: "link" | "unlink"
  ): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/release/link-feedback", {
      releaseId,
      feedbackId,
      action,
    });
  }

  // ============================================
  // MILESTONES
  // ============================================

  listMilestones(params?: {
    status?: "active" | "completed" | "archived" | "all";
  }): Promise<unknown> {
    const searchParams = new URLSearchParams();
    if (params?.status) {
      searchParams.set("status", params.status);
    }
    const query = searchParams.toString();
    return this.request(
      "GET",
      `/api/v1/admin/milestones${query ? `?${query}` : ""}`
    );
  }

  getMilestone(milestoneId: string): Promise<unknown> {
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
  }): Promise<unknown> {
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
  }): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/milestone/update", params);
  }

  completeMilestone(milestoneId: string): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/milestone/complete", {
      milestoneId,
    });
  }

  deleteMilestone(milestoneId: string): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/milestone/delete", {
      milestoneId,
    });
  }

  linkMilestoneFeedback(
    milestoneId: string,
    feedbackId: string,
    action: "link" | "unlink"
  ): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/milestone/link-feedback", {
      milestoneId,
      feedbackId,
      action,
    });
  }

  // ============================================
  // STATUSES
  // ============================================

  listStatuses(): Promise<unknown> {
    return this.request("GET", "/api/v1/admin/statuses");
  }

  createStatus(params: {
    name: string;
    color: string;
    icon?: string;
  }): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/status/create", params);
  }

  updateStatus(params: {
    statusId: string;
    name?: string;
    color?: string;
    icon?: string;
  }): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/status/update", params);
  }

  deleteStatus(statusId: string): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/status/delete", { statusId });
  }

  // ============================================
  // MEMBERS
  // ============================================

  listMembers(): Promise<unknown> {
    return this.request("GET", "/api/v1/admin/members");
  }

  createInvitation(params: {
    email: string;
    role: "admin" | "member";
  }): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/invitation/create", params);
  }

  cancelInvitation(invitationId: string): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/invitation/cancel", {
      invitationId,
    });
  }

  listInvitations(): Promise<unknown> {
    return this.request("GET", "/api/v1/admin/invitations");
  }

  // ============================================
  // ORGANIZATION
  // ============================================

  getOrganization(): Promise<unknown> {
    return this.request("GET", "/api/v1/admin/organization");
  }

  updateOrganization(params: {
    name?: string;
    slug?: string;
    isPublic?: boolean;
    primaryColor?: string;
  }): Promise<unknown> {
    return this.request("POST", "/api/v1/admin/organization/update", params);
  }
}
