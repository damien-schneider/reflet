import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildAgentPrompt } from "./copy-for-agents";

// Mock dependencies for CopyForAgents component tests
const mockUseQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    repo_analysis: { getLatestAnalysis: "repo_analysis.getLatestAnalysis" },
    github: { getConnectionStatus: "github.getConnectionStatus" },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("./agent-config", () => ({
  AGENTS: [
    {
      id: "copy-generic",
      label: "Copy prompt",
      icon: null,
      type: "copy",
      description: "Copy to clipboard",
    },
    {
      id: "cursor",
      label: "Open in Cursor",
      icon: null,
      type: "deeplink",
      description: "Open Cursor",
    },
    {
      id: "copilot-workspace",
      label: "Copilot Workspace",
      icon: null,
      type: "cloud",
      description: "Cloud agent",
    },
  ],
  openDeepLink: vi.fn(() => true),
  openCloudAgent: vi.fn(() => true),
}));

describe("buildAgentPrompt", () => {
  it("should include title in output", () => {
    const result = buildAgentPrompt({
      title: "Fix the login page",
      description: null,
      tags: [],
      projectContext: null,
    });
    expect(result).toContain("**Title:** Fix the login page");
  });

  it("should include description when provided", () => {
    const result = buildAgentPrompt({
      title: "Bug",
      description: "The button doesn't work",
      tags: [],
      projectContext: null,
    });
    expect(result).toContain("**Description:**\nThe button doesn't work");
  });

  it("should not include description when null", () => {
    const result = buildAgentPrompt({
      title: "Bug",
      description: null,
      tags: [],
      projectContext: null,
    });
    expect(result).not.toContain("**Description:**");
  });

  it("should include header section", () => {
    const result = buildAgentPrompt({
      title: "Test",
      description: null,
      tags: [],
      projectContext: null,
    });
    expect(result).toContain("# User Feedback to Resolve");
    expect(result).toContain("## Feedback");
  });

  it("should include instructions section", () => {
    const result = buildAgentPrompt({
      title: "Test",
      description: null,
      tags: [],
      projectContext: null,
    });
    expect(result).toContain("## Instructions");
    expect(result).toContain("Analyze the codebase");
  });

  it("should include tags when provided", () => {
    const result = buildAgentPrompt({
      title: "Bug",
      description: null,
      tags: [
        { _id: "t1" as never, name: "urgent", color: "red", icon: "🔥" },
        { _id: "t2" as never, name: "frontend", color: "blue" },
      ],
      projectContext: null,
    });
    expect(result).toContain("**Tags:** 🔥 urgent, frontend");
  });

  it("should not include tags section when tags array is empty", () => {
    const result = buildAgentPrompt({
      title: "Bug",
      description: null,
      tags: [],
      projectContext: null,
    });
    expect(result).not.toContain("**Tags:**");
  });

  it("should include project context when provided", () => {
    const result = buildAgentPrompt({
      title: "Bug",
      description: null,
      tags: [],
      projectContext: "**Project:** My App\n**Tech Stack:** Next.js",
    });
    expect(result).toContain("## Project Context");
    expect(result).toContain("**Project:** My App");
    expect(result).toContain("**Tech Stack:** Next.js");
  });

  it("should not include project context when null", () => {
    const result = buildAgentPrompt({
      title: "Bug",
      description: null,
      tags: [],
      projectContext: null,
    });
    expect(result).not.toContain("## Project Context");
  });

  it("should include image URLs when attachments are provided", () => {
    const result = buildAgentPrompt({
      title: "Button is broken",
      description: "The submit button doesn't work",
      tags: [],
      projectContext: null,
      attachments: [
        "https://example.com/screenshot1.png",
        "https://example.com/screenshot2.jpg",
      ],
    });

    expect(result).toContain("**Title:** Button is broken");
    expect(result).toContain(
      "**Description:**\nThe submit button doesn't work"
    );
    expect(result).toContain("## Attached Screenshots");
    expect(result).toContain("https://example.com/screenshot1.png");
    expect(result).toContain("https://example.com/screenshot2.jpg");
  });

  it("should not include attachments section when no attachments", () => {
    const result = buildAgentPrompt({
      title: "Feature request",
      description: "Add dark mode",
      tags: [],
      projectContext: null,
      attachments: [],
    });

    expect(result).toContain("**Title:** Feature request");
    expect(result).not.toContain("## Attached Screenshots");
  });

  it("should not include attachments section when attachments is undefined", () => {
    const result = buildAgentPrompt({
      title: "Feature request",
      description: "Add dark mode",
      tags: [],
      projectContext: null,
      attachments: undefined,
    });

    expect(result).toContain("**Title:** Feature request");
    expect(result).not.toContain("## Attached Screenshots");
  });

  it("should format multiple image URLs as a list", () => {
    const result = buildAgentPrompt({
      title: "UI Bug",
      description: null,
      tags: [],
      projectContext: null,
      attachments: [
        "https://cdn.example.com/img1.png",
        "https://cdn.example.com/img2.png",
        "https://cdn.example.com/img3.png",
      ],
    });

    expect(result).toContain("## Attached Screenshots");
    expect(result).toContain("- https://cdn.example.com/img1.png");
    expect(result).toContain("- https://cdn.example.com/img2.png");
    expect(result).toContain("- https://cdn.example.com/img3.png");
  });

  it("should include all sections for fully populated prompt", () => {
    const result = buildAgentPrompt({
      title: "Add dark mode",
      description: "Users want a dark mode toggle",
      tags: [{ _id: "t1" as never, name: "feature", color: "green" }],
      projectContext: "**Project:** Reflet",
      attachments: ["https://example.com/mock.png"],
    });
    expect(result).toContain("## Feedback");
    expect(result).toContain("**Tags:** feature");
    expect(result).toContain("## Project Context");
    expect(result).toContain("## Attached Screenshots");
    expect(result).toContain("## Instructions");
  });

  it("should handle tags with icon correctly", () => {
    const result = buildAgentPrompt({
      title: "Test",
      description: null,
      tags: [{ _id: "t1" as never, name: "bug", color: "red", icon: "🐛" }],
      projectContext: null,
    });
    expect(result).toContain("🐛 bug");
  });

  it("should handle tags without icon correctly", () => {
    const result = buildAgentPrompt({
      title: "Test",
      description: null,
      tags: [{ _id: "t1" as never, name: "bug", color: "red" }],
      projectContext: null,
    });
    expect(result).toContain("**Tags:** bug");
    expect(result).not.toContain("undefined");
  });
});

const organizationId = "org1" as Id<"organizations">;

// Import component after mocks
import { CopyForAgents } from "./copy-for-agents";

describe("CopyForAgents Component", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the Agents dropdown trigger button", () => {
    mockUseQuery.mockReturnValue(null);
    render(
      <CopyForAgents
        description="desc"
        organizationId={organizationId}
        title="Test"
      />
    );
    expect(screen.getByText("Agents")).toBeInTheDocument();
  });

  it("renders without crashing when no tags or attachments", () => {
    mockUseQuery.mockReturnValue(null);
    render(
      <CopyForAgents
        description={null}
        organizationId={organizationId}
        title="Test"
      />
    );
    expect(screen.getByText("Agents")).toBeInTheDocument();
  });

  it("opens dropdown and shows copy agents group", () => {
    mockUseQuery.mockReturnValue(null);
    render(
      <CopyForAgents
        description="desc"
        organizationId={organizationId}
        title="Test"
      />
    );
    // Click the trigger to open dropdown
    fireEvent.click(screen.getByText("Agents"));
    expect(screen.getByText("Copy for agents")).toBeInTheDocument();
    expect(screen.getByText("Copy prompt")).toBeInTheDocument();
  });

  it("shows deeplink agents section", () => {
    mockUseQuery.mockReturnValue(null);
    render(
      <CopyForAgents
        description="desc"
        organizationId={organizationId}
        title="Test"
      />
    );
    fireEvent.click(screen.getByText("Agents"));
    expect(screen.getByText("Open in editor")).toBeInTheDocument();
    expect(screen.getByText("Open in Cursor")).toBeInTheDocument();
  });

  it("filters out copilot-workspace when no repository", () => {
    mockUseQuery.mockImplementation((queryRef: string) => {
      if (queryRef === "github.getConnectionStatus") {
        return { repositoryFullName: null };
      }
      return null;
    });
    render(
      <CopyForAgents
        description="desc"
        organizationId={organizationId}
        title="Test"
      />
    );
    fireEvent.click(screen.getByText("Agents"));
    expect(screen.queryByText("Copilot Workspace")).not.toBeInTheDocument();
  });

  it("shows copilot-workspace when repository is available", () => {
    mockUseQuery.mockImplementation((queryRef: string) => {
      if (queryRef === "github.getConnectionStatus") {
        return { repositoryFullName: "owner/repo" };
      }
      return null;
    });
    render(
      <CopyForAgents
        description="desc"
        organizationId={organizationId}
        title="Test"
      />
    );
    fireEvent.click(screen.getByText("Agents"));
    expect(screen.getByText("Cloud agents")).toBeInTheDocument();
    expect(screen.getByText("Copilot Workspace")).toBeInTheDocument();
  });

  it("copies prompt to clipboard on copy agent click", async () => {
    mockUseQuery.mockReturnValue(null);
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(
      <CopyForAgents
        description="Test desc"
        organizationId={organizationId}
        title="Test title"
      />
    );
    fireEvent.click(screen.getByText("Agents"));
    fireEvent.click(screen.getByText("Copy prompt"));

    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining("Test title")
    );
  });

  it("includes project context from repo analysis in prompt", async () => {
    mockUseQuery.mockImplementation((queryRef: string) => {
      if (queryRef === "repo_analysis.getLatestAnalysis") {
        return {
          summary: "A feedback tool",
          techStack: "Next.js, Convex",
          architecture: "Monorepo",
        };
      }
      return null;
    });
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(
      <CopyForAgents
        description="desc"
        organizationId={organizationId}
        title="Test"
      />
    );
    fireEvent.click(screen.getByText("Agents"));
    fireEvent.click(screen.getByText("Copy prompt"));

    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining("A feedback tool")
    );
  });

  it("handles tags with null values in the array", () => {
    mockUseQuery.mockReturnValue(null);
    render(
      <CopyForAgents
        description="desc"
        organizationId={organizationId}
        tags={[null, { _id: "t1" as never, name: "bug", color: "red" }]}
        title="Test"
      />
    );
    // Should not crash
    expect(screen.getByText("Agents")).toBeInTheDocument();
  });

  it("includes feedback title in prompt output", () => {
    const result = buildAgentPrompt({
      title: "My Feature Request",
      description: "Details here",
      tags: [],
      attachments: [],
      projectContext: null,
    });
    expect(result).toContain("My Feature Request");
  });

  it("includes description in prompt output", () => {
    const result = buildAgentPrompt({
      title: "Title",
      description: "Descriptive content",
      tags: [],
      attachments: [],
      projectContext: null,
    });
    expect(result).toContain("Descriptive content");
  });
});
