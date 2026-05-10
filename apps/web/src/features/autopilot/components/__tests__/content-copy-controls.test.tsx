import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { IconBrandReddit } from "@tabler/icons-react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConversationContent } from "@/features/autopilot/components/content-sheet-conversation";
import { DocumentContent } from "@/features/autopilot/components/document-content";
import { toId, toOrgId } from "@/lib/convex-helpers";

const { mockToastError, mockToastSuccess } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

vi.mock("@/components/ui/tiptap/markdown-editor", () => ({
  TiptapMarkdownEditor: ({
    editable,
    onChange,
    value,
  }: {
    editable: boolean;
    onChange?: (value: string) => void;
    value: string;
  }) => (
    <textarea
      aria-label="Draft content"
      disabled={!editable}
      onChange={(event) => onChange?.(event.target.value)}
      value={value}
    />
  ),
}));

function createSocialDocument(): Doc<"autopilotDocuments"> {
  const now = Date.now();
  return {
    _creationTime: now,
    _id: toId("autopilotDocuments", "doc_social"),
    organizationId: toOrgId("org_123"),
    type: "reddit_reply",
    title: "Reddit reply",
    content: "Draft reply",
    targetUrl: "https://reddit.com/r/example/comments/123",
    tags: [],
    status: "pending_review",
    needsReview: true,
    createdAt: now,
    updatedAt: now,
  };
}

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: vi.fn(() => Promise.resolve()),
    },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Autopilot content copy controls", () => {
  it("labels the social draft copy button", () => {
    render(
      <DocumentContent
        document={createSocialDocument()}
        editedContent={null}
        isEditable={false}
      />
    );

    expect(
      screen.getByRole("button", { name: "Copy draft reply" })
    ).toBeInTheDocument();
  });

  it("labels the conversation draft copy button", () => {
    render(
      <ConversationContent
        content="Draft reply"
        isEditable={false}
        platformIcon={IconBrandReddit}
        targetUrl="https://reddit.com/r/example/comments/123"
        type="reddit_reply"
      />
    );

    expect(
      screen.getByRole("button", { name: "Copy draft reply" })
    ).toBeInTheDocument();
  });

  it("shows a controlled error when the conversation draft cannot be copied", async () => {
    const writeText = vi.fn(() =>
      Promise.reject(new Error("Clipboard denied"))
    );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <ConversationContent
        content="Draft reply"
        isEditable={false}
        platformIcon={IconBrandReddit}
        type="reddit_reply"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy draft reply" }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Could not copy to clipboard"
      );
    });
  });
});
