import { describe, expect, it, vi } from "vitest";
import {
  createImageNodeView,
  type ImageNodeViewOptions,
} from "./editor-extensions";

const createMockNode = (
  attrs: Partial<ImageNodeViewOptions["node"]["attrs"]> = {}
): ImageNodeViewOptions["node"] => ({
  attrs: {
    src: "https://example.com/image.png",
    alt: "test image",
    title: "",
    align: "center",
    width: null,
    ...attrs,
  },
});

const createMockEditor = (
  isEditable: boolean
): ImageNodeViewOptions["editor"] => ({
  isEditable,
  chain: () => ({
    focus: () => ({
      updateAttributes: () => ({ run: vi.fn() }),
    }),
  }),
});

describe("Image NodeView", () => {
  it("includes resize handles when editor is editable", () => {
    const { dom } = createImageNodeView({
      node: createMockNode(),
      editor: createMockEditor(true),
      getPos: () => 0,
    });

    const resizeHandles = dom.querySelectorAll(".tiptap-resize-handle");
    expect(resizeHandles.length).toBeGreaterThan(0);
  });

  it("does not include resize handles when editor is not editable", () => {
    const { dom } = createImageNodeView({
      node: createMockNode(),
      editor: createMockEditor(false),
      getPos: () => 0,
    });

    const resizeHandles = dom.querySelectorAll(".tiptap-resize-handle");
    expect(resizeHandles.length).toBe(0);
  });

  it("always renders the image element regardless of editable state", () => {
    const { dom } = createImageNodeView({
      node: createMockNode({ src: "https://example.com/photo.jpg" }),
      editor: createMockEditor(false),
      getPos: () => 0,
    });

    const img = dom.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.src).toBe("https://example.com/photo.jpg");
  });
});
