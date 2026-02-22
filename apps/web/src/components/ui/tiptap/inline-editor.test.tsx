import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

const mockSetContent = vi.fn();
const mockSetEditable = vi.fn();
const mockFocus = vi.fn();

const mockEditor = {
  commands: { setContent: mockSetContent, focus: mockFocus },
  storage: {
    markdown: { getMarkdown: vi.fn(() => "") },
    characterCount: { characters: vi.fn(() => 10) },
  },
  setEditable: mockSetEditable,
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

vi.mock("@tiptap/extension-placeholder", () => ({
  default: { configure: vi.fn(() => ({})) },
}));

vi.mock("@tiptap/extension-link", () => ({
  default: { configure: vi.fn(() => ({})) },
}));

vi.mock("@tiptap/extension-character-count", () => ({
  default: { configure: vi.fn(() => ({})) },
}));

vi.mock("tiptap-markdown", () => ({
  Markdown: { configure: vi.fn(() => ({})) },
}));

vi.mock("./styles.css", () => ({}));

describe("TiptapInlineEditor", () => {
  let TiptapInlineEditor: typeof import("./inline-editor").TiptapInlineEditor;

  beforeEach(async () => {
    vi.clearAllMocks();
    useEditorConfig = null;
    mockEditor.storage.characterCount.characters.mockReturnValue(10);
    const mod = await import("./inline-editor");
    TiptapInlineEditor = mod.TiptapInlineEditor;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders with data-slot attribute", () => {
    render(<TiptapInlineEditor onChange={vi.fn()} value="" />);
    const container = document.querySelector(
      '[data-slot="tiptap-inline-editor"]'
    );
    expect(container).toBeInTheDocument();
  });

  it("renders editor content", () => {
    render(<TiptapInlineEditor onChange={vi.fn()} value="hello" />);
    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <TiptapInlineEditor className="custom" onChange={vi.fn()} value="" />
    );
    const container = document.querySelector(
      '[data-slot="tiptap-inline-editor"]'
    );
    expect(container).toHaveClass("custom");
  });

  it("applies disabled styles when disabled", () => {
    render(<TiptapInlineEditor disabled onChange={vi.fn()} value="" />);
    const container = document.querySelector(
      '[data-slot="tiptap-inline-editor"]'
    );
    expect(container?.className).toContain("cursor-not-allowed");
    expect(container?.className).toContain("opacity-50");
  });

  it("shows character count when maxLength is set", () => {
    mockEditor.storage.characterCount.characters.mockReturnValue(10);
    render(<TiptapInlineEditor maxLength={100} onChange={vi.fn()} value="" />);
    expect(screen.getByText("10/100")).toBeInTheDocument();
  });

  it("does not show character count without maxLength", () => {
    render(<TiptapInlineEditor onChange={vi.fn()} value="" />);
    expect(screen.queryByText(/\/\d+/)).not.toBeInTheDocument();
  });

  it("shows destructive color when at limit", () => {
    mockEditor.storage.characterCount.characters.mockReturnValue(100);
    render(<TiptapInlineEditor maxLength={100} onChange={vi.fn()} value="" />);
    const counter = screen.getByText("100/100");
    expect(counter.className).toContain("text-destructive");
  });

  it("shows amber color when near limit", () => {
    mockEditor.storage.characterCount.characters.mockReturnValue(95);
    render(<TiptapInlineEditor maxLength={100} onChange={vi.fn()} value="" />);
    const counter = screen.getByText("95/100");
    expect(counter.className).toContain("text-amber-500");
  });

  it("shows muted color when well below limit", () => {
    mockEditor.storage.characterCount.characters.mockReturnValue(10);
    render(<TiptapInlineEditor maxLength={100} onChange={vi.fn()} value="" />);
    const counter = screen.getByText("10/100");
    expect(counter.className).toContain("text-muted-foreground");
  });

  it("syncs external value changes to editor", () => {
    mockEditor.storage.markdown.getMarkdown.mockReturnValue("old");
    const { rerender } = render(
      <TiptapInlineEditor onChange={vi.fn()} value="old" />
    );

    mockEditor.storage.markdown.getMarkdown.mockReturnValue("old");
    rerender(<TiptapInlineEditor onChange={vi.fn()} value="new" />);
    expect(mockSetContent).toHaveBeenCalledWith("new");
  });

  it("updates editable when disabled changes", () => {
    const { rerender } = render(
      <TiptapInlineEditor disabled={false} onChange={vi.fn()} value="" />
    );
    rerender(
      <TiptapInlineEditor disabled={true} onChange={vi.fn()} value="" />
    );
    expect(mockSetEditable).toHaveBeenCalledWith(false);
  });

  it("calls onChange with markdown on editor update", () => {
    const onChange = vi.fn();
    render(<TiptapInlineEditor onChange={onChange} value="" />);

    if (useEditorConfig?.onUpdate) {
      const mockEd = {
        storage: { markdown: { getMarkdown: () => "typed" } },
      };
      (useEditorConfig.onUpdate as (arg: { editor: unknown }) => void)({
        editor: mockEd,
      });
      expect(onChange).toHaveBeenCalledWith("typed");
    }
  });

  it("handles Cmd+Enter to call onSubmit", () => {
    const onSubmit = vi.fn();
    render(
      <TiptapInlineEditor onChange={vi.fn()} onSubmit={onSubmit} value="" />
    );

    if (useEditorConfig?.editorProps) {
      const { handleKeyDown } = useEditorConfig.editorProps as {
        handleKeyDown: (view: unknown, event: KeyboardEvent) => boolean;
      };
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        metaKey: true,
        cancelable: true,
      });
      vi.spyOn(event, "preventDefault");
      const result = handleKeyDown(null, event);
      expect(result).toBe(true);
      expect(onSubmit).toHaveBeenCalled();
    }
  });

  it("returns false for regular keys", () => {
    render(<TiptapInlineEditor onChange={vi.fn()} value="" />);

    if (useEditorConfig?.editorProps) {
      const { handleKeyDown } = useEditorConfig.editorProps as {
        handleKeyDown: (view: unknown, event: KeyboardEvent) => boolean;
      };
      const event = new KeyboardEvent("keydown", { key: "a" });
      const result = handleKeyDown(null, event);
      expect(result).toBe(false);
    }
  });

  it("focuses editor when container is clicked", () => {
    render(<TiptapInlineEditor onChange={vi.fn()} value="" />);
    const container = document.querySelector(
      '[data-slot="tiptap-inline-editor"]'
    );
    container?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(mockFocus).toHaveBeenCalled();
  });

  it("passes autoFocus to useEditor config", () => {
    render(<TiptapInlineEditor autoFocus onChange={vi.fn()} value="" />);
    expect(useEditorConfig).toMatchObject({ autofocus: true });
  });
});
