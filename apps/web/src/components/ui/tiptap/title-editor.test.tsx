import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSetContent = vi.fn();
const mockSetEditable = vi.fn();
const mockFocus = vi.fn();
const mockGetText = vi.fn(() => "existing text");

const mockEditor = {
  commands: { focus: mockFocus, setContent: mockSetContent },
  destroy: vi.fn(),
  getText: mockGetText,
  off: vi.fn(),
  on: vi.fn(),
  setEditable: mockSetEditable,
};

let useEditorCallback: Record<string, unknown> | null = null;

vi.mock("@tiptap/react", () => ({
  EditorContent: ({ editor }: { editor: unknown }) => (
    <div data-testid="editor-content">{editor ? "Editor" : "No editor"}</div>
  ),
  useEditor: vi.fn((config: Record<string, unknown>) => {
    useEditorCallback = config;
    return mockEditor;
  }),
}));

vi.mock("@tiptap/starter-kit", () => ({
  default: { configure: vi.fn(() => ({})) },
}));

vi.mock("@tiptap/extension-placeholder", () => ({
  default: { configure: vi.fn(() => ({})) },
}));

vi.mock("./styles.css", () => ({}));

const editorConfig = (): Record<string, unknown> => {
  if (!useEditorCallback) {
    throw new Error("useEditor was not called");
  }
  return useEditorCallback;
};

const handleKeyDown = (event: KeyboardEvent): boolean => {
  const { editorProps } = editorConfig() as {
    editorProps: {
      handleKeyDown: (view: unknown, event: KeyboardEvent) => boolean;
    };
  };
  return editorProps.handleKeyDown(null, event);
};

describe("TiptapTitleEditor", () => {
  let TiptapTitleEditor: typeof import("./title-editor").TiptapTitleEditor;

  beforeEach(async () => {
    vi.clearAllMocks();
    useEditorCallback = null;
    const mod = await import("./title-editor");
    TiptapTitleEditor = mod.TiptapTitleEditor;
  });

  it("syncs editable state when disabled changes", () => {
    const { rerender } = render(
      <TiptapTitleEditor disabled={false} onChange={vi.fn()} value="" />
    );

    rerender(<TiptapTitleEditor disabled={true} onChange={vi.fn()} value="" />);

    expect(mockSetEditable).toHaveBeenCalledWith(false);
  });

  it("syncs external value changes to editor as plain text", () => {
    mockGetText.mockReturnValue("old value");

    const { rerender } = render(
      <TiptapTitleEditor onChange={vi.fn()} value="old value" />
    );

    rerender(<TiptapTitleEditor onChange={vi.fn()} value="Fix <b> & tags" />);

    expect(mockSetContent).toHaveBeenCalledWith(
      {
        content: [
          {
            content: [{ text: "Fix <b> & tags", type: "text" }],
            type: "paragraph",
          },
        ],
        type: "doc",
      },
      { emitUpdate: false }
    );
  });

  it("sets an empty paragraph when value is empty", () => {
    mockGetText.mockReturnValue("some text");

    const { rerender } = render(
      <TiptapTitleEditor onChange={vi.fn()} value="some text" />
    );

    rerender(<TiptapTitleEditor onChange={vi.fn()} value="" />);

    expect(mockSetContent).toHaveBeenCalledWith(
      { content: [{ type: "paragraph" }], type: "doc" },
      { emitUpdate: false }
    );
  });

  it("calls onChange with plain text on editor update", () => {
    const onChange = vi.fn();
    render(<TiptapTitleEditor onChange={onChange} value="" />);

    const { onUpdate } = editorConfig() as {
      onUpdate: (arg: { editor: { getText: () => string } }) => void;
    };
    onUpdate({ editor: { getText: () => "typed text" } });
    expect(onChange).toHaveBeenCalledWith("typed text");
  });

  it("turns Enter into onEnter instead of a new line", () => {
    const onEnter = vi.fn();
    render(<TiptapTitleEditor onChange={vi.fn()} onEnter={onEnter} value="" />);

    const event = new KeyboardEvent("keydown", {
      cancelable: true,
      key: "Enter",
    });

    expect(handleKeyDown(event)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it("calls onSubmit when Cmd+Enter is pressed", () => {
    const onSubmit = vi.fn();
    render(
      <TiptapTitleEditor onChange={vi.fn()} onSubmit={onSubmit} value="" />
    );

    const event = new KeyboardEvent("keydown", {
      cancelable: true,
      key: "Enter",
      metaKey: true,
    });

    expect(handleKeyDown(event)).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("calls onSubmit when Ctrl+Enter is pressed", () => {
    const onSubmit = vi.fn();
    render(
      <TiptapTitleEditor onChange={vi.fn()} onSubmit={onSubmit} value="" />
    );

    const event = new KeyboardEvent("keydown", {
      cancelable: true,
      ctrlKey: true,
      key: "Enter",
    });

    expect(handleKeyDown(event)).toBe(true);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("returns false for non-Enter keys", () => {
    render(<TiptapTitleEditor onChange={vi.fn()} value="" />);

    expect(handleKeyDown(new KeyboardEvent("keydown", { key: "a" }))).toBe(
      false
    );
  });
});
