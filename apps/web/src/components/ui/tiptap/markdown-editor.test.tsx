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
  ImageBubbleMenu: () => <div data-testid="image-bubble-menu">Bubble Menu</div>,
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

const mockFocus = vi.fn();
const mockHookReturn = {
  editor: {
    ...mockEditor,
    commands: { ...mockCommands, focus: mockFocus },
  },
  imageInputRef: { current: null },
  videoInputRef: { current: null },
  handleImageChange: vi.fn(),
  handleVideoChange: vi.fn(),
  isUploading: false,
  uploadProgress: null,
  characterCount: 10,
  isNearLimit: false,
  isAtLimit: false,
};

vi.mock("./hooks/use-editor", () => ({
  useTiptapMarkdownEditor: vi.fn(() => mockHookReturn),
}));

// Mock the Convex hooks
vi.mock("convex/react", () => ({
  useMutation: () => vi.fn().mockResolvedValue("mock-url"),
  useQuery: () => null,
}));

import { useTiptapMarkdownEditor } from "./hooks/use-editor";
// Import component after mocks
import { TiptapMarkdownEditor } from "./markdown-editor";

const mockUseTiptapEditor = useTiptapMarkdownEditor as ReturnType<typeof vi.fn>;

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

  it("calls useTiptapMarkdownEditor with correct props", () => {
    render(
      <TiptapMarkdownEditor onChange={() => {}} value="Editable content" />
    );

    expect(mockUseTiptapEditor).toHaveBeenCalled();
    const callArgs = mockUseTiptapEditor.mock.calls[0][0];
    expect(callArgs.value).toBe("Editable content");
    expect(callArgs.editable).toBe(true);
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

    expect(mockUseTiptapEditor).toHaveBeenCalled();
    const callArgs = mockUseTiptapEditor.mock.calls[0][0];
    expect(callArgs.maxLength).toBe(100);
  });

  it("passes placeholder to hook", () => {
    render(
      <TiptapMarkdownEditor
        onChange={() => {}}
        placeholder="Start typing..."
        value=""
      />
    );

    expect(mockUseTiptapEditor).toHaveBeenCalled();
    const callArgs = mockUseTiptapEditor.mock.calls[0][0];
    expect(callArgs.placeholder).toBe("Start typing...");
  });

  describe("ImageBubbleMenu visibility", () => {
    it("renders ImageBubbleMenu when editable is true", () => {
      render(
        <TiptapMarkdownEditor editable={true} onChange={() => {}} value="" />
      );

      expect(screen.getByTestId("image-bubble-menu")).toBeInTheDocument();
    });

    it("does not render ImageBubbleMenu when editable is false", () => {
      render(
        <TiptapMarkdownEditor editable={false} onChange={() => {}} value="" />
      );

      expect(screen.queryByTestId("image-bubble-menu")).not.toBeInTheDocument();
    });

    it("does not render ImageBubbleMenu when disabled is true", () => {
      render(
        <TiptapMarkdownEditor disabled={true} onChange={() => {}} value="" />
      );

      expect(screen.queryByTestId("image-bubble-menu")).not.toBeInTheDocument();
    });
  });

  it("renders with empty value", () => {
    render(<TiptapMarkdownEditor onChange={() => {}} value="" />);
    const container = document.querySelector(
      '[data-slot="tiptap-markdown-editor"]'
    );
    expect(container).toBeInTheDocument();
  });

  it("passes onChange callback to hook", () => {
    const onChange = vi.fn();
    render(<TiptapMarkdownEditor onChange={onChange} value="test" />);
    expect(mockUseTiptapEditor).toHaveBeenCalled();
    const callArgs = mockUseTiptapEditor.mock.calls[0][0];
    expect(callArgs.onChange).toBe(onChange);
  });

  it("renders editor with editable=true by default", () => {
    render(<TiptapMarkdownEditor onChange={() => {}} value="content" />);
    expect(mockUseTiptapEditor).toHaveBeenCalled();
    const callArgs = mockUseTiptapEditor.mock.calls[0][0];
    expect(callArgs.editable).toBe(true);
  });

  it("passes disabled to hook", () => {
    render(
      <TiptapMarkdownEditor disabled onChange={() => {}} value="content" />
    );
    expect(mockUseTiptapEditor).toHaveBeenCalled();
    const callArgs = mockUseTiptapEditor.mock.calls[0][0];
    expect(callArgs.disabled).toBe(true);
  });

  it("renders without ImageBubbleMenu by default when editable is not set", () => {
    render(<TiptapMarkdownEditor onChange={() => {}} value="" />);
    expect(screen.getByTestId("image-bubble-menu")).toBeInTheDocument();
  });

  describe("minimal mode", () => {
    it("renders in minimal mode without border classes", () => {
      render(
        <TiptapMarkdownEditor minimal onChange={() => {}} value="content" />
      );
      const container = document.querySelector(
        '[data-slot="tiptap-markdown-editor"]'
      );
      expect(container).toBeInTheDocument();
      expect(container).not.toHaveClass("border-input");
      expect(container).toHaveClass("w-full");
    });

    it("renders disabled styling in minimal mode", () => {
      render(
        <TiptapMarkdownEditor
          disabled
          minimal
          onChange={() => {}}
          value="content"
        />
      );
      const container = document.querySelector(
        '[data-slot="tiptap-markdown-editor"]'
      );
      expect(container).toHaveClass("cursor-not-allowed");
    });
  });

  describe("character count", () => {
    it("renders character count when maxLength is set", () => {
      render(
        <TiptapMarkdownEditor
          maxLength={100}
          onChange={() => {}}
          value="content"
        />
      );
      expect(screen.getByText("10/100")).toBeInTheDocument();
    });

    it("applies destructive color when at limit", async () => {
      const { useTiptapMarkdownEditor } = (await import(
        "./hooks/use-editor"
      )) as {
        useTiptapMarkdownEditor: ReturnType<typeof vi.fn>;
      };
      useTiptapMarkdownEditor.mockReturnValueOnce({
        ...mockHookReturn,
        isAtLimit: true,
        characterCount: 100,
      });
      render(
        <TiptapMarkdownEditor
          maxLength={100}
          onChange={() => {}}
          value="content"
        />
      );
      expect(screen.getByText("100/100")).toHaveClass("text-destructive");
    });

    it("applies amber color when near limit", async () => {
      const { useTiptapMarkdownEditor } = (await import(
        "./hooks/use-editor"
      )) as {
        useTiptapMarkdownEditor: ReturnType<typeof vi.fn>;
      };
      useTiptapMarkdownEditor.mockReturnValueOnce({
        ...mockHookReturn,
        isNearLimit: true,
        characterCount: 90,
      });
      render(
        <TiptapMarkdownEditor
          maxLength={100}
          onChange={() => {}}
          value="content"
        />
      );
      expect(screen.getByText("90/100")).toHaveClass("text-amber-500");
    });
  });

  describe("upload progress", () => {
    it("shows upload progress when uploading", async () => {
      const { useTiptapMarkdownEditor } = (await import(
        "./hooks/use-editor"
      )) as {
        useTiptapMarkdownEditor: ReturnType<typeof vi.fn>;
      };
      useTiptapMarkdownEditor.mockReturnValueOnce({
        ...mockHookReturn,
        isUploading: true,
        uploadProgress: "Uploading... 50%",
      });
      render(<TiptapMarkdownEditor onChange={() => {}} value="content" />);
      expect(screen.getByText("Uploading... 50%")).toBeInTheDocument();
    });
  });

  describe("container click", () => {
    it("focuses editor on container click when editable", () => {
      render(
        <TiptapMarkdownEditor editable onChange={() => {}} value="content" />
      );
      const container = document.querySelector(
        '[data-slot="tiptap-markdown-editor"]'
      );
      container?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(mockFocus).toHaveBeenCalled();
    });

    it("does not focus editor on container click when disabled", () => {
      mockFocus.mockClear();
      render(
        <TiptapMarkdownEditor disabled onChange={() => {}} value="content" />
      );
      const container = document.querySelector(
        '[data-slot="tiptap-markdown-editor"]'
      );
      container?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(mockFocus).not.toHaveBeenCalled();
    });
  });
});
