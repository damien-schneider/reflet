import type { ChangelogEntry, ChangelogLinkedItem } from "./types";

declare const __CONVEX_SITE_URL__: string;

function isErrorResponse(data: unknown): data is { error: string } {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  );
}

function isLinkedItem(value: unknown): value is ChangelogLinkedItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "title" in value &&
    typeof value.title === "string"
  );
}

function isChangelogEntry(value: unknown): value is ChangelogEntry {
  if (!isLinkedItem(value)) {
    return false;
  }
  const entry: Record<string, unknown> = { ...value };
  return (
    (entry.description === undefined ||
      typeof entry.description === "string") &&
    (entry.version === undefined || typeof entry.version === "string") &&
    (entry.publishedAt === undefined ||
      typeof entry.publishedAt === "number") &&
    Array.isArray(entry.items) &&
    entry.items.every(isLinkedItem)
  );
}

function isChangelogEntryArray(data: unknown): data is ChangelogEntry[] {
  return Array.isArray(data) && data.every(isChangelogEntry);
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
    const url = `${__CONVEX_SITE_URL__}/api/v1/feedback/changelog${query ? `?${query}` : ""}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.publicKey}`,
        "Content-Type": "application/json",
      },
      method: "GET",
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
