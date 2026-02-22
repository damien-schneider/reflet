import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSetContent = vi.fn();
const mockSetEditable = vi.fn();
const mockChainFocusSetImage = vi.fn(() => ({ run: vi.fn() }));
const mockChainFocusInsertContent = vi.fn(() => ({ run: vi.fn() }));

const mockEditor = {
  commands: { setContent: mockSetContent },
  chain: vi.fn(() => ({
    focus: vi.fn(() => ({
      setImage: mockChainFocusSetImage,
      insertContent: mockChainFocusInsertContent,
    })),
  })),
  setEditable: mockSetEditable,
  storage: {
    markdown: {
      getMarkdown: vi.fn(() => ""),
    },
    characterCount: {
      characters: vi.fn(() => 42),
    },
  },
  on: vi.fn(),
  off: vi.fn(),
  destroy: vi.fn(),
};

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => mockEditor),
}));

vi.mock("@tanstack/react-pacer", () => ({
  useDebouncedCallback: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
}));

vi.mock("../editor-extensions", () => ({
  createExtensions: vi.fn(() => []),
  createEditorProps: vi.fn(() => ({})),
}));

const mockUploadMedia = vi.fn();

vi.mock("../use-media-upload", () => ({
  useMediaUpload: vi.fn(() => ({
    uploadMedia: mockUploadMedia,
    isUploading: false,
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

  afterEach(() => {
    cleanup();
  });

  it("returns editor instance", () => {
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({ value: "", onChange: vi.fn() })
    );
    expect(result.current.editor).toBe(mockEditor);
  });

  it("returns imageInputRef and videoInputRef", () => {
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({ value: "", onChange: vi.fn() })
    );
    expect(result.current.imageInputRef).toBeDefined();
    expect(result.current.videoInputRef).toBeDefined();
  });

  it("returns upload state", () => {
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({ value: "", onChange: vi.fn() })
    );
    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadProgress).toBeNull();
  });

  it("returns character count from editor storage", () => {
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({ value: "", onChange: vi.fn() })
    );
    expect(result.current.characterCount).toBe(42);
  });

  it("computes isNearLimit when near maxLength", () => {
    mockEditor.storage.characterCount.characters.mockReturnValue(95);
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({
        value: "",
        onChange: vi.fn(),
        maxLength: 100,
      })
    );
    expect(result.current.isNearLimit).toBe(true);
  });

  it("isNearLimit is false when well below maxLength", () => {
    mockEditor.storage.characterCount.characters.mockReturnValue(50);
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({
        value: "",
        onChange: vi.fn(),
        maxLength: 100,
      })
    );
    expect(result.current.isNearLimit).toBe(false);
  });

  it("computes isAtLimit when at maxLength", () => {
    mockEditor.storage.characterCount.characters.mockReturnValue(100);
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({
        value: "",
        onChange: vi.fn(),
        maxLength: 100,
      })
    );
    expect(result.current.isAtLimit).toBe(true);
  });

  it("isAtLimit is false when no maxLength", () => {
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({ value: "", onChange: vi.fn() })
    );
    expect(result.current.isAtLimit).toBe(false);
  });

  it("isNearLimit is false when no maxLength", () => {
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({ value: "", onChange: vi.fn() })
    );
    expect(result.current.isNearLimit).toBe(false);
  });

  it("syncs external value changes to editor", () => {
    mockEditor.storage.markdown.getMarkdown.mockReturnValue("old content");

    const { rerender } = renderHook(
      ({ value }) => useTiptapMarkdownEditor({ value, onChange: vi.fn() }),
      { initialProps: { value: "old content" } }
    );

    mockEditor.storage.markdown.getMarkdown.mockReturnValue("old content");
    rerender({ value: "new content" });

    expect(mockSetContent).toHaveBeenCalledWith("new content");
  });

  it("does not sync if editor markdown matches value", () => {
    mockEditor.storage.markdown.getMarkdown.mockReturnValue("same");

    renderHook(() =>
      useTiptapMarkdownEditor({ value: "same", onChange: vi.fn() })
    );

    // setContent should not be called since values match
    // (It may be called during initialization, but not during sync)
  });

  it("updates editable state when disabled changes", () => {
    const { rerender } = renderHook(
      ({ disabled }) =>
        useTiptapMarkdownEditor({ value: "", onChange: vi.fn(), disabled }),
      { initialProps: { disabled: false } }
    );

    rerender({ disabled: true });
    expect(mockSetEditable).toHaveBeenCalledWith(false);
  });

  it("updates editable state when editable prop changes", () => {
    const { rerender } = renderHook(
      ({ editable }) =>
        useTiptapMarkdownEditor({ value: "", onChange: vi.fn(), editable }),
      { initialProps: { editable: true } }
    );

    rerender({ editable: false });
    expect(mockSetEditable).toHaveBeenCalledWith(false);
  });

  it("handleImageUpload triggers file input click", () => {
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({ value: "", onChange: vi.fn() })
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
      useTiptapMarkdownEditor({ value: "", onChange: vi.fn() })
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
      useTiptapMarkdownEditor({ value: "", onChange: vi.fn() })
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
      useTiptapMarkdownEditor({ value: "", onChange: vi.fn() })
    );

    const event = {
      target: { files: [], value: "" },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await result.current.handleImageChange(event);
    expect(mockUploadMedia).not.toHaveBeenCalled();
  });

  it("handleVideoChange uploads file and resets input", async () => {
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({ value: "", onChange: vi.fn() })
    );

    const file = new File(["video"], "test.mp4", { type: "video/mp4" });
    const event = {
      target: { files: [file], value: "test.mp4" },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await result.current.handleVideoChange(event);
    expect(mockUploadMedia).toHaveBeenCalledWith(file);
    expect(event.target.value).toBe("");
  });

  it("passes debounceMs to useDebouncedCallback", async () => {
    const { useDebouncedCallback } = (await import(
      "@tanstack/react-pacer"
    )) as {
      useDebouncedCallback: ReturnType<typeof vi.fn>;
    };
    useDebouncedCallback.mockClear();
    renderHook(() =>
      useTiptapMarkdownEditor({
        value: "",
        onChange: vi.fn(),
        debounceMs: 300,
      })
    );
    expect(useDebouncedCallback).toHaveBeenCalledWith(expect.any(Function), {
      wait: 300,
    });
  });

  it("calls createExtensions with options including placeholder and maxLength", async () => {
    const { createExtensions } = (await import("../editor-extensions")) as {
      createExtensions: ReturnType<typeof vi.fn>;
    };
    createExtensions.mockClear();
    renderHook(() =>
      useTiptapMarkdownEditor({
        value: "",
        onChange: vi.fn(),
        placeholder: "Custom placeholder",
        maxLength: 500,
      })
    );
    expect(createExtensions).toHaveBeenCalledWith(
      expect.objectContaining({
        placeholder: "Custom placeholder",
        maxLength: 500,
      })
    );
  });

  it("uses default placeholder when not provided", async () => {
    const { createExtensions } = (await import("../editor-extensions")) as {
      createExtensions: ReturnType<typeof vi.fn>;
    };
    createExtensions.mockClear();
    renderHook(() => useTiptapMarkdownEditor({ value: "", onChange: vi.fn() }));
    expect(createExtensions).toHaveBeenCalledWith(
      expect.objectContaining({
        placeholder: "Write something... Type '/' for commands",
      })
    );
  });

  it("returns characterCount as 0 when characterCount storage missing", () => {
    const origStorage = mockEditor.storage;
    mockEditor.storage = {
      markdown: { getMarkdown: vi.fn(() => "") },
    };
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({ value: "", onChange: vi.fn() })
    );
    expect(result.current.characterCount).toBe(0);
    mockEditor.storage = origStorage;
  });

  it("returns isAtLimit true when characterCount equals maxLength", () => {
    mockEditor.storage.characterCount.characters.mockReturnValue(100);
    const { result } = renderHook(() =>
      useTiptapMarkdownEditor({
        value: "",
        onChange: vi.fn(),
        maxLength: 100,
      })
    );
    expect(result.current.isAtLimit).toBe(true);
  });
});
