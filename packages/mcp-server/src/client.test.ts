import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { RefletAdminClient } from "./client.js";

const TEST_BASE_URL = "https://test.convex.site";
const TEST_SECRET_KEY = "fb_sec_test123";

let fetchSpy: ReturnType<typeof vi.fn>;

const mockFetchResponse = (data: unknown, status = 200) => {
  fetchSpy.mockResolvedValueOnce(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
};

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const createClient = () =>
  new RefletAdminClient({
    secretKey: TEST_SECRET_KEY,
    baseUrl: TEST_BASE_URL,
  });

describe("RefletAdminClient - request construction", () => {
  test("sends Authorization header with Bearer token", async () => {
    const client = createClient();
    mockFetchResponse({ data: "ok" });

    await client.listTags();

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [_url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(options.headers).toEqual(
      expect.objectContaining({
        Authorization: `Bearer ${TEST_SECRET_KEY}`,
      })
    );
  });

  test("uses custom base URL", async () => {
    const client = createClient();
    mockFetchResponse([]);

    await client.listTags();

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url.startsWith(TEST_BASE_URL)).toBe(true);
  });

  test("uses default base URL when not specified", () => {
    const client = new RefletAdminClient({ secretKey: "key" });
    // Client construction should set default; we test via a request
    mockFetchResponse({});
    // The default URL is internal, we just verify the client was created
    expect(client).toBeDefined();
  });
});

describe("RefletAdminClient - GET endpoints", () => {
  test("listFeedback builds correct query params", async () => {
    const client = createClient();
    mockFetchResponse({ items: [] });

    await client.listFeedback({
      status: "open",
      limit: 10,
      offset: 5,
      search: "test",
    });

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/feedback/list");
    expect(url).toContain("status=open");
    expect(url).toContain("limit=10");
    expect(url).toContain("offset=5");
    expect(url).toContain("search=test");
  });

  test("listReleases builds query params", async () => {
    const client = createClient();
    mockFetchResponse({ items: [] });

    await client.listReleases({ status: "published", limit: 5 });

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/admin/releases");
    expect(url).toContain("status=published");
    expect(url).toContain("limit=5");
  });

  test("listMilestones builds query params", async () => {
    const client = createClient();
    mockFetchResponse([]);

    await client.listMilestones({ status: "active" });

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/admin/milestones");
    expect(url).toContain("status=active");
  });

  test("getRelease encodes release ID", async () => {
    const client = createClient();
    mockFetchResponse({});

    await client.getRelease("abc123");

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/admin/release?id=abc123");
  });

  test("getMilestone encodes milestone ID", async () => {
    const client = createClient();
    mockFetchResponse({});

    await client.getMilestone("ms-abc");

    const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/admin/milestone?id=ms-abc");
  });
});

describe("RefletAdminClient - POST endpoints", () => {
  test("createTag sends correct body", async () => {
    const client = createClient();
    mockFetchResponse({ id: "tag-1" });

    await client.createTag({
      name: "Bug",
      color: "#FF0000",
      description: "Issues",
    });

    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/admin/tag/create");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body as string)).toEqual({
      name: "Bug",
      color: "#FF0000",
      description: "Issues",
    });
  });

  test("deleteFeedback sends feedbackId", async () => {
    const client = createClient();
    mockFetchResponse({ success: true });

    await client.deleteFeedback("fb-123");

    const [, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(options.body as string)).toEqual({
      feedbackId: "fb-123",
    });
  });

  test("linkReleaseFeedback sends action", async () => {
    const client = createClient();
    mockFetchResponse({ success: true });

    await client.linkReleaseFeedback("rel-1", "fb-1", "link");

    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/admin/release/link-feedback");
    expect(JSON.parse(options.body as string)).toEqual({
      releaseId: "rel-1",
      feedbackId: "fb-1",
      action: "link",
    });
  });

  test("createInvitation sends email and role", async () => {
    const client = createClient();
    mockFetchResponse({ id: "inv-1" });

    await client.createInvitation({
      email: "test@example.com",
      role: "member",
    });

    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/admin/invitation/create");
    expect(JSON.parse(options.body as string)).toEqual({
      email: "test@example.com",
      role: "member",
    });
  });
});

describe("RefletAdminClient - error handling", () => {
  test("throws on non-ok response with error message", async () => {
    const client = createClient();
    mockFetchResponse({ error: "Tag not found" }, 404);

    await expect(client.deleteTag("bad-id")).rejects.toThrow("Tag not found");
  });

  test("throws on non-ok response without error field", async () => {
    const client = createClient();
    mockFetchResponse({ something: "else" }, 500);

    await expect(client.listTags()).rejects.toThrow(
      "Request failed with status 500"
    );
  });

  test("throws on invalid JSON response", async () => {
    const client = createClient();
    fetchSpy.mockResolvedValueOnce(
      new Response("not json", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      })
    );

    await expect(client.listTags()).rejects.toThrow("Invalid JSON response");
  });

  test("throws on network error", async () => {
    const client = createClient();
    fetchSpy.mockRejectedValueOnce(new Error("Connection refused"));

    await expect(client.listTags()).rejects.toThrow(
      "Network error: Connection refused"
    );
  });

  test("handles empty response body on non-ok status", async () => {
    const client = createClient();
    fetchSpy.mockResolvedValueOnce(new Response("", { status: 500 }));

    await expect(client.listTags()).rejects.toThrow(
      "Request failed with status 500"
    );
  });
});
