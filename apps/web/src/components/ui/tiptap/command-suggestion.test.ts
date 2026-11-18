import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("tippy.js", () => ({
  default: vi.fn(() => [
    {
      destroy: vi.fn(),
      hide: vi.fn(),
      setProps: vi.fn(),
    },
  ]),
}));

vi.mock("@tiptap/core", () => ({
  Extension: {
    create: vi.fn((config: Record<string, unknown>) => ({
      ...config,
      configure: vi.fn((opts: Record<string, unknown>) => ({
        ...config,
        options: { ...opts },
      })),
      name: (config as { name: string }).name,
      options: {
        suggestion: {},
      },
    })),
  },
}));

vi.mock("@tiptap/react", () => {
  const ReactRenderer = vi.fn().mockImplementation(function (
    this: Record<string, unknown>
  ) {
    this.element = document.createElement("div");
    this.updateProps = vi.fn();
    this.destroy = vi.fn();
    return this;
  });
  return { ReactRenderer };
});

vi.mock("@tiptap/suggestion", () => ({
  default: vi.fn(() => ({})),
}));

vi.mock("./command-items", () => ({
  createSlashCommands: vi.fn((onImage?: () => void, onVideo?: () => void) => {
    const items = [
      { command: vi.fn(), description: "heading", title: "Heading 1" },
      { command: vi.fn(), description: "list", title: "Bullet List" },
    ];
    if (onImage) {
      items.push({ command: vi.fn(), description: "image", title: "Image" });
    }
    if (onVideo) {
      items.push({ command: vi.fn(), description: "video", title: "Video" });
    }
    return items;
  }),
}));

vi.mock("./command-list", () => ({
  CommandList: () => null,
}));

describe("command-suggestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("findAppendTarget", () => {
    it("returns document.body when editorElement is null", async () => {
      const { findAppendTarget } = await import("./command-suggestion");
      expect(findAppendTarget(null)).toBe(document.body);
    });

    it("returns document.body when editor is not in a dialog", async () => {
      const { findAppendTarget } = await import("./command-suggestion");
      const el = document.createElement("div");
      document.body.appendChild(el);
      expect(findAppendTarget(el)).toBe(document.body);
      el.remove();
    });

    it.each(["dialog", "alertdialog"])(
      "returns the %s surface when the editor is inside one",
      async (role) => {
        const { findAppendTarget } = await import("./command-suggestion");
        const surface = document.createElement("div");
        surface.setAttribute("role", role);
        surface.setAttribute("data-slot", "content");
        const editor = document.createElement("div");
        surface.appendChild(editor);
        document.body.appendChild(surface);

        expect(findAppendTarget(editor)).toBe(surface);
        surface.remove();
      }
    );
  });

  describe("suggestion render lifecycle", () => {
    it("filters items by query", async () => {
      const { createSlashCommandExtension } = await import(
        "./command-suggestion"
      );
      const ext = createSlashCommandExtension({});
      const suggestion = ext.options?.suggestion;

      if (suggestion?.items) {
        const items = suggestion.items({
          editor: {} as never,
          query: "bullet",
        });
        expect(
          items.some((i: { title: string }) => i.title === "Bullet List")
        ).toBe(true);
        expect(
          items.some((i: { title: string }) => i.title === "Heading 1")
        ).toBe(false);
      }
    });

    it("returns all items for empty query", async () => {
      const { createSlashCommandExtension } = await import(
        "./command-suggestion"
      );
      const ext = createSlashCommandExtension({});
      const suggestion = ext.options?.suggestion;

      if (suggestion?.items) {
        const items = suggestion.items({ editor: {} as never, query: "" });
        expect(items.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe("suggestion render methods", () => {
    it("onKeyDown returns true for Escape and hides popup", async () => {
      const tippy = (await import("tippy.js")).default;
      const { createSlashCommandExtension } = await import(
        "./command-suggestion"
      );

      const ext = createSlashCommandExtension({});
      const suggestion = ext.options?.suggestion;
      if (!suggestion?.render) {
        return;
      }

      const mockHide = vi.fn();
      (tippy as ReturnType<typeof vi.fn>).mockReturnValue([
        { destroy: vi.fn(), hide: mockHide, setProps: vi.fn() },
      ]);

      const renderResult = suggestion.render();

      renderResult.onStart({
        clientRect: () => new DOMRect(),
        command: vi.fn(),
        editor: {
          view: { dom: document.createElement("div") },
        },
        items: [],
      } as never);

      const result = renderResult.onKeyDown({
        event: new KeyboardEvent("keydown", { key: "Escape" }),
      });
      expect(result).toBe(true);
      expect(mockHide).toHaveBeenCalled();
    });

    it("onKeyDown delegates to the component ref for non-Escape keys", async () => {
      const { ReactRenderer } = await import("@tiptap/react");
      const { createSlashCommandExtension } = await import(
        "./command-suggestion"
      );

      const ext = createSlashCommandExtension({});
      const suggestion = ext.options?.suggestion;
      if (!suggestion?.render) {
        return;
      }

      const renderResult = suggestion.render();

      renderResult.onStart({
        clientRect: () => new DOMRect(),
        command: vi.fn(),
        editor: {
          view: { dom: document.createElement("div") },
        },
        items: [],
      } as never);

      const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
      expect(renderResult.onKeyDown({ event })).toBe(false);

      const onKeyDown = vi.fn(() => true);
      const instance = vi.mocked(ReactRenderer).mock.results.at(-1)?.value;
      instance.ref = { onKeyDown };
      expect(renderResult.onKeyDown({ event })).toBe(true);
      expect(onKeyDown).toHaveBeenCalledWith({ event });
    });
  });
});
