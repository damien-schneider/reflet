import { FeedbackApi } from "./client-feedback.js";
import type {
  CreatedResponse,
  MilestoneDetailResponse,
  MilestoneListItem,
  ReleaseDetailResponse,
  ReleaseListResponse,
  StatusResponse,
  SuccessResponse,
  TagResponse,
} from "./types.js";

export class ContentApi extends FeedbackApi {
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
      action,
      feedbackId,
      releaseId,
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
      action,
      feedbackId,
      milestoneId,
    });
  }

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
}
