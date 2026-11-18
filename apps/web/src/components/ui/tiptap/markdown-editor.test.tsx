import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCommands = {
  setContent: vi.fn(),
};

const mockEditor = {
  commands: mockCommands,
  destroy: vi.fn(),
  getHTML: () => "<p>mock html</p>",
  isEditable: true,
  off: vi.fn(),
  on: vi.fn(),
  setEditable: vi.fn(),
  storage: {
    characterCount: {
      characters: () => 10,
    },
    markdown: {
      getMarkdown: () => "mock markdown",
    },
  },
};

vi.mock("@tiptap/react", () => ({
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
  useEditor: vi.fn(() => mockEditor),
}));

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

vi.mock("./command-suggestion", () => ({
  createSlashCommandExtension: () => ({}),
  SlashCommand: {},
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
    isUploading: false,
    uploadMedia: vi.fn().mockResolvedValue({
      type: "image",
      url: "https://example.com/media.jpg",
    }),
    uploadProgress: null,
  }),
}));

const mockFocus = vi.fn();
const mockHookReturn = {
  characterCount: 10,
  editor: {
    ...mockEditor,
    commands: { ...mockCommands, focus: mockFocus },
  },
  handleImageChange: vi.fn(),
  handleVideoChange: vi.fn(),
  imageInputRef: { current: null },
  isAtLimit: false,
  isNearLimit: false,
  isUploading: false,
  uploadProgress: null,
  videoInputRef: { current: null },
};

vi.mock("./hooks/use-editor", () => ({
  useTiptapMarkdownEditor: vi.fn(() => mockHookReturn),
}));

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn().mockResolvedValue("mock-url"),
  useQuery: () => null,
}));

import { TiptapMarkdownEditor } from "./markdown-editor";

describe("TiptapMarkdownEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
        uploadProgress: "Uploading image…",
      });
      render(<TiptapMarkdownEditor onChange={() => {}} value="content" />);
      expect(screen.getByText("Uploading image…")).toBeInTheDocument();
    });
  });
});
