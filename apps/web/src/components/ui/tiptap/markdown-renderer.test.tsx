import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

const mockSetContent = vi.fn();

const mockEditor = {
  commands: { setContent: mockSetContent },
  storage: {
    markdown: { getMarkdown: vi.fn(() => "") },
  },
  on: vi.fn(),
  off: vi.fn(),
  destroy: vi.fn(),
};

let useEditorConfig: Record<string, unknown> | null = null;

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn((config: Record<string, unknown>) => {
    useEditorConfig = config;
    return mockEditor;
  }),
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div data-testid="editor-content">{editor ? "Editor" : "No editor"}</div>
  ),
}));

vi.mock("@tiptap/starter-kit", () => ({
  default: { configure: vi.fn(() => ({})) },
}));

vi.mock("@tiptap/extension-link", () => ({
  default: { configure: vi.fn(() => ({})) },
}));

vi.mock("tiptap-markdown", () => ({
  Markdown: { configure: vi.fn(() => ({})) },
}));

let capturedExtendConfig: Record<string, unknown> | null = null;
vi.mock("./image-extension", () => ({
  ImageExtension: {
    configure: vi.fn(() => ({
      extend: vi.fn((config: Record<string, unknown>) => {
        capturedExtendConfig = config;
        return {};
      }),
    })),
  },
}));

vi.mock("./styles.css", () => ({}));

import { useEditor } from "@tiptap/react";

describe("MarkdownRenderer", () => {
  let MarkdownRenderer: typeof import("./markdown-renderer").MarkdownRenderer;

  beforeEach(async () => {
    vi.clearAllMocks();
    useEditorConfig = null;
    capturedExtendConfig = null;
    const mod = await import("./markdown-renderer");
    MarkdownRenderer = mod.MarkdownRenderer;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders empty state when content is empty", () => {
    render(<MarkdownRenderer content="" />);
    expect(screen.getByText("No description provided.")).toBeInTheDocument();
  });

  it("renders empty state with custom className", () => {
    render(<MarkdownRenderer className="my-class" content="" />);
    const text = screen.getByText("No description provided.");
    expect(text).toHaveClass("my-class");
  });

  it("renders editor content when content is provided", () => {
    render(<MarkdownRenderer content="# Hello" />);
    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  it("renders with tiptap-renderer-container class", () => {
    render(<MarkdownRenderer content="Some markdown" />);
    const container = document.querySelector(".tiptap-renderer-container");
    expect(container).toBeInTheDocument();
  });

  it("applies custom className to container", () => {
    render(<MarkdownRenderer className="custom-md" content="Some markdown" />);
    const container = document.querySelector(".tiptap-renderer-container");
    expect(container).toHaveClass("custom-md");
  });

  it("syncs external content changes", () => {
    mockEditor.storage.markdown.getMarkdown.mockReturnValue("old");
    const { rerender } = render(<MarkdownRenderer content="old" />);

    mockEditor.storage.markdown.getMarkdown.mockReturnValue("old");
    rerender(<MarkdownRenderer content="new" />);
    expect(mockSetContent).toHaveBeenCalledWith("new");
  });

  it("does not call setContent when content matches", () => {
    mockEditor.storage.markdown.getMarkdown.mockReturnValue("same");
    const { rerender } = render(<MarkdownRenderer content="same" />);

    mockSetContent.mockClear();
    mockEditor.storage.markdown.getMarkdown.mockReturnValue("same");
    rerender(<MarkdownRenderer content="same" />);
    expect(mockSetContent).not.toHaveBeenCalled();
  });

  it("configures editor as non-editable", () => {
    render(<MarkdownRenderer content="test" />);
    expect(useEditorConfig).toMatchObject({ editable: false });
  });

  it("configures editor with immediatelyRender false", () => {
    render(<MarkdownRenderer content="test" />);
    expect(useEditorConfig).toMatchObject({ immediatelyRender: false });
  });

  it("passes content as initial editor content", () => {
    render(<MarkdownRenderer content="# Title" />);
    expect(useEditorConfig).toMatchObject({ content: "# Title" });
  });

  it("configures editor with extensions array", () => {
    render(<MarkdownRenderer content="test" />);
    expect(useEditorConfig).toHaveProperty("extensions");
    expect(Array.isArray(useEditorConfig?.extensions)).toBe(true);
  });

  it("configures editor with tiptap-renderer class", () => {
    render(<MarkdownRenderer content="test" />);
    expect(useEditorConfig?.editorProps).toMatchObject({
      attributes: { class: "tiptap-renderer" },
    });
  });

  it("does not call setContent on first render when content matches", () => {
    mockEditor.storage.markdown.getMarkdown.mockReturnValue("hello");
    render(<MarkdownRenderer content="hello" />);
    expect(mockSetContent).not.toHaveBeenCalled();
  });

  it("skips setContent when editor is null", () => {
    vi.mocked(useEditor).mockReturnValueOnce(null);
    render(<MarkdownRenderer content="test" />);
    expect(mockSetContent).not.toHaveBeenCalled();
  });

  describe("getMarkdown edge cases", () => {
    it("handles storage without markdown property", () => {
      const editorNoMarkdown = {
        ...mockEditor,
        storage: {},
      };
      vi.mocked(useEditor).mockReturnValue(editorNoMarkdown as never);
      const { rerender } = render(<MarkdownRenderer content="initial" />);
      rerender(<MarkdownRenderer content="updated" />);
      expect(mockSetContent).toHaveBeenCalledWith("updated");
    });

    it("handles storage with undefined getMarkdown", () => {
      const editorNoGetMarkdown = {
        ...mockEditor,
        storage: { markdown: {} },
      };
      vi.mocked(useEditor).mockReturnValue(editorNoGetMarkdown as never);
      const { rerender } = render(<MarkdownRenderer content="initial" />);
      rerender(<MarkdownRenderer content="new content" />);
      expect(mockSetContent).toHaveBeenCalledWith("new content");
    });

    it("handles null storage gracefully", () => {
      const editorNullStorage = {
        ...mockEditor,
        storage: null,
      };
      vi.mocked(useEditor).mockReturnValue(editorNullStorage as never);
      const { rerender } = render(<MarkdownRenderer content="initial" />);
      rerender(<MarkdownRenderer content="different" />);
      expect(mockSetContent).toHaveBeenCalledWith("different");
    });
  });

  describe("Image extension node view", () => {
    it("creates image node view with proper DOM structure", () => {
      render(<MarkdownRenderer content="test" />);
      const addNodeView = capturedExtendConfig?.addNodeView as () => (args: {
        node: Record<string, unknown>;
      }) => { dom: HTMLElement };
      expect(addNodeView).toBeDefined();

      const factory = addNodeView();
      const result = factory({
        node: {
          attrs: {
            src: "https://example.com/image.jpg",
            alt: "Test alt",
            title: "Test title",
            align: "center",
            width: 300,
          },
        },
      });

      expect(result.dom).toBeInstanceOf(HTMLDivElement);
      expect(result.dom.classList.contains("tiptap-image-wrapper")).toBe(true);
      expect(result.dom.getAttribute("data-align")).toBe("center");

      const img = result.dom.querySelector("img");
      expect(img).not.toBeNull();
      expect(img?.src).toBe("https://example.com/image.jpg");
      expect(img?.alt).toBe("Test alt");
      expect(img?.title).toBe("Test title");
      expect(img?.style.width).toBe("300px");
    });

    it("creates image node view without width", () => {
      render(<MarkdownRenderer content="test" />);
      const addNodeView = capturedExtendConfig?.addNodeView as () => (args: {
        node: Record<string, unknown>;
      }) => { dom: HTMLElement };
      const factory = addNodeView();
      const result = factory({
        node: {
          attrs: { src: "https://example.com/img.jpg", alt: "", align: "left" },
        },
      });

      const img = result.dom.querySelector("img");
      expect(img?.style.width).toBe("");
    });

    it("shows error placeholder on image load error", () => {
      render(<MarkdownRenderer content="test" />);
      const addNodeView = capturedExtendConfig?.addNodeView as () => (args: {
        node: Record<string, unknown>;
      }) => { dom: HTMLElement };
      const factory = addNodeView();
      const result = factory({
        node: {
          attrs: {
            src: "https://example.com/broken.jpg",
            alt: "",
            align: "center",
          },
        },
      });

      const img = result.dom.querySelector("img") as HTMLImageElement;
      img.dispatchEvent(new Event("error"));

      expect(img.style.display).toBe("none");
      const errorPlaceholder = result.dom.querySelector(
        ".tiptap-image-error"
      ) as HTMLElement;
      expect(errorPlaceholder.style.display).toBe("flex");
      expect(result.dom.getAttribute("data-error")).toBe("true");
      expect(
        result.dom.querySelector(".tiptap-image-error-icon")
      ).not.toBeNull();
      expect(errorPlaceholder.textContent).toContain("Image unavailable");
    });

    it("updates image src and resets error state on node update", () => {
      render(<MarkdownRenderer content="test" />);
      const addNodeView = capturedExtendConfig?.addNodeView as () => (args: {
        node: Record<string, unknown>;
      }) => {
        dom: HTMLElement;
        update: (node: Record<string, unknown>) => boolean;
      };
      const factory = addNodeView();
      const result = factory({
        node: {
          attrs: {
            src: "https://example.com/old.jpg",
            alt: "old",
            align: "center",
          },
        },
      });

      // Trigger error first
      const img = result.dom.querySelector("img") as HTMLImageElement;
      img.dispatchEvent(new Event("error"));
      expect(img.style.display).toBe("none");

      // Update with new src - should reset error state
      const updated = result.update({
        type: { name: "image" },
        attrs: {
          src: "https://example.com/new.jpg",
          alt: "updated",
          align: "left",
          width: 500,
        },
      });

      expect(updated).toBe(true);
      expect(img.style.display).toBe("block");
      expect(img.src).toBe("https://example.com/new.jpg");
      expect(img.alt).toBe("updated");
      expect(img.getAttribute("data-align")).toBe("left");
      expect(result.dom.getAttribute("data-align")).toBe("left");
      expect(img.style.width).toBe("500px");
    });

    it("keeps error state when updating with same src", () => {
      render(<MarkdownRenderer content="test" />);
      const addNodeView = capturedExtendConfig?.addNodeView as () => (args: {
        node: Record<string, unknown>;
      }) => {
        dom: HTMLElement;
        update: (node: Record<string, unknown>) => boolean;
      };
      const factory = addNodeView();
      const result = factory({
        node: {
          attrs: {
            src: "https://example.com/img.jpg",
            alt: "",
            align: "center",
          },
        },
      });

      const img = result.dom.querySelector("img") as HTMLImageElement;
      img.dispatchEvent(new Event("error"));

      // Update with same src
      result.update({
        type: { name: "image" },
        attrs: {
          src: "https://example.com/img.jpg",
          alt: "updated",
          align: "right",
        },
      });

      // img.style.display should NOT be reset since src didn't change
      expect(img.style.display).toBe("none");
    });

    it("returns false for non-image node type updates", () => {
      render(<MarkdownRenderer content="test" />);
      const addNodeView = capturedExtendConfig?.addNodeView as () => (args: {
        node: Record<string, unknown>;
      }) => {
        dom: HTMLElement;
        update: (node: Record<string, unknown>) => boolean;
      };
      const factory = addNodeView();
      const result = factory({
        node: {
          attrs: {
            src: "https://example.com/img.jpg",
            alt: "",
            align: "center",
          },
        },
      });

      const updated = result.update({
        type: { name: "paragraph" },
        attrs: {},
      });
      expect(updated).toBe(false);
    });

    it("uses default align value when not specified", () => {
      render(<MarkdownRenderer content="test" />);
      const addNodeView = capturedExtendConfig?.addNodeView as () => (args: {
        node: Record<string, unknown>;
      }) => { dom: HTMLElement };
      const factory = addNodeView();
      const result = factory({
        node: {
          attrs: { src: "https://example.com/img.jpg", alt: "", title: "" },
        },
      });

      expect(result.dom.getAttribute("data-align")).toBe("center");
      const img = result.dom.querySelector("img");
      expect(img?.getAttribute("data-align")).toBe("center");
    });
  });

  describe("Extension configurations", () => {
    it("configures StarterKit with heading levels 1, 2, 3", async () => {
      render(<MarkdownRenderer content="test" />);
      const { default: StarterKit } = await import("@tiptap/starter-kit");
      expect(StarterKit.configure).toHaveBeenCalledWith({
        heading: { levels: [1, 2, 3] },
      });
    });

    it("configures Link with openOnClick and security attributes", async () => {
      render(<MarkdownRenderer content="test" />);
      const { default: Link } = await import("@tiptap/extension-link");
      expect(Link.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          openOnClick: true,
          HTMLAttributes: expect.objectContaining({
            target: "_blank",
            rel: "noopener noreferrer",
          }),
        })
      );
    });

    it("configures Markdown with html disabled", async () => {
      render(<MarkdownRenderer content="test" />);
      const { Markdown } = await import("tiptap-markdown");
      expect(Markdown.configure).toHaveBeenCalledWith({ html: false });
    });

    it("configures ImageExtension with tiptap-image class", async () => {
      render(<MarkdownRenderer content="test" />);
      const { ImageExtension } = await import("./image-extension");
      expect(ImageExtension.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          HTMLAttributes: { class: "tiptap-image" },
        })
      );
    });
  });
});
