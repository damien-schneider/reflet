import crypto from "node:crypto";
import { describe, expect, test, vi } from "vitest";

// Mock the env module before importing the route
vi.mock("@reflet/env/server", () => ({
  env: {
    GITHUB_WEBHOOK_SECRET: "test-secret",
  },
}));

// Mock NextResponse since we're in a Node test environment
vi.mock("next/server", () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) =>
      new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: { "content-type": "application/json" },
      }),
  },
}));

const { POST } = await import("./route");

const VALID_RELEASE_PAYLOAD = {
  action: "published",
  installation: { id: 12_345 },
  repository: { full_name: "owner/repo", id: 1 },
  release: {
    id: 1,
    tag_name: "v1.0.0",
    name: "Release 1.0.0",
    body: "Some release notes",
    html_url: "https://github.com/owner/repo/releases/tag/v1.0.0",
    draft: false,
    prerelease: false,
    published_at: "2024-01-01T00:00:00Z",
    created_at: "2024-01-01T00:00:00Z",
  },
};

const VALID_ISSUE_PAYLOAD = {
  action: "opened",
  installation: { id: 12_345 },
  repository: { full_name: "owner/repo", id: 1 },
  issue: {
    id: 42,
    number: 42,
    title: "Bug report",
    body: "Something is broken",
    html_url: "https://github.com/owner/repo/issues/42",
    state: "open",
    labels: [{ name: "bug", color: "d73a4a" }],
    user: { login: "reporter", avatar_url: "https://example.com/avatar.png" },
    milestone: null,
    assignees: [],
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    closed_at: null,
  },
};

function signPayload(body: string, secret = "test-secret"): string {
  return `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;
}

function createRequest(
  eventType: string,
  payload: object,
  options: { sign?: boolean; secret?: string; wrongSignature?: boolean } = {}
): Request {
  const {
    sign = true,
    secret = "test-secret",
    wrongSignature = false,
  } = options;
  const body = JSON.stringify(payload);

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-github-event": eventType,
    "x-github-delivery": "test-delivery-123",
  };

  if (sign && !wrongSignature) {
    headers["x-hub-signature-256"] = signPayload(body, secret);
  } else if (wrongSignature) {
    headers["x-hub-signature-256"] =
      "sha256=0000000000000000000000000000000000000000000000000000000000000000";
  }

  return new Request("http://localhost/api/github/webhook", {
    method: "POST",
    headers,
    body,
  });
}

describe("POST /api/github/webhook", () => {
  describe("event type filtering", () => {
    test("should ignore unknown event types with 200", async () => {
      const request = createRequest("push", {
        installation: { id: 12_345 },
        repository: { full_name: "owner/repo" },
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.message).toContain("ignored");
    });

    test("should ignore when x-github-event header is missing", async () => {
      const body = JSON.stringify(VALID_RELEASE_PAYLOAD);
      const request = new Request("http://localhost/api/github/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hub-signature-256": signPayload(body),
          "x-github-delivery": "test-delivery-123",
        },
        body,
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.message).toContain("ignored");
    });

    test("should accept release events", async () => {
      const request = createRequest("release", VALID_RELEASE_PAYLOAD);
      const response = await POST(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toHaveProperty("release");
    });

    test("should accept issues events", async () => {
      const request = createRequest("issues", VALID_ISSUE_PAYLOAD);
      const response = await POST(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toHaveProperty("issue");
    });
  });

  describe("signature verification", () => {
    test("should return 401 when signature is invalid", async () => {
      const request = createRequest("release", VALID_RELEASE_PAYLOAD, {
        wrongSignature: true,
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    test("should return 401 when signature header is missing", async () => {
      const request = createRequest("release", VALID_RELEASE_PAYLOAD, {
        sign: false,
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    test("should return 200 when signature is valid", async () => {
      const request = createRequest("release", VALID_RELEASE_PAYLOAD);
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe("payload validation", () => {
    test("should return 400 for invalid JSON body", async () => {
      const invalidBody = "not valid json {{{";
      const headers: Record<string, string> = {
        "content-type": "application/json",
        "x-github-event": "release",
        "x-hub-signature-256": signPayload(invalidBody),
        "x-github-delivery": "test-delivery-123",
      };

      const request = new Request("http://localhost/api/github/webhook", {
        method: "POST",
        headers,
        body: invalidBody,
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    test("should return 400 when installation.id is missing", async () => {
      const payload = {
        action: "published",
        repository: { full_name: "owner/repo", id: 1 },
        release: VALID_RELEASE_PAYLOAD.release,
      };
      const request = createRequest("release", payload);
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    test("should return 400 when repository.full_name is missing", async () => {
      const payload = {
        action: "published",
        installation: { id: 12_345 },
        release: VALID_RELEASE_PAYLOAD.release,
      };
      const request = createRequest("release", payload);
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    test("should return 400 for release event without release data", async () => {
      const payload = {
        action: "published",
        installation: { id: 12_345 },
        repository: { full_name: "owner/repo", id: 1 },
      };
      const request = createRequest("release", payload);
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    test("should return 400 for issues event without issue data", async () => {
      const payload = {
        action: "opened",
        installation: { id: 12_345 },
        repository: { full_name: "owner/repo", id: 1 },
      };
      const request = createRequest("issues", payload);
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe("release event handling", () => {
    test("should return release info with tagName", async () => {
      const request = createRequest("release", VALID_RELEASE_PAYLOAD);
      const response = await POST(request);
      const json = await response.json();

      expect(json.release.tagName).toBe("v1.0.0");
      expect(json.release.name).toBe("Release 1.0.0");
      expect(json.action).toBe("published");
    });

    test("should handle release with null name and body", async () => {
      const payload = {
        ...VALID_RELEASE_PAYLOAD,
        release: {
          ...VALID_RELEASE_PAYLOAD.release,
          name: null,
          body: null,
        },
      };
      const request = createRequest("release", payload);
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    test("should handle very large release body", async () => {
      const payload = {
        ...VALID_RELEASE_PAYLOAD,
        release: {
          ...VALID_RELEASE_PAYLOAD.release,
          body: "x".repeat(100_000),
        },
      };
      const request = createRequest("release", payload);
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe("issues event handling", () => {
    test("should return issue info with number and title", async () => {
      const request = createRequest("issues", VALID_ISSUE_PAYLOAD);
      const response = await POST(request);
      const json = await response.json();

      expect(json.issue.number).toBe(42);
      expect(json.issue.title).toBe("Bug report");
      expect(json.issue.state).toBe("open");
      expect(json.action).toBe("opened");
    });

    test("should return label names as strings", async () => {
      const request = createRequest("issues", VALID_ISSUE_PAYLOAD);
      const response = await POST(request);
      const json = await response.json();

      expect(json.issue.labels).toEqual(["bug"]);
    });
  });
});
