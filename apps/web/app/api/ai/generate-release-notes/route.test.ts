import { ConvexError } from "convex/values";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockFetchAuthMutation, mockGetToken, mockStreamText } = vi.hoisted(
  () => ({
    mockFetchAuthMutation: vi.fn(),
    mockGetToken: vi.fn(),
    mockStreamText: vi.fn(),
  })
);

vi.mock("@/lib/auth-server", () => ({
  fetchAuthMutation: mockFetchAuthMutation,
  getToken: mockGetToken,
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: { ai: { usage_gate: { consumeAiGeneration: "consumeAiGeneration" } } },
}));

vi.mock("ai", () => ({
  createTextStreamResponse: vi.fn(),
  streamText: mockStreamText,
  toTextStream: vi.fn(),
}));

import { createTextStreamResponse, toTextStream } from "ai";
import { POST } from "./route";

const generate = (body: unknown) =>
  POST(
    new Request("https://www.reflet.app/api/ai/generate-release-notes", {
      body: JSON.stringify(body),
      method: "POST",
    })
  );

const validBody = {
  commits: [{ author: "dev", message: "feat: dark mode", sha: "abc123" }],
  organizationId: "org1",
};

beforeEach(() => {
  vi.stubEnv("OPENROUTER_API_KEY", "test-key");
  mockGetToken.mockResolvedValue("session-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST /api/ai/generate-release-notes", () => {
  it("returns 403 without calling a model when the caller is not an org admin", async () => {
    mockFetchAuthMutation.mockRejectedValue(
      new ConvexError({ kind: "AiAccessDenied" })
    );

    const response = await generate(validBody);

    expect(response.status).toBe(403);
    expect(mockFetchAuthMutation).toHaveBeenCalledWith("consumeAiGeneration", {
      organizationId: "org1",
    });
    expect(mockStreamText).not.toHaveBeenCalled();
  });

  it("returns 429 once the AI budget is spent", async () => {
    mockFetchAuthMutation.mockRejectedValue(
      new ConvexError({ kind: "RateLimited", name: "aiGenerationPerUser" })
    );

    const response = await generate(validBody);

    expect(response.status).toBe(429);
    expect(mockStreamText).not.toHaveBeenCalled();
  });

  it("rejects requests without an organization", async () => {
    const response = await generate({ commits: validBody.commits });

    expect(response.status).toBe(400);
    expect(mockFetchAuthMutation).not.toHaveBeenCalled();
  });

  it("rejects more commits than the context cap before spending budget", async () => {
    const response = await generate({
      ...validBody,
      commits: Array.from({ length: 101 }, () => validBody.commits[0]),
    });

    expect(response.status).toBe(400);
    expect(mockFetchAuthMutation).not.toHaveBeenCalled();
  });

  it("clips oversized commit messages instead of rejecting the release", async () => {
    mockFetchAuthMutation.mockResolvedValue(null);
    mockStreamText.mockReturnValue({ stream: null });
    vi.mocked(toTextStream).mockReturnValue(
      new ReadableStream({
        start: (controller) => {
          controller.enqueue("notes");
          controller.close();
        },
      })
    );
    vi.mocked(createTextStreamResponse).mockReturnValue(new Response("notes"));

    const response = await generate({
      ...validBody,
      commits: [{ ...validBody.commits[0], message: "x".repeat(50_000) }],
    });

    expect(response.status).toBe(200);
    const { prompt } = mockStreamText.mock.calls[0]?.[0] ?? {};
    expect(prompt).toContain("x".repeat(2000));
    expect(prompt).not.toContain("x".repeat(2001));
  });
});
