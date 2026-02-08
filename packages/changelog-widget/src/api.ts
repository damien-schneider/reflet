import type { ChangelogEntry } from "./types";

declare const __CONVEX_URL__: string;

const CONVEX_URL =
  typeof __CONVEX_URL__ !== "undefined"
    ? __CONVEX_URL__
    : "https://grateful-butterfly-1.convex.cloud";

export class ChangelogApi {
  private readonly publicKey: string;

  constructor(publicKey: string) {
    this.publicKey = publicKey;
  }

  async getChangelog(limit?: number): Promise<ChangelogEntry[]> {
    const params = new URLSearchParams();
    if (limit) {
      params.set("limit", String(limit));
    }

    const query = params.toString();
    const url = `${CONVEX_URL}/api/v1/feedback/changelog${query ? `?${query}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.publicKey}`,
      },
    });

    const data = (await response.json()) as
      | ChangelogEntry[]
      | { error: string };

    if (!response.ok) {
      throw new Error(
        (data as { error?: string }).error ?? "Failed to fetch changelog"
      );
    }

    return data as ChangelogEntry[];
  }
}
