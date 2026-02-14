import type { BoardConfig, Comment, FeedbackItem } from "./types";

declare const __CONVEX_URL__: string;

function isErrorResponse(data: unknown): data is { error: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  );
}

const CONVEX_URL =
  typeof __CONVEX_URL__ !== "undefined"
    ? __CONVEX_URL__
    : "https://grateful-butterfly-1.convex.cloud";

class FeedbackApi {
  private readonly publicKey: string;
  private userToken: string | null = null;

  constructor(publicKey: string) {
    this.publicKey = publicKey;
  }

  setUserToken(token: string | null): void {
    this.userToken = token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.publicKey}`,
    };

    if (this.userToken) {
      headers["X-User-Token"] = this.userToken;
    }

    const response = await fetch(`${CONVEX_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data: unknown = await response.json();

    if (!response.ok) {
      const message = isErrorResponse(data) ? data.error : "Request failed";
      throw new Error(message);
    }

    return data as T;
  }

  async getConfig(): Promise<BoardConfig> {
    return await this.request<BoardConfig>("GET", "/api/v1/feedback");
  }

  async listFeedback(params?: {
    status?: string;
    sortBy?: string;
    limit?: number;
  }): Promise<{ items: FeedbackItem[]; total: number; hasMore: boolean }> {
    const searchParams = new URLSearchParams();
    if (params?.status) {
      searchParams.set("status", params.status);
    }
    if (params?.sortBy) {
      searchParams.set("sortBy", params.sortBy);
    }
    if (params?.limit) {
      searchParams.set("limit", String(params.limit));
    }

    const query = searchParams.toString();
    return await this.request(
      "GET",
      `/api/v1/feedback/list${query ? `?${query}` : ""}`
    );
  }

  async getFeedback(id: string): Promise<FeedbackItem | null> {
    return await this.request(
      "GET",
      `/api/v1/feedback/item?id=${encodeURIComponent(id)}`
    );
  }

  async getComments(feedbackId: string): Promise<Comment[]> {
    return await this.request(
      "GET",
      `/api/v1/feedback/comments?feedbackId=${encodeURIComponent(feedbackId)}`
    );
  }

  async createFeedback(data: {
    title: string;
    description: string;
  }): Promise<{ feedbackId: string; isApproved: boolean }> {
    return await this.request("POST", "/api/v1/feedback/create", data);
  }

  async vote(
    feedbackId: string
  ): Promise<{ voted: boolean; voteCount: number }> {
    return await this.request("POST", "/api/v1/feedback/vote", { feedbackId });
  }

  async addComment(
    feedbackId: string,
    body: string
  ): Promise<{ commentId: string }> {
    return await this.request("POST", "/api/v1/feedback/comment", {
      feedbackId,
      body,
    });
  }

  async subscribe(feedbackId: string): Promise<{ subscribed: boolean }> {
    return await this.request("POST", "/api/v1/feedback/subscribe", {
      feedbackId,
    });
  }

  async getRoadmap(): Promise<{
    lanes: Array<{
      id: string;
      name: string;
      color: string;
      items: Array<{ id: string; title: string; voteCount: number }>;
    }>;
  }> {
    return await this.request("GET", "/api/v1/feedback/roadmap");
  }

  async getChangelog(): Promise<
    Array<{
      id: string;
      title: string;
      description?: string;
      version?: string;
      publishedAt?: number;
    }>
  > {
    return await this.request("GET", "/api/v1/feedback/changelog");
  }
}

export function createApi(publicKey: string): FeedbackApi {
  return new FeedbackApi(publicKey);
}

export type { FeedbackApi };
