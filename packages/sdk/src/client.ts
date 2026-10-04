import type { PublicSurvey } from "@reflet/survey-core";
import { parseJsonSafely, throwResponseError } from "./http-response";
import { surveyControllers, surveyRegistryKey } from "./surveys/registry";
import {
  createSurveyApi,
  type StartSurveyResponseParams,
  type SubmitSurveyAnswerParams,
} from "./surveys/survey-api";
import {
  type AddCommentParams,
  type AddCommentResponse,
  type ChangelogEntry,
  type Comment,
  type CreateFeedbackParams,
  type CreateFeedbackResponse,
  type FeedbackDetail,
  type FeedbackListParams,
  type FeedbackListResponse,
  type OrganizationConfig,
  type RefletConfig,
  RefletError,
  RefletNotFoundError,
  type RefletUser,
  type Roadmap,
  type SaveScreenshotParams,
  type SubscribeResponse,
  type UnsubscribeResponse,
  type VoteResponse,
} from "./types";
import { createUnsignedUserToken } from "./user-token";

export const DEFAULT_API_URL = "https://harmless-clam-802.convex.site";

/**
 * Reflet SDK Client
 *
 * @example
 * ```ts
 * import { Reflet } from 'reflet-sdk';
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
 */
export class Reflet {
  private readonly publicKey: string;
  private readonly baseUrl: string;
  private userToken: string | undefined;
  private user: RefletUser | undefined;
  private readonly surveys = createSurveyApi((method, path, body) =>
    this.request(method, path, body)
  );

  constructor(config: RefletConfig) {
    this.publicKey = config.publicKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_API_URL;
    this.userToken = config.userToken;
    this.user = config.user;

    if (!this.publicKey) {
      throw new Error("Reflet: publicKey is required");
    }
  }

  /**
   * Update the user identification
   */
  setUser(user: RefletUser | undefined): void {
    this.user = user;
    this.userToken = undefined;
  }

  /**
   * Set the user token directly (for server-signed tokens)
   */
  setUserToken(token: string | undefined): void {
    this.userToken = token;
    this.user = undefined;
  }

  /**
   * Get the organization configuration
   */
  async getConfig(): Promise<OrganizationConfig> {
    return await this.request<OrganizationConfig>("GET", "/api/v1/feedback");
  }

  /**
   * List feedback items with optional filtering
   */
  async list(params?: FeedbackListParams): Promise<FeedbackListResponse> {
    const searchParams = new URLSearchParams();

    if (params?.statusId) {
      searchParams.set("statusId", params.statusId);
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
    const url = `/api/v1/feedback/list${query ? `?${query}` : ""}`;

    return await this.request<FeedbackListResponse>("GET", url);
  }

  /**
   * Get a single feedback item by ID
   */
  async get(feedbackId: string): Promise<FeedbackDetail> {
    const result = await this.request<FeedbackDetail | null>(
      "GET",
      `/api/v1/feedback/item?id=${encodeURIComponent(feedbackId)}`
    );

    if (!result) {
      throw new RefletNotFoundError("Feedback not found");
    }

    return result;
  }

  /**
   * Create new feedback
   * Works anonymously or with user identification
   */
  async create(params: CreateFeedbackParams): Promise<CreateFeedbackResponse> {
    const created = await this.request<CreateFeedbackResponse>(
      "POST",
      "/api/v1/feedback/create",
      params
    );
    surveyControllers
      .get(surveyRegistryKey(this.publicKey, this.baseUrl))
      ?.notifyFeedbackSubmitted();
    return created;
  }

  /**
   * Ask the API for a one-shot storage URL to upload a screenshot to.
   */
  async getScreenshotUploadUrl(): Promise<{ uploadUrl: string }> {
    return await this.request<{ uploadUrl: string }>(
      "POST",
      "/api/v1/feedback/screenshot/upload-url"
    );
  }

  /**
   * Attach an already uploaded screenshot to a feedback item.
   */
  async saveScreenshot(
    params: SaveScreenshotParams
  ): Promise<{ screenshotId: string }> {
    return await this.request<{ screenshotId: string }>(
      "POST",
      "/api/v1/feedback/screenshot/save",
      params
    );
  }

  /**
   * Toggle vote on feedback
   * Requires user identification
   */
  async vote(
    feedbackId: string,
    type: "upvote" | "downvote" = "upvote"
  ): Promise<VoteResponse> {
    return await this.request<VoteResponse>("POST", "/api/v1/feedback/vote", {
      feedbackId,
      voteType: type,
    });
  }

  /**
   * Get comments for a feedback item
   */
  async getComments(
    feedbackId: string,
    sortBy: "newest" | "oldest" = "oldest"
  ): Promise<Comment[]> {
    return await this.request<Comment[]>(
      "GET",
      `/api/v1/feedback/comments?feedbackId=${encodeURIComponent(feedbackId)}&sortBy=${sortBy}`
    );
  }

  /**
   * Add a comment to feedback
   * Requires user identification
   */
  async comment(params: AddCommentParams): Promise<AddCommentResponse> {
    return await this.request<AddCommentResponse>(
      "POST",
      "/api/v1/feedback/comment",
      params
    );
  }

  /**
   * Subscribe to feedback updates
   * Requires user identification
   */
  async subscribe(feedbackId: string): Promise<SubscribeResponse> {
    return await this.request<SubscribeResponse>(
      "POST",
      "/api/v1/feedback/subscribe",
      {
        feedbackId,
      }
    );
  }

  /**
   * Unsubscribe from feedback updates
   * Requires user identification
   */
  async unsubscribe(feedbackId: string): Promise<UnsubscribeResponse> {
    return await this.request<UnsubscribeResponse>(
      "POST",
      "/api/v1/feedback/unsubscribe",
      {
        feedbackId,
      }
    );
  }

  /**
   * Get roadmap data
   */
  async getRoadmap(): Promise<Roadmap> {
    return await this.request<Roadmap>("GET", "/api/v1/feedback/roadmap");
  }

  /**
   * Get changelog entries
   */
  async getChangelog(limit?: number): Promise<ChangelogEntry[]> {
    const url = limit
      ? `/api/v1/feedback/changelog?limit=${limit}`
      : "/api/v1/feedback/changelog";

    return await this.request<ChangelogEntry[]>("GET", url);
  }

  /** Surveys this visitor may see now; schedule, cap, frequency and sampling are applied by the API. */
  getEligibleSurveys(): Promise<PublicSurvey[]> {
    return this.surveys.eligible();
  }

  /** Opens a response before the first answer is saved. */
  startSurveyResponse(params: StartSurveyResponseParams) {
    return this.surveys.start(params);
  }

  /** Saves one answer; `value: null` clears it. */
  submitSurveyAnswer(params: SubmitSurveyAnswerParams) {
    return this.surveys.submitAnswer(params);
  }

  /** Finishes a response; the API walks the flow and returns the ending reached. */
  completeSurveyResponse(responseId: string) {
    return this.surveys.complete(responseId);
  }

  /** Marks an unfinished response abandoned. */
  dismissSurveyResponse(responseId: string): Promise<void> {
    return this.surveys.dismiss(responseId);
  }

  /**
   * Build request headers with authentication
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.publicKey}`,
      "Content-Type": "application/json",
    };

    const token =
      this.userToken ?? (this.user && createUnsignedUserToken(this.user));
    if (token) {
      headers["X-User-Token"] = token;
    }

    return headers;
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const response = await this.send(method, path, body);

    if (!response.ok) {
      return throwResponseError(response);
    }

    const text = await response.text();

    // Successful empty body (e.g. 204 No Content) — return empty object
    // narrowed through unknown for type-safe assertion
    if (!text) {
      const emptyResponse: unknown = {};
      return emptyResponse as T;
    }

    // Standard unknown → T assertion for runtime-parsed JSON
    return parseJsonSafely(text, response.status) as T;
  }

  private async send(
    method: string,
    path: string,
    body?: unknown
  ): Promise<Response> {
    try {
      return await fetch(`${this.baseUrl}${path}`, {
        body: body ? JSON.stringify(body) : undefined,
        headers: this.buildHeaders(),
        method,
      });
    } catch (networkError) {
      const message =
        networkError instanceof Error
          ? networkError.message
          : "Failed to connect";
      throw new RefletError(`Network error: ${message}`, 0);
    }
  }
}
