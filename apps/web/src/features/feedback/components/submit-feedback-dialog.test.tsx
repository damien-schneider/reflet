import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SubmitFeedbackDialog } from "./submit-feedback-dialog";

// Mock Tiptap editors since they are complex and rely on browser APIs
vi.mock("@/components/ui/tiptap/title-editor", () => ({
  TiptapTitleEditor: ({
    value,
    onChange,
    onEnter,
  }: {
    value: string;
    onChange: (v: string) => void;
    onEnter?: () => void;
  }) => (
    <input
      data-testid="title-editor"
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter?.();
        }
      }}
      value={value}
    />
  ),
}));

vi.mock("@/components/ui/tiptap/markdown-editor", () => ({
  TiptapMarkdownEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <textarea
      data-testid="markdown-editor"
      onChange={(e) => onChange(e.target.value)}
      value={value}
    />
  ),
}));

describe("SubmitFeedbackDialog", () => {
  const defaultProps = {
    isOpen: true,
    onOpenChange: vi.fn(),
    onSubmit: vi.fn(),
    feedback: { title: "Test Title", description: "", email: "" },
    onFeedbackChange: vi.fn(),
    isSubmitting: false,
    isMember: false,
  };

  it("calls onSubmit when form is submitted via button", () => {
    render(<SubmitFeedbackDialog {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: "Submit" });
    fireEvent.click(submitButton);

    expect(defaultProps.onSubmit).toHaveBeenCalled();
  });

  it("calls onSubmit when Enter is pressed in title editor", () => {
    render(<SubmitFeedbackDialog {...defaultProps} />);

    const titleEditors = screen.getAllByTestId("title-editor");
    // Use the last one as it's likely the one in the active portal
    const titleEditor = titleEditors.at(-1);

    if (!titleEditor) {
      throw new Error("Title editor not found");
    }

    fireEvent.keyDown(titleEditor, { key: "Enter" });

    expect(defaultProps.onSubmit).toHaveBeenCalled();
  });
});
