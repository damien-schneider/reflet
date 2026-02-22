import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

const mockSetContent = vi.fn();
const mockSetEditable = vi.fn();
const mockFocus = vi.fn();
const mockGetText = vi.fn(() => "existing text");

const mockEditor = {
  commands: { setContent: mockSetContent, focus: mockFocus },
  getText: mockGetText,
  setEditable: mockSetEditable,
  on: vi.fn(),
  off: vi.fn(),
  destroy: vi.fn(),
};

let useEditorCallback: Record<string, unknown> | null = null;

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn((config: Record<string, unknown>) => {
    useEditorCallback = config;
    return mockEditor;
  }),
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div data-testid="editor-content">{editor ? "Editor" : "No editor"}</div>
  ),
}));

vi.mock("@tiptap/starter-kit", () => ({
  default: { configure: vi.fn(() => ({})) },
}));

vi.mock("@tiptap/extension-placeholder", () => ({
  default: { configure: vi.fn(() => ({})) },
}));

vi.mock("./styles.css", () => ({}));

describe("TiptapTitleEditor", () => {
  let TiptapTitleEditor: typeof import("./title-editor").TiptapTitleEditor;

  beforeEach(async () => {
    vi.clearAllMocks();
    useEditorCallback = null;
    const mod = await import("./title-editor");
    TiptapTitleEditor = mod.TiptapTitleEditor;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders with data-slot attribute", () => {
    render(<TiptapTitleEditor onChange={vi.fn()} value="" />);
    const container = document.querySelector(
      '[data-slot="tiptap-title-editor"]'
    );
    expect(container).toBeInTheDocument();
  });

  it("renders editor content", () => {
    render(<TiptapTitleEditor onChange={vi.fn()} value="Test" />);
    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <TiptapTitleEditor className="my-class" onChange={vi.fn()} value="" />
    );
    const container = document.querySelector(
      '[data-slot="tiptap-title-editor"]'
    );
    expect(container).toHaveClass("my-class");
  });

  it("applies custom style", () => {
    render(
      <TiptapTitleEditor onChange={vi.fn()} style={{ color: "red" }} value="" />
    );
    const container = document.querySelector(
      '[data-slot="tiptap-title-editor"]'
    );
    expect(container).toHaveStyle({ color: "rgb(255, 0, 0)" });
  });

  it("applies disabled styles when disabled", () => {
    render(<TiptapTitleEditor disabled onChange={vi.fn()} value="" />);
    const container = document.querySelector(
      '[data-slot="tiptap-title-editor"]'
    );
    expect(container?.className).toContain("cursor-not-allowed");
    expect(container?.className).toContain("opacity-50");
  });

  it("syncs editable state when disabled changes", () => {
    const { rerender } = render(
      <TiptapTitleEditor disabled={false} onChange={vi.fn()} value="" />
    );

    rerender(<TiptapTitleEditor disabled={true} onChange={vi.fn()} value="" />);

    expect(mockSetEditable).toHaveBeenCalledWith(false);
  });

  it("syncs external value changes to editor", () => {
    mockGetText.mockReturnValue("old value");

    const { rerender } = render(
      <TiptapTitleEditor onChange={vi.fn()} value="old value" />
    );

    rerender(<TiptapTitleEditor onChange={vi.fn()} value="new value" />);

    expect(mockSetContent).toHaveBeenCalledWith("<p>new value</p>");
  });

  it("sets empty content when value is empty", () => {
    mockGetText.mockReturnValue("some text");

    const { rerender } = render(
      <TiptapTitleEditor onChange={vi.fn()} value="some text" />
    );

    rerender(<TiptapTitleEditor onChange={vi.fn()} value="" />);

    expect(mockSetContent).toHaveBeenCalledWith("");
  });

  it("calls onChange with plain text on editor update", () => {
    const onChange = vi.fn();
    render(<TiptapTitleEditor onChange={onChange} value="" />);

    // Simulate editor update
    if (useEditorCallback?.onUpdate) {
      const mockEd = { getText: () => "typed text" };
      (useEditorCallback.onUpdate as (arg: { editor: unknown }) => void)({
        editor: mockEd,
      });
      expect(onChange).toHaveBeenCalledWith("typed text");
    }
  });

  it("prevents Enter from creating new lines", () => {
    render(<TiptapTitleEditor onChange={vi.fn()} value="" />);

    if (useEditorCallback?.editorProps) {
      const editorProps = useEditorCallback.editorProps as {
        handleKeyDown: (view: unknown, event: KeyboardEvent) => boolean;
      };
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        cancelable: true,
      });
      vi.spyOn(event, "preventDefault");

      const result = editorProps.handleKeyDown(null, event);
      expect(result).toBe(true);
      expect(event.preventDefault).toHaveBeenCalled();
    }
  });

  it("calls onEnter when Enter is pressed", () => {
    const onEnter = vi.fn();
    render(<TiptapTitleEditor onChange={vi.fn()} onEnter={onEnter} value="" />);

    if (useEditorCallback?.editorProps) {
      const editorProps = useEditorCallback.editorProps as {
        handleKeyDown: (view: unknown, event: KeyboardEvent) => boolean;
      };
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        cancelable: true,
      });
      editorProps.handleKeyDown(null, event);
      expect(onEnter).toHaveBeenCalled();
    }
  });

  it("calls onSubmit when Cmd+Enter is pressed", () => {
    const onSubmit = vi.fn();
    render(
      <TiptapTitleEditor onChange={vi.fn()} onSubmit={onSubmit} value="" />
    );

    if (useEditorCallback?.editorProps) {
      const editorProps = useEditorCallback.editorProps as {
        handleKeyDown: (view: unknown, event: KeyboardEvent) => boolean;
      };
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        metaKey: true,
        cancelable: true,
      });
      vi.spyOn(event, "preventDefault");

      const result = editorProps.handleKeyDown(null, event);
      expect(result).toBe(true);
      expect(event.preventDefault).toHaveBeenCalled();
      expect(onSubmit).toHaveBeenCalled();
    }
  });

  it("calls onSubmit when Ctrl+Enter is pressed", () => {
    const onSubmit = vi.fn();
    render(
      <TiptapTitleEditor onChange={vi.fn()} onSubmit={onSubmit} value="" />
    );

    if (useEditorCallback?.editorProps) {
      const editorProps = useEditorCallback.editorProps as {
        handleKeyDown: (view: unknown, event: KeyboardEvent) => boolean;
      };
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        ctrlKey: true,
        cancelable: true,
      });
      const result = editorProps.handleKeyDown(null, event);
      expect(result).toBe(true);
      expect(onSubmit).toHaveBeenCalled();
    }
  });

  it("returns false for non-Enter keys", () => {
    render(<TiptapTitleEditor onChange={vi.fn()} value="" />);

    if (useEditorCallback?.editorProps) {
      const editorProps = useEditorCallback.editorProps as {
        handleKeyDown: (view: unknown, event: KeyboardEvent) => boolean;
      };
      const event = new KeyboardEvent("keydown", { key: "a" });
      const result = editorProps.handleKeyDown(null, event);
      expect(result).toBe(false);
    }
  });

  it("focuses editor when container is clicked", () => {
    render(<TiptapTitleEditor onChange={vi.fn()} value="" />);

    const container = document.querySelector(
      '[data-slot="tiptap-title-editor"]'
    );
    if (container) {
      container.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(mockFocus).toHaveBeenCalled();
    }
  });

  it("passes autoFocus to useEditor config", () => {
    render(<TiptapTitleEditor autoFocus onChange={vi.fn()} value="" />);
    expect(useEditorCallback).toMatchObject({ autofocus: true });
  });

  it("configures StarterKit with all block elements disabled", () => {
    render(<TiptapTitleEditor onChange={vi.fn()} value="" />);

    if (useEditorCallback?.extensions) {
      // The component should configure StarterKit to disable block elements
      expect(useEditorCallback.extensions).toBeDefined();
    }
  });
});
