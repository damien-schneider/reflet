import { describe, expect, it } from "vitest";

// Import the function we're testing
// This will fail initially because the function doesn't have this signature yet
import { buildAgentPrompt } from "./copy-for-agents";

describe("buildAgentPrompt", () => {
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
});
