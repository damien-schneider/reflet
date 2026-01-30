import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Tiptap components and hooks before importing the component
const mockCommands = {
  setContent: vi.fn(),
};

const mockEditor = {
  commands: mockCommands,
  storage: {
    markdown: {
      getMarkdown: () => "mock markdown",
    },
    characterCount: {
      characters: () => 10,
    },
  },
  getHTML: () => "<p>mock html</p>",
  on: vi.fn(),
  off: vi.fn(),
  destroy: vi.fn(),
  setEditable: vi.fn(),
  isEditable: true,
};

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => mockEditor),
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div
      className="ProseMirror"
      contentEditable="true"
      data-testid="editor-content"
      suppressContentEditableWarning
    >
      {editor ? "Editor content" : "No editor"}
    </div>
  ),
}));

// Mock Tiptap extensions
vi.mock("@tiptap/starter-kit", () => ({
  default: {
    configure: () => ({}),
  },
}));

vi.mock("@tiptap/extension-placeholder", () => ({
  default: {
    configure: () => ({}),
  },
}));

vi.mock("@tiptap/extension-link", () => ({
  default: {
    configure: () => ({}),
  },
}));

vi.mock("@tiptap/extension-image", () => ({
  default: {
    configure: () => ({}),
    extend: () => ({
      configure: () => ({}),
    }),
  },
}));

vi.mock("@tiptap/extension-character-count", () => ({
  default: {
    configure: () => ({}),
  },
}));

vi.mock("tiptap-markdown", () => ({
  Markdown: {
    configure: () => ({}),
  },
}));

// Mock the custom extensions
vi.mock("./slash-command", () => ({
  SlashCommand: {},
  createSlashCommandExtension: () => ({}),
}));

vi.mock("./image-bubble-menu", () => ({
  ImageBubbleMenu: () => null,
}));

vi.mock("./image-extension", () => ({
  ImageExtension: {
    configure: () => ({
      extend: () => ({}),
    }),
  },
}));

vi.mock("./use-media-upload", () => ({
  useMediaUpload: () => ({
    uploadMedia: vi.fn().mockResolvedValue({
      url: "https://example.com/media.jpg",
      type: "image",
    }),
    isUploading: false,
    uploadProgress: null,
  }),
}));

// Mock the Convex hooks
vi.mock("convex/react", () => ({
  useMutation: () => vi.fn().mockResolvedValue("mock-url"),
  useQuery: () => null,
}));

import { useEditor } from "@tiptap/react";
// Import component after mocks
import { TiptapMarkdownEditor } from "./markdown-editor";

const mockUseEditor = useEditor as ReturnType<typeof vi.fn>;

describe("TiptapMarkdownEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders with the correct container class", () => {
    render(
      <TiptapMarkdownEditor onChange={() => {}} value="Hello **world**" />
    );

    // Check for the container class
    const container = document.querySelector(
      '[data-slot="tiptap-markdown-editor"]'
    );
    expect(container).toBeInTheDocument();
  });

  it("renders the editor content area", () => {
    render(
      <TiptapMarkdownEditor
        onChange={() => {}}
        placeholder="Start typing..."
        value=""
      />
    );

    // Check for the editor using getAllByTestId since EditorContent renders
    const editors = screen.getAllByTestId("editor-content");
    expect(editors.length).toBeGreaterThan(0);
    expect(editors[0]).toBeInTheDocument();
  });

  it("calls useEditor with correct configuration", () => {
    render(
      <TiptapMarkdownEditor onChange={() => {}} value="Editable content" />
    );

    // Verify useEditor was called
    expect(mockUseEditor).toHaveBeenCalled();
    const callArgs = mockUseEditor.mock.calls[0][0];

    // Verify immediatelyRender is false (for SSR compatibility)
    expect(callArgs.immediatelyRender).toBe(false);
  });

  it("applies custom className to container", () => {
    render(
      <TiptapMarkdownEditor
        className="custom-class my-custom-bg"
        onChange={() => {}}
        value="Content"
      />
    );

    const container = document.querySelector(
      '[data-slot="tiptap-markdown-editor"]'
    );
    // The className is merged with base classes via cn()
    expect(container).toHaveClass("custom-class");
    expect(container).toHaveClass("my-custom-bg");
  });

  it("has container with data-slot for CSS targeting", () => {
    render(
      <TiptapMarkdownEditor onChange={() => {}} value="Select this text" />
    );

    // Verify the editor container exists with the data-slot attribute
    // Selection styling in styles.css targets .tiptap-markdown-editor ::selection
    // The ProseMirror element inside gets this class via editorProps.attributes
    const container = document.querySelector(
      '[data-slot="tiptap-markdown-editor"]'
    );
    expect(container).toBeInTheDocument();

    // The ProseMirror element would have the class, but since we mock EditorContent,
    // we verify the container structure is correct
    expect(container).toHaveClass("border-input");
    expect(container).toHaveClass("rounded-lg");
  });

  it("renders with maxLength prop", () => {
    render(
      <TiptapMarkdownEditor
        maxLength={100}
        onChange={() => {}}
        value="Content"
      />
    );

    // The component should render with maxLength configured
    const container = document.querySelector(
      '[data-slot="tiptap-markdown-editor"]'
    );
    expect(container).toBeInTheDocument();

    // useEditor should be called with CharacterCount extension
    expect(mockUseEditor).toHaveBeenCalled();
  });

  it("passes placeholder to useEditor configuration", () => {
    const placeholder = "Start typing...";
    render(
      <TiptapMarkdownEditor
        onChange={() => {}}
        placeholder={placeholder}
        value=""
      />
    );

    expect(mockUseEditor).toHaveBeenCalled();
    // The placeholder is passed through extension configuration
    const callArgs = mockUseEditor.mock.calls[0][0];
    expect(callArgs.extensions).toBeDefined();
  });
});
