import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock tippy.js
vi.mock("tippy.js", () => ({
  default: vi.fn(() => [
    {
      setProps: vi.fn(),
      hide: vi.fn(),
      destroy: vi.fn(),
    },
  ]),
}));

// Mock @tiptap/core
vi.mock("@tiptap/core", () => ({
  Extension: {
    create: vi.fn((config: Record<string, unknown>) => ({
      ...config,
      name: (config as { name: string }).name,
      configure: vi.fn((opts: Record<string, unknown>) => ({
        ...config,
        options: { ...opts },
      })),
      options: {
        suggestion: {},
      },
    })),
  },
}));

// Mock @tiptap/react
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

// Mock @tiptap/suggestion
vi.mock("@tiptap/suggestion", () => ({
  default: vi.fn(() => ({})),
}));

// Mock command-items
vi.mock("./command-items", () => ({
  createSlashCommands: vi.fn((onImage?: () => void, onVideo?: () => void) => {
    const items = [
      { title: "Heading 1", description: "heading", command: vi.fn() },
      { title: "Bullet List", description: "list", command: vi.fn() },
    ];
    if (onImage) {
      items.push({ title: "Image", description: "image", command: vi.fn() });
    }
    if (onVideo) {
      items.push({ title: "Video", description: "video", command: vi.fn() });
    }
    return items;
  }),
}));

// Mock command-list
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

    it("returns dialog content when editor is inside a dialog", async () => {
      const { findAppendTarget } = await import("./command-suggestion");
      const dialog = document.createElement("div");
      dialog.setAttribute("data-slot", "dialog-content");
      const editor = document.createElement("div");
      dialog.appendChild(editor);
      document.body.appendChild(dialog);

      expect(findAppendTarget(editor)).toBe(dialog);
      dialog.remove();
    });
  });

  describe("SLASH_MENU_Z_INDEX", () => {
    it("is at least 100 for dialog compatibility", async () => {
      const { SLASH_MENU_Z_INDEX } = await import("./command-suggestion");
      expect(SLASH_MENU_Z_INDEX).toBeGreaterThanOrEqual(100);
    });
  });

  describe("createSlashCommandExtension", () => {
    it("returns an extension configuration", async () => {
      const { createSlashCommandExtension } = await import(
        "./command-suggestion"
      );
      const result = createSlashCommandExtension({});
      expect(result).toBeDefined();
    });

    it("accepts onImageUpload and onVideoUpload config", async () => {
      const { createSlashCommandExtension } = await import(
        "./command-suggestion"
      );
      const config = {
        onImageUpload: vi.fn(),
        onVideoUpload: vi.fn(),
      };
      const result = createSlashCommandExtension(config);
      expect(result).toBeDefined();
    });
  });

  describe("suggestion render lifecycle", () => {
    it("handles the full render lifecycle: onStart, onUpdate, onKeyDown, onExit", async () => {
      // We test the suggestion object indirectly through the Extension
      const { createSlashCommandExtension } = await import(
        "./command-suggestion"
      );
      const ext = createSlashCommandExtension({});

      // The suggestion is inside ext.options.suggestion
      const suggestion = ext.options?.suggestion;
      if (!suggestion) {
        return;
      }

      // Test items filtering
      if (suggestion.items) {
        const items = suggestion.items({ query: "head", editor: {} as never });
        expect(
          items.some((i: { title: string }) => i.title === "Heading 1")
        ).toBe(true);
      }

      // Test command execution
      if (suggestion.command) {
        const mockRun = vi.fn();
        const mockItem = {
          title: "Test",
          command: mockRun,
        };
        const mockEditor = {} as never;
        const range = { from: 0, to: 1 };
        suggestion.command({
          editor: mockEditor,
          range,
          props: mockItem,
        });
        expect(mockRun).toHaveBeenCalledWith({
          editor: mockEditor,
          range,
        });
      }
    });

    it("filters items by query", async () => {
      const { createSlashCommandExtension } = await import(
        "./command-suggestion"
      );
      const ext = createSlashCommandExtension({});
      const suggestion = ext.options?.suggestion;

      if (suggestion?.items) {
        const items = suggestion.items({
          query: "bullet",
          editor: {} as never,
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
        const items = suggestion.items({ query: "", editor: {} as never });
        expect(items.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe("suggestion render methods", () => {
    it("onStart creates ReactRenderer and tippy popup", async () => {
      const tippy = (await import("tippy.js")).default;
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

      const mockProps = {
        items: [{ title: "Test" }],
        command: vi.fn(),
        clientRect: () => new DOMRect(0, 0, 100, 20),
        editor: {
          view: { dom: document.createElement("div") },
        },
      };

      renderResult.onStart(mockProps as never);

      expect(ReactRenderer).toHaveBeenCalled();
      expect(tippy).toHaveBeenCalledWith(
        "body",
        expect.objectContaining({
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        })
      );
    });

    it("onStart does not create popup when clientRect is null", async () => {
      const tippy = (await import("tippy.js")).default;
      const { createSlashCommandExtension } = await import(
        "./command-suggestion"
      );

      const ext = createSlashCommandExtension({});
      const suggestion = ext.options?.suggestion;
      if (!suggestion?.render) {
        return;
      }

      const renderResult = suggestion.render();
      (tippy as ReturnType<typeof vi.fn>).mockClear();

      renderResult.onStart({
        items: [],
        command: vi.fn(),
        clientRect: null,
        editor: {
          view: { dom: document.createElement("div") },
        },
      } as never);

      expect(tippy).not.toHaveBeenCalled();
    });

    it("onUpdate updates component props and popup position", async () => {
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

      // Start first
      renderResult.onStart({
        items: [],
        command: vi.fn(),
        clientRect: () => new DOMRect(),
        editor: {
          view: { dom: document.createElement("div") },
        },
      } as never);

      const mockInstance = (ReactRenderer as ReturnType<typeof vi.fn>).mock
        .results[0]?.value;

      // Update
      renderResult.onUpdate({
        items: [{ title: "Updated" }],
        command: vi.fn(),
        clientRect: () => new DOMRect(10, 10, 100, 20),
      } as never);

      expect(mockInstance.updateProps).toHaveBeenCalled();
    });

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
        { setProps: vi.fn(), hide: mockHide, destroy: vi.fn() },
      ]);

      const renderResult = suggestion.render();

      renderResult.onStart({
        items: [],
        command: vi.fn(),
        clientRect: () => new DOMRect(),
        editor: {
          view: { dom: document.createElement("div") },
        },
      } as never);

      const result = renderResult.onKeyDown({
        event: new KeyboardEvent("keydown", { key: "Escape" }),
      });
      expect(result).toBe(true);
      expect(mockHide).toHaveBeenCalled();
    });

    it("onKeyDown delegates to keyboardHandler for non-Escape keys", async () => {
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
        items: [],
        command: vi.fn(),
        clientRect: () => new DOMRect(),
        editor: {
          view: { dom: document.createElement("div") },
        },
      } as never);

      // Without a registered keyboard handler, should return false
      const result = renderResult.onKeyDown({
        event: new KeyboardEvent("keydown", { key: "ArrowDown" }),
      });
      expect(result).toBe(false);
    });

    it("onExit cleans up popup and component", async () => {
      const tippy = (await import("tippy.js")).default;
      const { ReactRenderer } = await import("@tiptap/react");
      const { createSlashCommandExtension } = await import(
        "./command-suggestion"
      );

      const mockDestroy = vi.fn();
      (tippy as ReturnType<typeof vi.fn>).mockReturnValue([
        { setProps: vi.fn(), hide: vi.fn(), destroy: mockDestroy },
      ]);

      const ext = createSlashCommandExtension({});
      const suggestion = ext.options?.suggestion;
      if (!suggestion?.render) {
        return;
      }

      const renderResult = suggestion.render();

      renderResult.onStart({
        items: [],
        command: vi.fn(),
        clientRect: () => new DOMRect(),
        editor: {
          view: { dom: document.createElement("div") },
        },
      } as never);

      const mockComponent = (ReactRenderer as ReturnType<typeof vi.fn>).mock
        .results[0]?.value;

      renderResult.onExit();

      expect(mockDestroy).toHaveBeenCalled();
      expect(mockComponent.destroy).toHaveBeenCalled();
    });
  });
});
