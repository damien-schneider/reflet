import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetToken = vi.fn();
const mockFetchTags = vi.fn();
const mockFetchCommits = vi.fn();
const mockFetchRecent = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => undefined),
  useAction: vi.fn(() => vi.fn()),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    organizations: { get: "organizations.get" },
    github: { getConnection: "github.getConnection" },
    github_node_actions: {
      getInstallationToken: "github_node_actions.getInstallationToken",
    },
    github_release_actions: {
      fetchTags: "github_release_actions.fetchTags",
      fetchCommitsBetweenRefs: "github_release_actions.fetchCommitsBetweenRefs",
      fetchRecentCommits: "github_release_actions.fetchRecentCommits",
    },
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    ...rest
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  ),
}));

vi.mock("@phosphor-icons/react", () => ({
  Info: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="info-icon" />
  ),
  Lightning: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="lightning-icon" />
  ),
  Spinner: ({ className }: { className?: string }) => (
    <svg className={className} data-testid="spinner-icon" />
  ),
}));

import { useAction, useQuery } from "convex/react";
import { toast } from "sonner";
import { GenerateFromCommits } from "./generate-from-commits";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

const defaultProps = {
  organizationId: "org1" as never,
  orgSlug: "test-org",
  version: "1.0.0",
  onStreamStart: vi.fn(),
  onStreamChunk: vi.fn(),
  onComplete: vi.fn(),
  onTitleGenerated: vi.fn(),
};

const connectedQuery = (
  orgOverrides?: Record<string, unknown>,
  ghOverrides?: Record<string, unknown>
) => {
  vi.mocked(useQuery)
    .mockReturnValueOnce({ name: "Test Org", ...orgOverrides })
    .mockReturnValueOnce({
      installationId: "inst-123",
      repositoryFullName: "owner/repo",
      repositoryDefaultBranch: "main",
      ...ghOverrides,
    });
};

const setupActions = () => {
  vi.mocked(useAction).mockImplementation((action: unknown) => {
    const actionStr = String(action);
    if (actionStr.includes("getInstallationToken")) {
      return mockGetToken;
    }
    if (actionStr.includes("fetchTags")) {
      return mockFetchTags;
    }
    if (actionStr.includes("fetchCommitsBetweenRefs")) {
      return mockFetchCommits;
    }
    if (actionStr.includes("fetchRecentCommits")) {
      return mockFetchRecent;
    }
    return vi.fn();
  });
};

const sampleCommits = [
  {
    sha: "abc123",
    message: "feat: add new feature",
    fullMessage: "feat: add new feature\n\nDetailed description",
    author: "dev",
    date: "2026-01-01",
  },
  {
    sha: "def456",
    message: "fix: bug fix",
    fullMessage: "fix: bug fix",
    author: "dev2",
    date: "2026-01-02",
  },
];

const sampleFiles = [
  {
    filename: "src/index.ts",
    status: "modified",
    additions: 10,
    deletions: 5,
  },
];

const sampleTags = [
  { name: "v1.0.0", sha: "aaa" },
  { name: "v0.9.0", sha: "bbb" },
];

const createMockStreamResponse = (chunks: string[]) => {
  let index = 0;
  const reader = {
    read: vi.fn().mockImplementation(() => {
      if (index < chunks.length) {
        const encoder = new TextEncoder();
        const value = encoder.encode(chunks[index]);
        index++;
        return Promise.resolve({ done: false, value });
      }
      return Promise.resolve({ done: true, value: undefined });
    }),
  };
  return {
    ok: true,
    body: { getReader: () => reader },
  };
};

describe("GenerateFromCommits component", () => {
  describe("rendering branches", () => {
    it("returns null when no installation", () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ name: "Test Org" })
        .mockReturnValueOnce({
          installationId: null,
          repositoryFullName: null,
        });

      const { container } = render(<GenerateFromCommits {...defaultProps} />);
      expect(container.innerHTML).toBe("");
    });

    it("returns null when githubConnection is undefined", () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ name: "Test Org" })
        .mockReturnValueOnce(undefined);

      const { container } = render(<GenerateFromCommits {...defaultProps} />);
      expect(container.innerHTML).toBe("");
    });

    it("renders connect repository link when no repository", () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ name: "Test Org" })
        .mockReturnValueOnce({
          installationId: "inst-123",
          repositoryFullName: null,
        });

      render(<GenerateFromCommits {...defaultProps} />);
      expect(
        screen.getByText("Connect a repository to generate")
      ).toBeInTheDocument();
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/dashboard/test-org/settings/github"
      );
    });

    it("renders connect link with correct orgSlug", () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ name: "Test Org" })
        .mockReturnValueOnce({
          installationId: "inst-123",
          repositoryFullName: "",
        });

      render(<GenerateFromCommits {...defaultProps} orgSlug="my-custom-org" />);
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/dashboard/my-custom-org/settings/github"
      );
    });

    it("renders info icon in no-repository state", () => {
      vi.mocked(useQuery)
        .mockReturnValueOnce({ name: "Test Org" })
        .mockReturnValueOnce({
          installationId: "inst-123",
          repositoryFullName: null,
        });

      render(<GenerateFromCommits {...defaultProps} />);
      expect(screen.getByTestId("info-icon")).toBeInTheDocument();
    });

    it("renders AI Generate button when fully connected", () => {
      connectedQuery();
      render(<GenerateFromCommits {...defaultProps} />);
      expect(screen.getByText("AI Generate")).toBeInTheDocument();
    });

    it("renders lightning icon in default state", () => {
      connectedQuery();
      render(<GenerateFromCommits {...defaultProps} />);
      expect(screen.getByTestId("lightning-icon")).toBeInTheDocument();
    });

    it("renders button as disabled when disabled prop is true", () => {
      connectedQuery();
      render(<GenerateFromCommits {...defaultProps} disabled />);
      expect(screen.getByText("AI Generate").closest("button")).toBeDisabled();
    });

    it("renders button as enabled when disabled prop is false", () => {
      connectedQuery();
      render(<GenerateFromCommits {...defaultProps} disabled={false} />);
      expect(
        screen.getByText("AI Generate").closest("button")
      ).not.toBeDisabled();
    });

    it("renders Generating text with spinner when isStreaming", () => {
      connectedQuery();
      render(<GenerateFromCommits {...defaultProps} isStreaming />);
      expect(screen.getByText("Generating...")).toBeInTheDocument();
      expect(screen.getByTestId("spinner-icon")).toBeInTheDocument();
    });

    it("button is disabled when isStreaming", () => {
      connectedQuery();
      render(<GenerateFromCommits {...defaultProps} isStreaming />);
      expect(
        screen.getByText("Generating...").closest("button")
      ).toBeDisabled();
    });
  });

  describe("handleGenerate - zero commits", () => {
    it("shows info toast when no commits found", async () => {
      const user = userEvent.setup();
      setupActions();
      connectedQuery();

      mockGetToken.mockResolvedValue({ token: "gh-token" });
      mockFetchTags.mockResolvedValue([]);
      mockFetchRecent.mockResolvedValue([]);

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(
          "No commits found to generate from."
        );
      });
      expect(defaultProps.onStreamStart).not.toHaveBeenCalled();
    });
  });

  describe("handleGenerate - successful generation with previous tag", () => {
    beforeEach(() => {
      setupActions();
      mockGetToken.mockResolvedValue({ token: "gh-token" });
    });

    it("fetches commits between tags and streams output", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue(sampleTags);
      mockFetchCommits.mockResolvedValue({
        commits: sampleCommits,
        files: sampleFiles,
      });

      const fetchSpy = vi.spyOn(globalThis, "fetch");
      fetchSpy
        .mockResolvedValueOnce(
          createMockStreamResponse(["# Release ", "Notes"]) as never
        )
        .mockResolvedValueOnce(Response.json({ title: "New Feature Release" }));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(defaultProps.onStreamStart).toHaveBeenCalled();
      });

      await vi.waitFor(() => {
        expect(defaultProps.onComplete).toHaveBeenCalledWith("# Release Notes");
      });

      expect(toast.success).toHaveBeenCalledWith("Generated from 2 commits");
    });

    it("shows singular commit message for 1 commit", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue(sampleTags);
      mockFetchCommits.mockResolvedValue({
        commits: [sampleCommits[0]],
        files: [],
      });

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Generated from 1 commit");
      });
    });

    it("calls onStreamChunk with accumulated content", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue(sampleTags);
      mockFetchCommits.mockResolvedValue({
        commits: sampleCommits,
        files: undefined,
      });

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          createMockStreamResponse(["chunk1", "chunk2"]) as never
        )
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(defaultProps.onStreamChunk).toHaveBeenCalled();
      });
    });

    it("sends correct POST body to release notes API", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue(sampleTags);
      mockFetchCommits.mockResolvedValue({
        commits: sampleCommits,
        files: sampleFiles,
      });

      const fetchSpy = vi.spyOn(globalThis, "fetch");
      fetchSpy
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          "/api/ai/generate-release-notes",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      const firstCallBody = JSON.parse(
        (fetchSpy.mock.calls[0]?.[1] as RequestInit)?.body as string
      );
      expect(firstCallBody.version).toBe("1.0.0");
      expect(firstCallBody.repositoryName).toBe("owner/repo");
      expect(firstCallBody.commits).toHaveLength(2);
      expect(firstCallBody.files).toHaveLength(1);
    });

    it("uses targetBranch as head when current tag not in tags list", async () => {
      const user = userEvent.setup();
      connectedQuery();

      const props = { ...defaultProps, version: "2.0.0" };

      mockFetchTags.mockResolvedValue(sampleTags);
      mockFetchCommits.mockResolvedValue({
        commits: sampleCommits,
        files: undefined,
      });

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...props} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(mockFetchCommits).toHaveBeenCalledWith(
          expect.objectContaining({
            base: "v1.0.0",
            head: "main",
          })
        );
      });
    });

    it("uses current tag as head when tag exists", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue(sampleTags);
      mockFetchCommits.mockResolvedValue({
        commits: sampleCommits,
        files: undefined,
      });

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(mockFetchCommits).toHaveBeenCalledWith(
          expect.objectContaining({
            base: "v0.9.0",
            head: "1.0.0",
          })
        );
      });
    });
  });

  describe("handleGenerate - no previous tag (fetches recent)", () => {
    beforeEach(() => {
      setupActions();
      mockGetToken.mockResolvedValue({ token: "gh-token" });
    });

    it("fetches recent commits when no tags exist", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([]);
      mockFetchRecent.mockResolvedValue(sampleCommits);

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(mockFetchRecent).toHaveBeenCalledWith(
          expect.objectContaining({
            branch: "main",
            perPage: 30,
          })
        );
      });
    });

    it("sends undefined files when fetching recent commits", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([]);
      mockFetchRecent.mockResolvedValue(sampleCommits);

      const fetchSpy = vi.spyOn(globalThis, "fetch");
      fetchSpy
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(fetchSpy).toHaveBeenCalled();
      });

      const body = JSON.parse(
        (fetchSpy.mock.calls[0]?.[1] as RequestInit)?.body as string
      );
      expect(body.files).toBeUndefined();
    });

    it("uses custom targetBranch from changelogSettings", async () => {
      const user = userEvent.setup();
      setupActions();
      mockGetToken.mockResolvedValue({ token: "gh-token" });
      mockFetchTags.mockResolvedValue([]);
      mockFetchRecent.mockResolvedValue(sampleCommits);

      vi.mocked(useQuery)
        .mockReturnValueOnce({
          name: "Org",
          changelogSettings: { targetBranch: "develop" },
        })
        .mockReturnValueOnce({
          installationId: "inst-123",
          repositoryFullName: "owner/repo",
          repositoryDefaultBranch: "main",
        });

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(mockFetchRecent).toHaveBeenCalledWith(
          expect.objectContaining({ branch: "develop" })
        );
      });
    });

    it("falls back to repositoryDefaultBranch when no changelogSettings", async () => {
      const user = userEvent.setup();
      setupActions();
      mockGetToken.mockResolvedValue({ token: "gh-token" });
      mockFetchTags.mockResolvedValue([]);
      mockFetchRecent.mockResolvedValue(sampleCommits);

      vi.mocked(useQuery)
        .mockReturnValueOnce({ name: "Org" })
        .mockReturnValueOnce({
          installationId: "inst-123",
          repositoryFullName: "owner/repo",
          repositoryDefaultBranch: "develop",
        });

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(mockFetchRecent).toHaveBeenCalledWith(
          expect.objectContaining({ branch: "develop" })
        );
      });
    });
  });

  describe("handleGenerate - error handling", () => {
    beforeEach(() => {
      setupActions();
      mockGetToken.mockResolvedValue({ token: "gh-token" });
    });

    it("shows error toast when getToken fails", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockGetToken.mockRejectedValue(new Error("Token fetch failed"));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Token fetch failed");
      });
      expect(defaultProps.onComplete).toHaveBeenCalledWith("");
    });

    it("shows error toast when fetchTags fails", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockRejectedValue(new Error("Tags fetch failed"));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Tags fetch failed");
      });
    });

    it("shows generic error for non-Error thrown values", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockRejectedValue("something broke");

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Failed to generate notes");
      });
    });

    it("silently returns on AbortError", async () => {
      const user = userEvent.setup();
      connectedQuery();

      const abortError = new DOMException("Aborted", "AbortError");
      mockFetchTags.mockRejectedValue(abortError);

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(mockFetchTags).toHaveBeenCalled();
      });

      // Allow async to settle
      await new Promise((r) => setTimeout(r, 50));

      expect(toast.error).not.toHaveBeenCalled();
      expect(defaultProps.onComplete).not.toHaveBeenCalled();
    });

    it("shows error when stream response is not ok", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue(sampleTags);
      mockFetchCommits.mockResolvedValue({
        commits: sampleCommits,
        files: undefined,
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        body: null,
      } as never);

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to start AI generation"
        );
      });
      expect(defaultProps.onComplete).toHaveBeenCalledWith("");
    });

    it("shows error when stream response has no body", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue(sampleTags);
      mockFetchCommits.mockResolvedValue({
        commits: sampleCommits,
        files: undefined,
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        body: null,
      } as never);

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to start AI generation"
        );
      });
    });

    it("calls onComplete with empty string on error", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockRejectedValue(new Error("fail"));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(defaultProps.onComplete).toHaveBeenCalledWith("");
      });
    });

    it("shows error toast when fetchCommits fails", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue(sampleTags);
      mockFetchCommits.mockRejectedValue(new Error("Commits fetch failed"));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Commits fetch failed");
      });
    });

    it("shows error toast when fetchRecent fails", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([]);
      mockFetchRecent.mockRejectedValue(
        new Error("Recent commits fetch failed")
      );

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Recent commits fetch failed");
      });
    });
  });

  describe("handleGenerate - title generation", () => {
    beforeEach(() => {
      setupActions();
      mockGetToken.mockResolvedValue({ token: "gh-token" });
    });

    it("generates title after successful stream", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([]);
      mockFetchRecent.mockResolvedValue(sampleCommits);

      const fetchSpy = vi.spyOn(globalThis, "fetch");
      fetchSpy
        .mockResolvedValueOnce(
          createMockStreamResponse(["Full content"]) as never
        )
        .mockResolvedValueOnce(Response.json({ title: "My Title" }));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(defaultProps.onTitleGenerated).toHaveBeenCalledWith("My Title");
      });
    });

    it("sends correct body to title generation API", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([]);
      mockFetchRecent.mockResolvedValue(sampleCommits);

      const fetchSpy = vi.spyOn(globalThis, "fetch");
      fetchSpy
        .mockResolvedValueOnce(
          createMockStreamResponse(["description"]) as never
        )
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        const titleCall = fetchSpy.mock.calls.find(
          (call) => call[0] === "/api/ai/generate-release-title"
        );
        expect(titleCall).toBeDefined();
        const body = JSON.parse(
          (titleCall?.[1] as RequestInit)?.body as string
        );
        expect(body.description).toBe("description");
        expect(body.version).toBe("1.0.0");
      });
    });

    it("does not call onTitleGenerated when title response is not ok", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([]);
      mockFetchRecent.mockResolvedValue(sampleCommits);

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(new Response(null, { status: 500 }));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(defaultProps.onComplete).toHaveBeenCalled();
      });

      await new Promise((r) => setTimeout(r, 50));
      expect(defaultProps.onTitleGenerated).not.toHaveBeenCalled();
    });

    it("does not call onTitleGenerated when response has no title field", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([]);
      mockFetchRecent.mockResolvedValue(sampleCommits);

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ other: "data" }));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(defaultProps.onComplete).toHaveBeenCalled();
      });

      await new Promise((r) => setTimeout(r, 50));
      expect(defaultProps.onTitleGenerated).not.toHaveBeenCalled();
    });

    it("does not call onTitleGenerated when title is not a string", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([]);
      mockFetchRecent.mockResolvedValue(sampleCommits);

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: 123 }));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(defaultProps.onComplete).toHaveBeenCalled();
      });

      await new Promise((r) => setTimeout(r, 50));
      expect(defaultProps.onTitleGenerated).not.toHaveBeenCalled();
    });

    it("silently handles title generation fetch errors", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([]);
      mockFetchRecent.mockResolvedValue(sampleCommits);

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockRejectedValueOnce(new Error("Network error"));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(defaultProps.onComplete).toHaveBeenCalled();
      });

      await new Promise((r) => setTimeout(r, 50));
      expect(toast.success).toHaveBeenCalled();
    });

    it("sends undefined version when version is empty string", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([]);
      mockFetchRecent.mockResolvedValue(sampleCommits);

      const fetchSpy = vi.spyOn(globalThis, "fetch");
      fetchSpy
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} version="" />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        const titleCall = fetchSpy.mock.calls.find(
          (call) => call[0] === "/api/ai/generate-release-title"
        );
        expect(titleCall).toBeDefined();
        const body = JSON.parse(
          (titleCall?.[1] as RequestInit)?.body as string
        );
        expect(body.version).toBeUndefined();
      });
    });
  });

  describe("handleGenerate - version edge cases", () => {
    beforeEach(() => {
      setupActions();
      mockGetToken.mockResolvedValue({ token: "gh-token" });
    });

    it("trims version whitespace", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([
        { name: "v1.0.0", sha: "aaa" },
        { name: "v0.9.0", sha: "bbb" },
      ]);
      mockFetchCommits.mockResolvedValue({
        commits: sampleCommits,
        files: undefined,
      });

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} version="  1.0.0  " />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(mockFetchCommits).toHaveBeenCalled();
      });
    });

    it("sends undefined version in POST body when version is empty", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([]);
      mockFetchRecent.mockResolvedValue(sampleCommits);

      const fetchSpy = vi.spyOn(globalThis, "fetch");
      fetchSpy
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} version="" />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        const releaseCall = fetchSpy.mock.calls.find(
          (call) => call[0] === "/api/ai/generate-release-notes"
        );
        expect(releaseCall).toBeDefined();
        const body = JSON.parse(
          (releaseCall?.[1] as RequestInit)?.body as string
        );
        expect(body.version).toBeUndefined();
      });
    });

    it("sends undefined previousVersion when no previous tag", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([]);
      mockFetchRecent.mockResolvedValue(sampleCommits);

      const fetchSpy = vi.spyOn(globalThis, "fetch");
      fetchSpy
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        const releaseCall = fetchSpy.mock.calls.find(
          (call) => call[0] === "/api/ai/generate-release-notes"
        );
        expect(releaseCall).toBeDefined();
        const body = JSON.parse(
          (releaseCall?.[1] as RequestInit)?.body as string
        );
        expect(body.previousVersion).toBeUndefined();
      });
    });
  });

  describe("findPreviousTag logic (tested through component)", () => {
    beforeEach(() => {
      setupActions();
      mockGetToken.mockResolvedValue({ token: "gh-token" });
    });

    it("finds previous tag when current tag is in list", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([
        { name: "v1.0.0", sha: "a" },
        { name: "v0.9.0", sha: "b" },
        { name: "v0.8.0", sha: "c" },
      ]);
      mockFetchCommits.mockResolvedValue({
        commits: sampleCommits,
        files: undefined,
      });

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} version="v0.9.0" />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(mockFetchCommits).toHaveBeenCalledWith(
          expect.objectContaining({
            base: "v0.8.0",
          })
        );
      });
    });

    it("uses first tag when current version not found in tags", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([
        { name: "v2.0.0", sha: "a" },
        { name: "v1.0.0", sha: "b" },
      ]);
      mockFetchCommits.mockResolvedValue({
        commits: sampleCommits,
        files: undefined,
      });

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} version="3.0.0" />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(mockFetchCommits).toHaveBeenCalledWith(
          expect.objectContaining({
            base: "v2.0.0",
          })
        );
      });
    });

    it("uses first tag as previousTag when no version provided", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([
        { name: "v1.0.0", sha: "a" },
        { name: "v0.9.0", sha: "b" },
      ]);
      mockFetchCommits.mockResolvedValue({
        commits: sampleCommits,
        files: undefined,
      });

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} version="" />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(mockFetchCommits).toHaveBeenCalledWith(
          expect.objectContaining({
            base: "v1.0.0",
          })
        );
      });
    });

    it("returns first tag when current is last tag in list", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([{ name: "v1.0.0", sha: "a" }]);
      mockFetchCommits.mockResolvedValue({
        commits: sampleCommits,
        files: undefined,
      });

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(mockFetchCommits).toHaveBeenCalledWith(
          expect.objectContaining({ base: "v1.0.0" })
        );
      });
    });

    it("matches v-prefixed tag for current version", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([
        { name: "v1.0.0", sha: "a" },
        { name: "v0.5.0", sha: "b" },
      ]);
      mockFetchCommits.mockResolvedValue({
        commits: sampleCommits,
        files: undefined,
      });

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} version="1.0.0" />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(mockFetchCommits).toHaveBeenCalledWith(
          expect.objectContaining({ base: "v0.5.0" })
        );
      });
    });
  });

  describe("tagExists logic (tested through component)", () => {
    beforeEach(() => {
      setupActions();
      mockGetToken.mockResolvedValue({ token: "gh-token" });
    });

    it("uses tag as head when tag name exactly matches version", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([
        { name: "1.0.0", sha: "a" },
        { name: "0.9.0", sha: "b" },
      ]);
      mockFetchCommits.mockResolvedValue({
        commits: sampleCommits,
        files: undefined,
      });

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} version="1.0.0" />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(mockFetchCommits).toHaveBeenCalledWith(
          expect.objectContaining({ head: "1.0.0" })
        );
      });
    });

    it("uses targetBranch as head when tag does not exist", async () => {
      const user = userEvent.setup();
      connectedQuery();

      mockFetchTags.mockResolvedValue([
        { name: "v2.0.0", sha: "a" },
        { name: "v1.0.0", sha: "b" },
      ]);
      mockFetchCommits.mockResolvedValue({
        commits: sampleCommits,
        files: undefined,
      });

      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(createMockStreamResponse(["content"]) as never)
        .mockResolvedValueOnce(Response.json({ title: "Title" }));

      render(<GenerateFromCommits {...defaultProps} version="99.0.0" />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(mockFetchCommits).toHaveBeenCalledWith(
          expect.objectContaining({ head: "main" })
        );
      });
    });
  });

  describe("fetching state transitions", () => {
    beforeEach(() => {
      setupActions();
      mockGetToken.mockResolvedValue({ token: "gh-token" });
    });

    it("resets button state after error", async () => {
      const user = userEvent.setup();
      vi.mocked(useQuery)
        .mockReturnValue({ name: "Test Org" })
        .mockReturnValueOnce({ name: "Test Org" })
        .mockReturnValueOnce({
          installationId: "inst-123",
          repositoryFullName: "owner/repo",
          repositoryDefaultBranch: "main",
        });

      mockFetchTags.mockRejectedValue(new Error("fail"));

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it("resets button state after zero commits", async () => {
      const user = userEvent.setup();
      vi.mocked(useQuery)
        .mockReturnValue({ name: "Test Org" })
        .mockReturnValueOnce({ name: "Test Org" })
        .mockReturnValueOnce({
          installationId: "inst-123",
          repositoryFullName: "owner/repo",
          repositoryDefaultBranch: "main",
        });

      mockFetchTags.mockResolvedValue([]);
      mockFetchRecent.mockResolvedValue([]);

      render(<GenerateFromCommits {...defaultProps} />);
      await user.click(screen.getByText("AI Generate"));

      await vi.waitFor(() => {
        expect(toast.info).toHaveBeenCalled();
      });
    });
  });
});
