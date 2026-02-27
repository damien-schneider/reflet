import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFeedbackMatching } from "./use-feedback-matching";

type Id<T extends string> = string & { __tableName: T };
const feedbackId = (id: string) => id as Id<"feedback">;

const makeCandidate = (id: string, status = "open") => ({
  _id: feedbackId(id),
  title: `Feedback ${id}`,
  description: `Description for ${id}`,
  status,
  voteCount: 0,
  tags: [] as Array<{ _id: Id<"tags">; name: string }>,
});

const makeApiResponse = (
  matches: Array<{ feedbackId: string; confidence: string; reason: string }>
) => ({
  matches,
});

describe("useFeedbackMatching", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts with empty matches and not matching", () => {
    const { result } = renderHook(() => useFeedbackMatching());
    expect(result.current.matches).toEqual([]);
    expect(result.current.isMatching).toBe(false);
    expect(result.current.matchError).toBeNull();
  });

  it("sets isMatching to true during API call", async () => {
    let resolveRequest!: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
    vi.spyOn(globalThis, "fetch").mockReturnValue(fetchPromise);

    const { result } = renderHook(() => useFeedbackMatching());

    act(() => {
      result.current.matchFeedback("release notes", [], [makeCandidate("f1")]);
    });

    expect(result.current.isMatching).toBe(true);

    await act(async () => {
      resolveRequest(Response.json(makeApiResponse([])));
    });

    expect(result.current.isMatching).toBe(false);
  });

  it("clears old matches when starting a new match", async () => {
    const firstResponse = makeApiResponse([
      { feedbackId: "f1", confidence: "high", reason: "first match" },
    ]);
    const secondResponse = makeApiResponse([
      { feedbackId: "f2", confidence: "medium", reason: "second match" },
    ]);

    let callCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      callCount++;
      return Response.json(callCount === 1 ? firstResponse : secondResponse);
    });

    const { result } = renderHook(() => useFeedbackMatching());

    // First match
    await act(async () => {
      await result.current.matchFeedback(
        "release notes v1",
        [],
        [makeCandidate("f1"), makeCandidate("f2")]
      );
    });

    expect(result.current.matches).toHaveLength(1);
    expect(result.current.matches[0].feedbackId).toBe("f1");

    // Second match — old matches should be cleared during loading
    let matchesCleared = false;
    let resolveSecond!: (value: Response) => void;
    const secondPromise = new Promise<Response>((resolve) => {
      resolveSecond = resolve;
    });

    vi.spyOn(globalThis, "fetch").mockReturnValue(secondPromise);

    act(() => {
      result.current.matchFeedback(
        "release notes v2",
        [],
        [makeCandidate("f1"), makeCandidate("f2")]
      );
    });

    // During loading, old matches should be cleared
    matchesCleared = result.current.matches.length === 0;
    expect(matchesCleared).toBe(true);

    await act(async () => {
      resolveSecond(Response.json(secondResponse));
    });

    expect(result.current.matches).toHaveLength(1);
    expect(result.current.matches[0].feedbackId).toBe("f2");
  });

  it("returns empty matches for empty feedback list", async () => {
    const { result } = renderHook(() => useFeedbackMatching());

    await act(async () => {
      await result.current.matchFeedback("release notes", [], []);
    });

    expect(result.current.matches).toEqual([]);
    expect(result.current.isMatching).toBe(false);
  });

  it("sets matchError on API failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Server error", { status: 500 })
    );

    const { result } = renderHook(() => useFeedbackMatching());

    await act(async () => {
      await result.current.matchFeedback(
        "release notes",
        [],
        [makeCandidate("f1")]
      );
    });

    expect(result.current.matchError).toBe("Failed to match feedback");
    expect(result.current.matches).toEqual([]);
  });

  it("sets matchError on network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useFeedbackMatching());

    await act(async () => {
      await result.current.matchFeedback(
        "release notes",
        [],
        [makeCandidate("f1")]
      );
    });

    expect(result.current.matchError).toBe("Network error");
    expect(result.current.matches).toEqual([]);
  });

  it("clears matches and error with clearMatches", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        makeApiResponse([
          { feedbackId: "f1", confidence: "high", reason: "match" },
        ])
      )
    );

    const { result } = renderHook(() => useFeedbackMatching());

    await act(async () => {
      await result.current.matchFeedback(
        "release notes",
        [],
        [makeCandidate("f1")]
      );
    });

    expect(result.current.matches).toHaveLength(1);

    act(() => {
      result.current.clearMatches();
    });

    expect(result.current.matches).toEqual([]);
    expect(result.current.matchError).toBeNull();
  });

  it("sends correct payload to API", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(Response.json(makeApiResponse([])));

    const { result } = renderHook(() => useFeedbackMatching());

    await act(async () => {
      await result.current.matchFeedback(
        "Added dark mode",
        [
          {
            sha: "abc123",
            message: "feat: dark mode",
            fullMessage: "feat: dark mode support",
            author: "dev",
          },
        ],
        [
          {
            _id: feedbackId("f1"),
            title: "Dark mode please",
            description: "Would love dark theme",
            status: "open",
            voteCount: 5,
            tags: [{ _id: "t1" as Id<"tags">, name: "ui" }],
          },
        ]
      );
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/ai/match-release-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        releaseNotes: "Added dark mode",
        commits: [
          {
            sha: "abc123",
            message: "feat: dark mode",
            fullMessage: "feat: dark mode support",
            author: "dev",
          },
        ],
        feedbackItems: [
          {
            id: "f1",
            title: "Dark mode please",
            description: "Would love dark theme",
            status: "open",
            tags: ["ui"],
          },
        ],
      }),
    });
  });

  it("parses valid API response with multiple confidence levels", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        makeApiResponse([
          { feedbackId: "f1", confidence: "high", reason: "direct fix" },
          { feedbackId: "f2", confidence: "medium", reason: "related change" },
          { feedbackId: "f3", confidence: "low", reason: "might be related" },
        ])
      )
    );

    const { result } = renderHook(() => useFeedbackMatching());

    await act(async () => {
      await result.current.matchFeedback(
        "release notes",
        [],
        [makeCandidate("f1"), makeCandidate("f2"), makeCandidate("f3")]
      );
    });

    expect(result.current.matches).toEqual([
      { feedbackId: "f1", confidence: "high", reason: "direct fix" },
      { feedbackId: "f2", confidence: "medium", reason: "related change" },
      { feedbackId: "f3", confidence: "low", reason: "might be related" },
    ]);
  });

  it("clears error when starting a new successful match", async () => {
    // First call fails
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new Error("Network error")
    );

    const { result } = renderHook(() => useFeedbackMatching());

    await act(async () => {
      await result.current.matchFeedback(
        "release notes",
        [],
        [makeCandidate("f1")]
      );
    });

    expect(result.current.matchError).toBe("Network error");

    // Second call succeeds
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(makeApiResponse([]))
    );

    await act(async () => {
      await result.current.matchFeedback(
        "release notes",
        [],
        [makeCandidate("f1")]
      );
    });

    expect(result.current.matchError).toBeNull();
  });
});
