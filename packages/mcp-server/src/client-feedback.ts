import { RefletTransport } from "./transport.js";
import type {
  ChangelogEntryResponse,
  CommentResponse,
  ConfigResponse,
  CreatedResponse,
  CreateFeedbackResponse,
  FeedbackDetailResponse,
  FeedbackListResponse,
  RoadmapResponse,
  SuccessResponse,
  VoteResponse,
} from "./types.js";

export class FeedbackApi extends RefletTransport {
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
      assigneeId,
      feedbackId,
    });
  }

  setFeedbackStatus(
    feedbackId: string,
    statusId?: string,
    status?: string
  ): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/feedback/set-status", {
      feedbackId,
      status,
      statusId,
    });
  }

  updateFeedbackTags(
    feedbackId: string,
    addTagIds?: string[],
    removeTagIds?: string[]
  ): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/feedback/update-tags", {
      addTagIds,
      feedbackId,
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

  updateComment(commentId: string, body: string): Promise<SuccessResponse> {
    return this.request("POST", "/api/v1/admin/comment/update", {
      body,
      commentId,
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
}
