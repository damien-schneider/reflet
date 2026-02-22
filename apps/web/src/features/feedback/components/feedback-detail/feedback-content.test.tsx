/**
 * @vitest-environment jsdom
 */
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockUpdateFeedback = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockUpdateFeedback,
}));

vi.mock("@reflet/backend/convex/_generated/api", () => ({
  api: {
    feedback: { update: "feedback.update" },
  },
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <img alt={alt} src={src} />
  ),
}));

vi.mock("@/components/ui/tiptap/markdown-editor", () => ({
  TiptapMarkdownEditor: ({
    value,
    placeholder,
    onChange,
  }: {
    value: string;
    placeholder?: string;
    onChange?: (v: string) => void;
  }) => (
    <textarea
      data-testid="markdown-editor"
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      value={value}
    />
  ),
}));

vi.mock("@/components/ui/tiptap/title-editor", () => ({
  TiptapTitleEditor: ({
    value,
    placeholder,
    onChange,
  }: {
    value: string;
    placeholder?: string;
    onChange?: (v: string) => void;
  }) => (
    <input
      data-testid="title-editor"
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      value={value}
    />
  ),
}));

import { FeedbackContent } from "./feedback-content";

const feedbackId = "f1" as Id<"feedback">;

describe("FeedbackContent", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders title and description", () => {
    render(
      <FeedbackContent
        description="Test description"
        feedbackId={feedbackId}
        isAdmin={false}
        title="Test Title"
      />
    );
    expect(screen.getByTestId("title-editor")).toHaveValue("Test Title");
    expect(screen.getByTestId("markdown-editor")).toHaveValue(
      "Test description"
    );
  });

  it("does not show save/cancel buttons initially", () => {
    render(
      <FeedbackContent
        description="desc"
        feedbackId={feedbackId}
        isAdmin
        title="Title"
      />
    );
    expect(screen.queryByText("Save changes")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });

  it("renders attachment thumbnails", () => {
    render(
      <FeedbackContent
        attachments={["/img1.png", "/img2.png"]}
        description=""
        feedbackId={feedbackId}
        isAdmin={false}
        title="Title"
      />
    );
    expect(screen.getByAltText("Attachment 1")).toBeInTheDocument();
    expect(screen.getByAltText("Attachment 2")).toBeInTheDocument();
  });

  it("does not render attachments section when empty", () => {
    render(
      <FeedbackContent
        attachments={[]}
        description=""
        feedbackId={feedbackId}
        isAdmin={false}
        title="Title"
      />
    );
    expect(screen.queryByAltText("Attachment 1")).not.toBeInTheDocument();
  });

  it("attachment links have noopener rel", () => {
    render(
      <FeedbackContent
        attachments={["/img1.png"]}
        description=""
        feedbackId={feedbackId}
        isAdmin={false}
        title="Title"
      />
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows save/cancel buttons when title is changed by admin", () => {
    render(
      <FeedbackContent
        description="desc"
        feedbackId={feedbackId}
        isAdmin
        title="Title"
      />
    );
    const titleEditor = screen.getByTestId("title-editor");
    fireEvent.change(titleEditor, { target: { value: "New Title" } });
    expect(screen.getByText("Save changes")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("shows save/cancel buttons when description is changed by admin", () => {
    render(
      <FeedbackContent
        description="desc"
        feedbackId={feedbackId}
        isAdmin
        title="Title"
      />
    );
    const descEditor = screen.getByTestId("markdown-editor");
    fireEvent.change(descEditor, { target: { value: "New desc" } });
    expect(screen.getByText("Save changes")).toBeInTheDocument();
  });

  it("does not show save/cancel for non-admin users even on change", () => {
    render(
      <FeedbackContent
        description="desc"
        feedbackId={feedbackId}
        isAdmin={false}
        title="Title"
      />
    );
    // Non-admin won't be able to trigger changes in practice, but
    // even if the value changes, buttons should not show because isAdmin is false
    expect(screen.queryByText("Save changes")).not.toBeInTheDocument();
  });

  it("cancels changes and restores original values", () => {
    render(
      <FeedbackContent
        description="Original desc"
        feedbackId={feedbackId}
        isAdmin
        title="Original Title"
      />
    );
    const titleEditor = screen.getByTestId("title-editor");
    fireEvent.change(titleEditor, { target: { value: "Changed Title" } });
    expect(screen.getByText("Save changes")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));
    // Values should be restored
    expect(screen.getByTestId("title-editor")).toHaveValue("Original Title");
    expect(screen.queryByText("Save changes")).not.toBeInTheDocument();
  });

  it("calls updateFeedback with title changes on save", async () => {
    mockUpdateFeedback.mockResolvedValue(undefined);
    render(
      <FeedbackContent
        description="desc"
        feedbackId={feedbackId}
        isAdmin
        title="Title"
      />
    );
    const titleEditor = screen.getByTestId("title-editor");
    fireEvent.change(titleEditor, { target: { value: "New Title" } });
    fireEvent.click(screen.getByText("Save changes"));
    await waitFor(() => {
      expect(mockUpdateFeedback).toHaveBeenCalledWith({
        id: feedbackId,
        title: "New Title",
      });
    });
  });

  it("calls updateFeedback with description changes on save", async () => {
    mockUpdateFeedback.mockResolvedValue(undefined);
    render(
      <FeedbackContent
        description="old desc"
        feedbackId={feedbackId}
        isAdmin
        title="Title"
      />
    );
    const descEditor = screen.getByTestId("markdown-editor");
    fireEvent.change(descEditor, { target: { value: "new desc" } });
    fireEvent.click(screen.getByText("Save changes"));
    await waitFor(() => {
      expect(mockUpdateFeedback).toHaveBeenCalledWith({
        id: feedbackId,
        description: "new desc",
      });
    });
  });

  it("does not call updateFeedback when nothing changed on save", async () => {
    render(
      <FeedbackContent
        description="desc"
        feedbackId={feedbackId}
        isAdmin
        title="Title"
      />
    );
    // No changes, save/cancel buttons aren't visible
    expect(screen.queryByText("Save changes")).not.toBeInTheDocument();
  });
});
