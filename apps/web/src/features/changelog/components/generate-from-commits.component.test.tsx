import type { ReleaseSource } from "@reflet/backend/convex/changelog/source";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toId } from "@/lib/convex-helpers";

const {
  mockGenerateTitle,
  mockResolveSource,
  mockSaveGeneratedDraft,
  mockUseQuery,
} = vi.hoisted(() => ({
  mockGenerateTitle: vi.fn(),
  mockResolveSource: vi.fn(),
  mockSaveGeneratedDraft: vi.fn(),
  mockUseQuery: vi.fn(),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    changelog: {
      ai_actions: { generateReleaseTitle: "generateReleaseTitle" },
      release_commits: { getReleaseCommits: "getReleaseCommits" },
      release_drafts: { saveGeneratedDraft: "saveGeneratedDraft" },
      source_actions: { resolveReleaseSource: "resolveReleaseSource" },
    },
    integrations: {
      github: { queries: { getConnection: "getConnection" } },
    },
  },
}));

vi.mock("convex/react", () => ({
  useAction: (reference: string) =>
    reference === "resolveReleaseSource"
      ? mockResolveSource
      : mockGenerateTitle,
  useMutation: () => mockSaveGeneratedDraft,
  useQuery: mockUseQuery,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@ctrl-ui/react/ui/toast", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/analytics", () => ({ capture: vi.fn() }));

import { toast } from "@ctrl-ui/react/ui/toast";
import { GenerateFromCommits } from "./generate-from-commits";

const organizationId = toId("organizations", "org_1");
const releaseId = toId("releases", "rel_1");

const source: ReleaseSource = {
  baseRef: "v1.3.0",
  commits: [
    {
      author: "ada",
      date: "2026-01-01T00:00:00Z",
      fullMessage: "feat: search",
      message: "feat: search",
      sha: "a".repeat(40),
    },
  ],
  files: [],
  headRef: "v1.4.0",
  headSha: "a".repeat(40),
  pullRequests: [],
  totalCommits: 342,
};

const props = {
  onApplied: vi.fn(),
  onPreviewChange: vi.fn(),
  organizationId,
  orgSlug: "acme",
  saveRelease: vi.fn(),
  version: "v1.4.0",
};

const connectRepository = (repositoryFullName?: string) =>
  mockUseQuery.mockReturnValue({
    installationId: "inst_1",
    repositoryFullName,
  });

const generate = async () => {
  render(<GenerateFromCommits {...props} />);
  await userEvent.setup().click(screen.getByText("Generate with AI"));
};

describe("GenerateFromCommits", () => {
  beforeEach(() => {
    connectRepository("acme/app");
    props.saveRelease.mockResolvedValue(releaseId);
    mockResolveSource.mockResolvedValue(source);
    mockGenerateTitle.mockResolvedValue("Faster search");
    mockSaveGeneratedDraft.mockResolvedValue({
      applied: true,
      draftId: "draft_1",
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("# Release notes")
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("renders nothing without a GitHub installation", () => {
    mockUseQuery.mockReturnValue(null);
    const { container } = render(<GenerateFromCommits {...props} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links to repository setup when no repository is connected", () => {
    connectRepository();
    render(<GenerateFromCommits {...props} />);
    expect(
      screen.getByText("Connect a repository to generate")
    ).toBeInTheDocument();
  });

  it("generates from the resolved source and saves the draft once the AI succeeds", async () => {
    await generate();

    await vi.waitFor(() => expect(props.onApplied).toHaveBeenCalled());
    expect(mockResolveSource).toHaveBeenCalledWith({
      releaseId,
      version: "v1.4.0",
    });
    const [url, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(url).toBe("/api/ai/generate-release-notes");
    expect(JSON.parse(String(init?.body))).toEqual({
      organizationId,
      releaseId,
      repositoryName: "acme/app",
      source,
      version: "v1.4.0",
    });
    expect(props.onPreviewChange).toHaveBeenCalledWith("# Release notes");
    expect(mockSaveGeneratedDraft).toHaveBeenCalledWith({
      description: "# Release notes",
      releaseId,
      source,
      title: "Faster search",
    });
    expect(toast.success).toHaveBeenCalledWith(
      "Generated from 1 of 342 commits"
    );
    expect(props.onPreviewChange).toHaveBeenLastCalledWith(null);
  });

  it("keeps human edits when the draft is left pending", async () => {
    mockSaveGeneratedDraft.mockResolvedValue({
      applied: false,
      draftId: "draft_1",
    });
    await generate();

    await vi.waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(props.onApplied).not.toHaveBeenCalled();
  });

  it("writes nothing when the AI request fails", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        { error: "AI generation limit reached, try again later" },
        { status: 429 }
      )
    );
    await generate();

    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "AI generation limit reached, try again later"
      )
    );
    expect(mockSaveGeneratedDraft).not.toHaveBeenCalled();
  });

  it("stops without calling the AI when the release has no source material", async () => {
    mockResolveSource.mockResolvedValue({
      ...source,
      commits: [],
      totalCommits: 0,
    });
    await generate();

    await vi.waitFor(() => expect(toast.info).toHaveBeenCalled());
    expect(fetch).not.toHaveBeenCalled();
    expect(mockSaveGeneratedDraft).not.toHaveBeenCalled();
  });

  it("cancels the stream and saves nothing", async () => {
    vi.mocked(fetch).mockImplementation((_url, init) => {
      const { promise, reject } = Promise.withResolvers<Response>();
      init?.signal?.addEventListener("abort", () =>
        reject(new DOMException("Aborted", "AbortError"))
      );
      return promise;
    });
    const user = userEvent.setup();
    render(<GenerateFromCommits {...props} />);
    await user.click(screen.getByText("Generate with AI"));
    await user.click(await screen.findByText("Cancel"));

    await vi.waitFor(() =>
      expect(screen.getByText("Generate with AI")).toBeInTheDocument()
    );
    expect(mockSaveGeneratedDraft).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
