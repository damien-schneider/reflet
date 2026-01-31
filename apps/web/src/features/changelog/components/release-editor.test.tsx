import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Top-level regex patterns for performance
const VERSION_PLACEHOLDER_REGEX = /v1\.0\.0/i;
const PUBLISH_BUTTON_REGEX = /publish/i;
const CANCEL_BUTTON_REGEX = /cancel/i;

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock tiptap components
vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => ({
    commands: { setContent: vi.fn(), focus: vi.fn() },
    storage: { markdown: { getMarkdown: () => "" } },
    getText: () => "",
    setEditable: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    isActive: vi.fn(() => false),
    chain: vi.fn(() => ({ focus: vi.fn(() => ({ run: vi.fn() })) })),
    view: { state: { selection: { from: 0, to: 0 } } },
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
  default: {
    configure: () => ({}),
    extend: () => ({ configure: () => ({}) }),
  },
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

vi.mock("@/components/ui/tiptap/image-extension", () => ({
  ImageExtension: {
    configure: () => ({
      extend: () => ({}),
    }),
  },
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

import { ReleaseEditor } from "./release-editor";

describe("ReleaseEditor", () => {
  const defaultProps = {
    organizationId: "org123" as never,
    orgSlug: "test-org",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders with Notion-like title editor", () => {
    render(<ReleaseEditor {...defaultProps} />);

    const titleEditor = document.querySelector(
      '[data-slot="tiptap-title-editor"]'
    );
    expect(titleEditor).toBeInTheDocument();
  });

  it("renders with rich text description editor", () => {
    render(<ReleaseEditor {...defaultProps} />);

    const descriptionEditor = document.querySelector(
      '[data-slot="tiptap-markdown-editor"]'
    );
    expect(descriptionEditor).toBeInTheDocument();
  });

  it("renders version input field", () => {
    render(<ReleaseEditor {...defaultProps} />);

    const versionInput = screen.getByPlaceholderText(VERSION_PLACEHOLDER_REGEX);
    expect(versionInput).toBeInTheDocument();
  });

  it("shows publish button for new release", () => {
    render(<ReleaseEditor {...defaultProps} />);

    const publishButton = screen.getByRole("button", {
      name: PUBLISH_BUTTON_REGEX,
    });
    expect(publishButton).toBeInTheDocument();
  });

  it("shows publish button when editing existing release", () => {
    render(
      <ReleaseEditor
        {...defaultProps}
        release={
          {
            _id: "release123",
            title: "Test Release",
            version: "v1.0.0",
            description: "Test description",
          } as never
        }
      />
    );

    const publishButton = screen.getByRole("button", {
      name: PUBLISH_BUTTON_REGEX,
    });
    expect(publishButton).toBeInTheDocument();
  });

  it("renders cancel button", () => {
    render(<ReleaseEditor {...defaultProps} />);

    const cancelButton = screen.getByRole("button", {
      name: CANCEL_BUTTON_REGEX,
    });
    expect(cancelButton).toBeInTheDocument();
  });
});
