import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Top-level regex patterns for performance
const VERSION_PLACEHOLDER_REGEX = /v1\.0\.0/i;
const CREATE_BUTTON_REGEX = /create/i;
const SAVE_BUTTON_REGEX = /save/i;
const DIALOG_TITLE_REGEX = /create release|edit release/i;
const CANCEL_BUTTON_REGEX = /cancel/i;

// Mock tiptap components
vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => ({
    commands: { setContent: vi.fn(), focus: vi.fn() },
    storage: { markdown: { getMarkdown: () => "" } },
    getText: () => "",
    setEditable: vi.fn(),
  })),
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div data-testid="editor-content">{editor ? "Editor" : "No editor"}</div>
  ),
}));

vi.mock("@tiptap/starter-kit", () => ({
  default: { configure: () => ({}) },
}));

vi.mock("@tiptap/extension-placeholder", () => ({
  default: { configure: () => ({}) },
}));

vi.mock("@tiptap/extension-link", () => ({
  default: { configure: () => ({}) },
}));

vi.mock("@tiptap/extension-image", () => ({
  default: { configure: () => ({}) },
}));

vi.mock("@tiptap/extension-character-count", () => ({
  default: { configure: () => ({}) },
}));

vi.mock("@tiptap/extension-typography", () => ({
  default: {},
}));

vi.mock("tiptap-markdown", () => ({
  Markdown: { configure: () => ({}) },
}));

vi.mock("@/components/ui/tiptap/slash-command", () => ({
  createSlashCommandExtension: () => ({}),
}));

vi.mock("@/components/ui/tiptap/use-media-upload", () => ({
  useMediaUpload: () => ({
    uploadMedia: vi.fn(),
    isUploading: false,
    uploadProgress: null,
  }),
}));

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  useQuery: () => null,
}));

import { ReleaseFormDialog } from "./release-form-dialog";

describe("ReleaseFormDialog", () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    isSubmitting: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders with Notion-like layout", () => {
    render(<ReleaseFormDialog {...defaultProps} />);

    // Should have title editor
    const titleEditor = document.querySelector(
      '[data-slot="tiptap-title-editor"]'
    );
    expect(titleEditor).toBeInTheDocument();
  });

  it("renders with rich text content editor", () => {
    render(<ReleaseFormDialog {...defaultProps} />);

    // Should have markdown editor for content
    const contentEditor = document.querySelector(
      '[data-slot="tiptap-markdown-editor"]'
    );
    expect(contentEditor).toBeInTheDocument();
  });

  it("renders version input field", () => {
    render(<ReleaseFormDialog {...defaultProps} />);

    // Version field should remain as regular input for structured data
    const versionInput = screen.getByPlaceholderText(VERSION_PLACEHOLDER_REGEX);
    expect(versionInput).toBeInTheDocument();
  });

  it("shows create button for new release", () => {
    render(<ReleaseFormDialog {...defaultProps} />);

    const createButton = screen.getByRole("button", {
      name: CREATE_BUTTON_REGEX,
    });
    expect(createButton).toBeInTheDocument();
  });

  it("shows save button when editing existing release", () => {
    render(
      <ReleaseFormDialog
        {...defaultProps}
        release={{
          version: "v1.0.0",
          title: "Test Release",
          content: "Test content",
        }}
      />
    );

    const saveButton = screen.getByRole("button", { name: SAVE_BUTTON_REGEX });
    expect(saveButton).toBeInTheDocument();
  });

  it("has accessible dialog title", () => {
    render(<ReleaseFormDialog {...defaultProps} />);

    // Dialog should have an accessible title (either visible or sr-only)
    expect(screen.getByText(DIALOG_TITLE_REGEX)).toBeInTheDocument();
  });

  it("renders cancel button", () => {
    render(<ReleaseFormDialog {...defaultProps} />);

    const cancelButton = screen.getByRole("button", {
      name: CANCEL_BUTTON_REGEX,
    });
    expect(cancelButton).toBeInTheDocument();
  });
});
