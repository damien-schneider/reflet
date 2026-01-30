import {
  type AddCommentParams,
  type AddCommentResponse,
  type BoardConfig,
  type ChangelogEntry,
  type Comment,
  type CreateFeedbackParams,
  type CreateFeedbackResponse,
  type FeedbackDetail,
  type FeedbackListParams,
  type FeedbackListResponse,
  RefletAuthError,
  type RefletConfig,
  RefletError,
  RefletNotFoundError,
  type RefletUser,
  type Roadmap,
  type SubscribeResponse,
  type UnsubscribeResponse,
  type VoteResponse,
} from "./types";

// Default to Reflet production API
const DEFAULT_API_URL = "https://harmless-clam-802.convex.cloud";

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
   * Get the board configuration
   */
  async getConfig(): Promise<BoardConfig> {
    return await this.request<BoardConfig>("GET", "/api/v1/feedback");
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
   * Requires user identification
   */
  async create(params: CreateFeedbackParams): Promise<CreateFeedbackResponse> {
    return await this.request<CreateFeedbackResponse>(
      "POST",
      "/api/v1/feedback/create",
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

  /**
   * Build request headers with authentication
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.publicKey}`,
    };

    const token = this.userToken ?? this.generateUserToken();
    if (token) {
      headers["X-User-Token"] = token;
    }

    return headers;
  }

  /**
   * Parse JSON response text safely
   */
  private parseJsonSafely<T>(
    text: string,
    status: number
  ): T | { error: string } {
    try {
      return JSON.parse(text) as T | { error: string };
    } catch (parseError) {
      throw new RefletError(
        `Invalid response: ${parseError instanceof Error ? parseError.message : "Failed to parse JSON"}`,
        status
      );
    }
  }

  /**
   * Throw appropriate error based on status code
   */
  private throwHttpError(message: string, status: number): never {
    if (status === 401) {
      throw new RefletAuthError(message);
    }
    if (status === 404) {
      throw new RefletNotFoundError(message);
    }
    throw new RefletError(message, status);
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: this.buildHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (networkError) {
      const message =
        networkError instanceof Error
          ? networkError.message
          : "Failed to connect";
      throw new RefletError(`Network error: ${message}`, 0);
    }

    const text = await response.text();

    // Handle empty response
    if (!text) {
      if (!response.ok) {
        this.throwHttpError(
          `Request failed with status ${response.status}`,
          response.status
        );
      }
      return {} as T;
    }

    const data = this.parseJsonSafely<T>(text, response.status);

    if (!response.ok) {
      const errorMessage =
        (data as { error?: string }).error ??
        `Request failed with status ${response.status}`;
      this.throwHttpError(errorMessage, response.status);
    }

    return data as T;
  }

  /**
   * Generate a simple user token for client-side use
   * Note: For production, use server-side token signing
   */
  private generateUserToken(): string | undefined {
    if (!this.user) {
      return undefined;
    }

    // Simple base64 encoding for client-side use
    // In production, tokens should be signed server-side
    const payload = {
      id: this.user.id,
      email: this.user.email,
      name: this.user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86_400, // 24 hours
    };

    const header = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
    const payloadB64 = btoa(JSON.stringify(payload));

    return `${header}.${payloadB64}.`;
  }
}
