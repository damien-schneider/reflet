import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSetContent = vi.fn();
const mockSetEditable = vi.fn();
const mockChainFocusSetImage = vi.fn(() => ({ run: vi.fn() }));
const mockChainFocusInsertContent = vi.fn(() => ({ run: vi.fn() }));

const mockEditor = {
  chain: vi.fn(() => ({
    focus: vi.fn(() => ({
      insertContent: mockChainFocusInsertContent,
      setImage: mockChainFocusSetImage,
    })),
  })),
  commands: { setContent: mockSetContent },
  destroy: vi.fn(),
  off: vi.fn(),
  on: vi.fn(),
  setEditable: mockSetEditable,
  storage: {
    characterCount: {
      characters: vi.fn(() => 42),
    },
    markdown: {
      getMarkdown: vi.fn(() => ""),
    },
  },
};

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => mockEditor),
}));

vi.mock("@tanstack/react-pacer", () => ({
  useDebouncedCallback: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
}));

vi.mock("../editor-extensions", () => ({
  createEditorProps: vi.fn(() => ({})),
  createExtensions: vi.fn(() => []),
}));

const mockUploadMedia = vi.fn();

vi.mock("../use-media-upload", () => ({
  useMediaUpload: vi.fn(() => ({
    isUploading: false,
    uploadMedia: mockUploadMedia,
    uploadProgress: null,
  })),
}));

describe("useTiptapMarkdownEditor", () => {
  let useTiptapMarkdownEditor: typeof import("./use-editor").useTiptapMarkdownEditor;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockEditor.storage.markdown.getMarkdown.mockReturnValue("");
    const mod = await import("./use-editor");
    useTiptapMarkdownEditor = mod.useTiptapMarkdownEditor;
  });

  it("computes isNearLimit when near maxLength", () => {
    mockEditor.storage.characterCount.characters.mockReturnValue(95);
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({
        maxLength: 100,
        onChange: vi.fn(),
        value: "",
      })
    );
    expect(result.current.isNearLimit).toBe(true);
  });

  it("isNearLimit is false when well below maxLength", () => {
    mockEditor.storage.characterCount.characters.mockReturnValue(50);
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({
        maxLength: 100,
        onChange: vi.fn(),
        value: "",
      })
    );
    expect(result.current.isNearLimit).toBe(false);
  });

  it("computes isAtLimit when at maxLength", () => {
    mockEditor.storage.characterCount.characters.mockReturnValue(100);
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({
        maxLength: 100,
        onChange: vi.fn(),
        value: "",
      })
    );
    expect(result.current.isAtLimit).toBe(true);
  });

  it("isAtLimit is false when no maxLength", () => {
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({ onChange: vi.fn(), value: "" })
    );
    expect(result.current.isAtLimit).toBe(false);
  });

  it("isNearLimit is false when no maxLength", () => {
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({ onChange: vi.fn(), value: "" })
    );
    expect(result.current.isNearLimit).toBe(false);
  });

  it("syncs external value changes to editor without echoing an update", () => {
    mockEditor.storage.markdown.getMarkdown.mockReturnValue("old content");

    const { rerender } = renderHook(
      ({ value }) => useTiptapMarkdownEditor({ onChange: vi.fn(), value }),
      { initialProps: { value: "old content" } }
    );

    mockEditor.storage.markdown.getMarkdown.mockReturnValue("old content");
    rerender({ value: "new content" });

    expect(mockSetContent).toHaveBeenCalledWith("new content", {
      emitUpdate: false,
    });
  });

  it("updates editable state when disabled changes", () => {
    const { rerender } = renderHook(
      ({ disabled }) =>
        useTiptapMarkdownEditor({ disabled, onChange: vi.fn(), value: "" }),
      { initialProps: { disabled: false } }
    );

    rerender({ disabled: true });
    expect(mockSetEditable).toHaveBeenCalledWith(false);
  });

  it("updates editable state when editable prop changes", () => {
    const { rerender } = renderHook(
      ({ editable }) =>
        useTiptapMarkdownEditor({ editable, onChange: vi.fn(), value: "" }),
      { initialProps: { editable: true } }
    );

    rerender({ editable: false });
    expect(mockSetEditable).toHaveBeenCalledWith(false);
  });

  it("handleImageUpload triggers file input click", () => {
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({ onChange: vi.fn(), value: "" })
    );

    // Create a mock input element
    const mockClick = vi.fn();
    Object.defineProperty(result.current.imageInputRef, "current", {
      value: { click: mockClick },
      writable: true,
    });

    result.current.handleImageUpload();
    expect(mockClick).toHaveBeenCalled();
  });

  it("handleVideoUpload triggers file input click", () => {
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({ onChange: vi.fn(), value: "" })
    );

    const mockClick = vi.fn();
    Object.defineProperty(result.current.videoInputRef, "current", {
      value: { click: mockClick },
      writable: true,
    });

    result.current.handleVideoUpload();
    expect(mockClick).toHaveBeenCalled();
  });

  it("handleImageChange uploads file and resets input", async () => {
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({ onChange: vi.fn(), value: "" })
    );

    const file = new File(["test"], "test.png", { type: "image/png" });
    const event = {
      target: { files: [file], value: "test.png" },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await result.current.handleImageChange(event);
    expect(mockUploadMedia).toHaveBeenCalledWith(file);
    expect(event.target.value).toBe("");
  });

  it("handleImageChange does nothing without a file", async () => {
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({ onChange: vi.fn(), value: "" })
    );

    const event = {
      target: { files: [], value: "" },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await result.current.handleImageChange(event);
    expect(mockUploadMedia).not.toHaveBeenCalled();
  });

  it("handleVideoChange uploads file and resets input", async () => {
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({ onChange: vi.fn(), value: "" })
    );

    const file = new File(["video"], "test.mp4", { type: "video/mp4" });
    const event = {
      target: { files: [file], value: "test.mp4" },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await result.current.handleVideoChange(event);
    expect(mockUploadMedia).toHaveBeenCalledWith(file);
    expect(event.target.value).toBe("");
  });

  it("returns characterCount as 0 when characterCount storage missing", () => {
    const origStorage = mockEditor.storage;
    mockEditor.storage = {
      markdown: { getMarkdown: vi.fn(() => "") },
    };
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({ onChange: vi.fn(), value: "" })
    );
    expect(result.current.characterCount).toBe(0);
    mockEditor.storage = origStorage;
  });
});
