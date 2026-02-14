import type { ChangelogEntry } from "./types";

declare const __CONVEX_URL__: string;

const CONVEX_URL =
  typeof __CONVEX_URL__ !== "undefined"
    ? __CONVEX_URL__
    : "https://grateful-butterfly-1.convex.cloud";

function isErrorResponse(data: unknown): data is { error: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  );
}

function isChangelogEntryArray(data: unknown): data is ChangelogEntry[] {
  return (
    Array.isArray(data) &&
    data.every(
      (item): item is ChangelogEntry =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        typeof item.id === "string" &&
        "title" in item &&
        typeof item.title === "string"
    )
  );
}

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

    const data: unknown = await response.json();

    if (!response.ok) {
      const message = isErrorResponse(data)
        ? data.error
        : "Failed to fetch changelog";
      throw new Error(message);
    }

    if (!isChangelogEntryArray(data)) {
      throw new Error("Invalid changelog data format");
    }

    return data;
  }
}
