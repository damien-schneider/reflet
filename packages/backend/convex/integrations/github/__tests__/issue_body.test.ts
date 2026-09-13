import { describe, expect, test } from "vitest";
import type { Doc } from "../../../_generated/dataModel";
import { buildIssueBody, feedbackIdFromIssueBody } from "../issue_body";

const FEEDBACK_ID = "js7cqbnxcv3zrgt3jj0ef3gnt17zcz79";

function feedbackDoc(
  overrides: Partial<Doc<"feedback">> = {}
): Doc<"feedback"> {
  const now = Date.now();
  return {
    _creationTime: now,
    _id: FEEDBACK_ID as Doc<"feedback">["_id"],
    commentCount: 0,
    createdAt: now,
    description: "Clicking save loses the draft",
    isApproved: true,
    isPinned: false,
    organizationId: "org" as Doc<"feedback">["organizationId"],
    status: "open",
    title: "Draft lost",
    updatedAt: now,
    voteCount: 0,
    ...overrides,
  };
}

describe("buildIssueBody", () => {
  test("renders description, context, screenshots and the marker footer", () => {
    const body = buildIssueBody({
      dashboardUrl: "https://reflet.app/dashboard/acme/feedback/abc",
      feedback: feedbackDoc({
        context: {
          browser: "Chrome 128",
          consoleEvents: [
            { level: "warn", message: "ignored warning", timestamp: 1 },
            {
              level: "error",
              message: "TypeError: x is undefined",
              timestamp: 2,
            },
          ],
          os: "macOS",
          selection: {
            componentStack: ["Editor", "SaveButton"],
            html: "<button>",
            label: "Save",
            rect: { height: 1, width: 1, x: 0, y: 0 },
            selector: "button.save",
            sourceLocation: "src/editor.tsx:42",
          },
          url: "https://app.acme.com/editor",
          viewport: { devicePixelRatio: 2, height: 900, width: 1440 },
        },
      }),
      screenshots: [
        { filename: "shot.png", url: "https://files/shot.png" },
        { filename: "missing.png", url: null },
      ],
    });

    expect(body).toContain("Clicking save loses the draft");
    expect(body).toContain("- URL: https://app.acme.com/editor");
    expect(body).toContain("- Environment: Chrome 128 · macOS");
    expect(body).toContain("- Viewport: 1440×900 @2x");
    expect(body).toContain("- Element: Save (`button.save`)");
    expect(body).toContain("- Source: src/editor.tsx:42");
    expect(body).toContain("- Components: Editor > SaveButton");
    expect(body).toContain("TypeError: x is undefined");
    expect(body).not.toContain("ignored warning");
    expect(body).toContain("- [shot.png](https://files/shot.png)");
    expect(body).not.toContain("missing.png");
    expect(body).toContain(
      "[Open in Reflet](https://reflet.app/dashboard/acme/feedback/abc)"
    );
    expect(feedbackIdFromIssueBody(body)).toBe(FEEDBACK_ID);
  });

  test("keeps only the last 10 console errors", () => {
    const consoleEvents = Array.from({ length: 12 }, (_, index) => ({
      level: "error" as const,
      message: `error-${index}`,
      timestamp: index,
    }));
    const body = buildIssueBody({
      dashboardUrl: "https://reflet.app",
      feedback: feedbackDoc({ context: { consoleEvents } }),
      screenshots: [],
    });

    expect(body).toContain("Console errors (last 10)");
    expect(body).not.toContain("error-1\n");
    expect(body).toContain("error-2\n");
    expect(body).toContain("error-11");
  });

  test("skips context and screenshot sections when empty", () => {
    const body = buildIssueBody({
      dashboardUrl: "https://reflet.app",
      feedback: feedbackDoc({ description: "" }),
      screenshots: [],
    });

    expect(body).toContain("_No description provided._");
    expect(body).not.toContain("### Report context");
    expect(body).not.toContain("### Screenshots");
  });
});

describe("feedbackIdFromIssueBody", () => {
  test("returns undefined without a marker", () => {
    expect(feedbackIdFromIssueBody("plain issue")).toBeUndefined();
    expect(feedbackIdFromIssueBody(undefined)).toBeUndefined();
  });
});
