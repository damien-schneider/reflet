import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildAgentPrompt } from "./copy-for-agents";

// Mock dependencies for CopyForAgents component tests
const mockUseQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    feedback: {
      clarification: {
        generateCodingPrompt: "feedback.clarification.generateCodingPrompt",
      },
    },
    integrations: {
      github: {
        queries: {
          getConnectionStatus: "github.getConnectionStatus",
        },
        repo_analysis: {
          getLatestAnalysis: "repo_analysis.getLatestAnalysis",
        },
      },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("./agent-config", () => ({
  AGENTS: [
    {
      description: "Copy to clipboard",
      icon: null,
      id: "copy-generic",
      label: "Copy prompt",
      type: "copy",
    },
    {
      description: "Open Cursor",
      icon: null,
      id: "cursor",
      label: "Open in Cursor",
      type: "deeplink",
    },
    {
      description: "Cloud agent",
      icon: null,
      id: "copilot-workspace",
      label: "Copilot Workspace",
      type: "cloud",
    },
  ],
  openCloudAgent: vi.fn(() => true),
  openDeepLink: vi.fn(() => true),
}));

describe("buildAgentPrompt", () => {
  it("should include title in output", () => {
    const result = buildAgentPrompt({
      description: null,
      projectContext: null,
      tags: [],
      title: "Fix the login page",
    });
    expect(result).toContain("**Title:** Fix the login page");
  });

  it("should include description when provided", () => {
    const result = buildAgentPrompt({
      description: "The button doesn't work",
      projectContext: null,
      tags: [],
      title: "Bug",
    });
    expect(result).toContain("**Description:**\nThe button doesn't work");
  });

  it("should not include description when null", () => {
    const result = buildAgentPrompt({
      description: null,
      projectContext: null,
      tags: [],
      title: "Bug",
    });
    expect(result).not.toContain("**Description:**");
  });

  it("should include header section", () => {
    const result = buildAgentPrompt({
      description: null,
      projectContext: null,
      tags: [],
      title: "Test",
    });
    expect(result).toContain("# User Feedback to Resolve");
    expect(result).toContain("## Feedback");
  });

  it("should include instructions section", () => {
    const result = buildAgentPrompt({
      description: null,
      projectContext: null,
      tags: [],
      title: "Test",
    });
    expect(result).toContain("## Instructions");
    expect(result).toContain("Analyze the codebase");
  });

  it("should include tags when provided", () => {
    const result = buildAgentPrompt({
      description: null,
      projectContext: null,
      tags: [
        { _id: "t1" as never, color: "red", icon: "🔥", name: "urgent" },
        { _id: "t2" as never, color: "blue", name: "frontend" },
      ],
      title: "Bug",
    });
    expect(result).toContain("**Tags:** 🔥 urgent, frontend");
  });

  it("should not include tags section when tags array is empty", () => {
    const result = buildAgentPrompt({
      description: null,
      projectContext: null,
      tags: [],
      title: "Bug",
    });
    expect(result).not.toContain("**Tags:**");
  });

  it("should include project context when provided", () => {
    const result = buildAgentPrompt({
      description: null,
      projectContext: "**Project:** My App\n**Tech Stack:** Next.js",
      tags: [],
      title: "Bug",
    });
    expect(result).toContain("## Project Context");
    expect(result).toContain("**Project:** My App");
    expect(result).toContain("**Tech Stack:** Next.js");
  });

  it("should not include project context when null", () => {
    const result = buildAgentPrompt({
      description: null,
      projectContext: null,
      tags: [],
      title: "Bug",
    });
    expect(result).not.toContain("## Project Context");
  });

  it("should include image URLs when attachments are provided", () => {
    const result = buildAgentPrompt({
      attachments: [
        "https://example.com/screenshot1.png",
        "https://example.com/screenshot2.jpg",
      ],
      description: "The submit button doesn't work",
      projectContext: null,
      tags: [],
      title: "Button is broken",
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
      attachments: [],
      description: "Add dark mode",
      projectContext: null,
      tags: [],
      title: "Feature request",
    });

    expect(result).toContain("**Title:** Feature request");
    expect(result).not.toContain("## Attached Screenshots");
  });

  it("should not include attachments section when attachments is undefined", () => {
    const result = buildAgentPrompt({
      attachments: undefined,
      description: "Add dark mode",
      projectContext: null,
      tags: [],
      title: "Feature request",
    });

    expect(result).toContain("**Title:** Feature request");
    expect(result).not.toContain("## Attached Screenshots");
  });

  it("should format multiple image URLs as a list", () => {
    const result = buildAgentPrompt({
      attachments: [
        "https://cdn.example.com/img1.png",
        "https://cdn.example.com/img2.png",
        "https://cdn.example.com/img3.png",
      ],
      description: null,
      projectContext: null,
      tags: [],
      title: "UI Bug",
    });

    expect(result).toContain("## Attached Screenshots");
    expect(result).toContain("- https://cdn.example.com/img1.png");
    expect(result).toContain("- https://cdn.example.com/img2.png");
    expect(result).toContain("- https://cdn.example.com/img3.png");
  });

  it("should include all sections for fully populated prompt", () => {
    const result = buildAgentPrompt({
      attachments: ["https://example.com/mock.png"],
      description: "Users want a dark mode toggle",
      projectContext: "**Project:** Reflet",
      tags: [{ _id: "t1" as never, color: "green", name: "feature" }],
      title: "Add dark mode",
    });
    expect(result).toContain("## Feedback");
    expect(result).toContain("**Tags:** feature");
    expect(result).toContain("## Project Context");
    expect(result).toContain("## Attached Screenshots");
    expect(result).toContain("## Instructions");
  });

  it("should handle tags with icon correctly", () => {
    const result = buildAgentPrompt({
      description: null,
      projectContext: null,
      tags: [{ _id: "t1" as never, color: "red", icon: "🐛", name: "bug" }],
      title: "Test",
    });
    expect(result).toContain("🐛 bug");
  });

  it("should handle tags without icon correctly", () => {
    const result = buildAgentPrompt({
      description: null,
      projectContext: null,
      tags: [{ _id: "t1" as never, color: "red", name: "bug" }],
      title: "Test",
    });
    expect(result).toContain("**Tags:** bug");
    expect(result).not.toContain("undefined");
  });
});

const feedbackId = "f1" as Id<"feedback">;
const organizationId = "org1" as Id<"organizations">;

// Import component after mocks
import { CopyForAgents } from "./copy-for-agents";

describe("CopyForAgents Component", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Agents dropdown trigger button", () => {
    mockUseQuery.mockReturnValue(null);
    render(
      <CopyForAgents
        description="desc"
        feedbackId={feedbackId}
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
        feedbackId={feedbackId}
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
        feedbackId={feedbackId}
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
        feedbackId={feedbackId}
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
        feedbackId={feedbackId}
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
        feedbackId={feedbackId}
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
        feedbackId={feedbackId}
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
          architecture: "Monorepo",
          summary: "A feedback tool",
          techStack: "Next.js, Convex",
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
        feedbackId={feedbackId}
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
        feedbackId={feedbackId}
        organizationId={organizationId}
        tags={[null, { _id: "t1" as never, color: "red", name: "bug" }]}
        title="Test"
      />
    );
    // Should not crash
    expect(screen.getByText("Agents")).toBeInTheDocument();
  });

  it("includes feedback title in prompt output", () => {
    const result = buildAgentPrompt({
      attachments: [],
      description: "Details here",
      projectContext: null,
      tags: [],
      title: "My Feature Request",
    });
    expect(result).toContain("My Feature Request");
  });

  it("includes description in prompt output", () => {
    const result = buildAgentPrompt({
      attachments: [],
      description: "Descriptive content",
      projectContext: null,
      tags: [],
      title: "Title",
    });
    expect(result).toContain("Descriptive content");
  });
});
