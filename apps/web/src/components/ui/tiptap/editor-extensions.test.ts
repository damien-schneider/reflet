import { describe, expect, it, vi } from "vitest";
import {
  createEditorProps,
  createExtensions,
  createImageNodeView,
  type ImageNodeViewOptions,
} from "./editor-extensions";

const createMockNode = (
  attrs: Partial<ImageNodeViewOptions["node"]["attrs"]> = {}
): ImageNodeViewOptions["node"] => ({
  attrs: {
    align: "center",
    alt: "test image",
    src: "https://example.com/image.png",
    title: "",
    width: null,
    ...attrs,
  },
});

const createMockEditor = (
  isEditable: boolean
): ImageNodeViewOptions["editor"] => ({
  chain: () => ({
    focus: () => ({
      updateAttributes: () => ({ run: vi.fn() }),
    }),
  }),
  isEditable,
});

describe("Image NodeView", () => {
  it("includes resize handles when editor is editable", () => {
    const { dom } = createImageNodeView({
      editor: createMockEditor(true),
      getPos: () => 0,
      node: createMockNode(),
    });

    const resizeHandles = dom.querySelectorAll(".tiptap-resize-handle");
    expect(resizeHandles.length).toBeGreaterThan(0);
  });

  it("does not include resize handles when editor is not editable", () => {
    const { dom } = createImageNodeView({
      editor: createMockEditor(false),
      getPos: () => 0,
      node: createMockNode(),
    });

    const resizeHandles = dom.querySelectorAll(".tiptap-resize-handle");
    expect(resizeHandles.length).toBe(0);
  });

  it("always renders the image element regardless of editable state", () => {
    const { dom } = createImageNodeView({
      editor: createMockEditor(false),
      getPos: () => 0,
      node: createMockNode({ src: "https://example.com/photo.jpg" }),
    });

    const img = dom.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.src).toBe("https://example.com/photo.jpg");
  });

  it("update returns false for non-image nodes", () => {
    const { update } = createImageNodeView({
      editor: createMockEditor(true),
      getPos: () => 0,
      node: createMockNode(),
    });
    const result = update({ attrs: {}, type: { name: "paragraph" } });
    expect(result).toBe(false);
  });

  it("update returns true and updates attrs for image nodes", () => {
    const { dom, update } = createImageNodeView({
      editor: createMockEditor(true),
      getPos: () => 0,
      node: createMockNode(),
    });
    const result = update({
      attrs: {
        align: "left",
        alt: "new",
        src: "https://example.com/new.png",
        width: 200,
      },
      type: { name: "image" },
    });
    expect(result).toBe(true);
    const img = dom.querySelector("img");
    expect(img?.src).toBe("https://example.com/new.png");
    expect(img?.alt).toBe("new");
    expect(img?.style.width).toBe("200px");
  });

  it("destroy removes event listeners without error", () => {
    const { destroy } = createImageNodeView({
      editor: createMockEditor(true),
      getPos: () => 0,
      node: createMockNode(),
    });
    expect(() => destroy()).not.toThrow();
  });

  it("destroy is safe for non-editable views", () => {
    const { destroy } = createImageNodeView({
      editor: createMockEditor(false),
      getPos: () => 0,
      node: createMockNode(),
    });
    expect(() => destroy()).not.toThrow();
  });

  it("creates error placeholder element", () => {
    const { dom } = createImageNodeView({
      editor: createMockEditor(false),
      getPos: () => 0,
      node: createMockNode(),
    });
    const errorEl = dom.querySelector(".tiptap-image-error");
    expect(errorEl).not.toBeNull();
    expect(errorEl?.textContent).toContain("Image unavailable");
  });

  it("applies width style when provided", () => {
    const { dom } = createImageNodeView({
      editor: createMockEditor(false),
      getPos: () => 0,
      node: createMockNode({ width: 300 }),
    });
    const img = dom.querySelector("img");
    expect(img?.style.width).toBe("300px");
  });

  it("sets data-align attribute", () => {
    const { dom } = createImageNodeView({
      editor: createMockEditor(false),
      getPos: () => 0,
      node: createMockNode({ align: "left" }),
    });
    expect(dom.getAttribute("data-align")).toBe("left");
  });
});

describe("createExtensions", () => {
  it("returns an array of extensions", () => {
    const result = createExtensions({
      onImageUpload: vi.fn(),
      onVideoUpload: vi.fn(),
      placeholder: "Write something...",
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes CharacterCount when maxLength is provided", () => {
    const result = createExtensions({
      maxLength: 500,
      onImageUpload: vi.fn(),
      onVideoUpload: vi.fn(),
      placeholder: "Write...",
    });
    const hasCharCount = result.some((ext) => ext.name === "characterCount");
    expect(hasCharCount).toBe(true);
  });

  it("excludes CharacterCount when maxLength is not provided", () => {
    const result = createExtensions({
      onImageUpload: vi.fn(),
      onVideoUpload: vi.fn(),
      placeholder: "Write...",
    });
    const hasCharCount = result.some((ext) => ext.name === "characterCount");
    expect(hasCharCount).toBe(false);
  });

  it("includes submit shortcut when onSubmit is provided", () => {
    const result = createExtensions({
      onImageUpload: vi.fn(),
      onSubmit: vi.fn(),
      onVideoUpload: vi.fn(),
      placeholder: "Write...",
    });
    const hasSubmit = result.some((ext) => ext.name === "submitShortcut");
    expect(hasSubmit).toBe(true);
  });

  it("excludes submit shortcut when onSubmit is not provided", () => {
    const result = createExtensions({
      onImageUpload: vi.fn(),
      onVideoUpload: vi.fn(),
      placeholder: "Write...",
    });
    const hasSubmit = result.some((ext) => ext.name === "submitShortcut");
    expect(hasSubmit).toBe(false);
  });
});

describe("createEditorProps", () => {
  it("returns minimal class when minimal is true", () => {
    const props = createEditorProps({
      minimal: true,
      uploadMedia: vi.fn(),
    });
    expect(props.attributes.class).toContain("tiptap-minimal-editor");
  });

  it("returns full class when minimal is false", () => {
    const props = createEditorProps({
      minimal: false,
      uploadMedia: vi.fn(),
    });
    expect(props.attributes.class).toContain("tiptap-markdown-editor");
  });

  it("handlePaste uploads image files", () => {
    const uploadMedia = vi.fn();
    const props = createEditorProps({ minimal: false, uploadMedia });
    const mockFile = new File([""], "test.png", { type: "image/png" });
    const event = {
      clipboardData: {
        items: [{ getAsFile: () => mockFile, type: "image/png" }],
      },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;

    const result = props.handlePaste(null, event);
    expect(result).toBe(true);
    expect(uploadMedia).toHaveBeenCalledWith(mockFile);
  });

  it("handlePaste returns false for non-media items", () => {
    const uploadMedia = vi.fn();
    const props = createEditorProps({ minimal: false, uploadMedia });
    const event = {
      clipboardData: {
        items: [{ getAsFile: () => null, type: "text/plain" }],
      },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;

    const result = props.handlePaste(null, event);
    expect(result).toBe(false);
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it("handleDrop uploads dropped image files", () => {
    const uploadMedia = vi.fn();
    const props = createEditorProps({ minimal: false, uploadMedia });
    const mockFile = new File([""], "photo.jpg", { type: "image/jpeg" });
    const event = {
      dataTransfer: { files: [mockFile] },
      preventDefault: vi.fn(),
    } as unknown as DragEvent;

    const result = props.handleDrop(null, event, null, false);
    expect(result).toBe(true);
    expect(uploadMedia).toHaveBeenCalledWith(mockFile);
  });

  it("handleDrop returns false when moved", () => {
    const uploadMedia = vi.fn();
    const props = createEditorProps({ minimal: false, uploadMedia });
    const event = {
      dataTransfer: { files: [] },
      preventDefault: vi.fn(),
    } as unknown as DragEvent;

    const result = props.handleDrop(null, event, null, true);
    expect(result).toBe(false);
  });

  it("handleDrop uploads video files", () => {
    const uploadMedia = vi.fn();
    const props = createEditorProps({ minimal: false, uploadMedia });
    const mockFile = new File([""], "clip.mp4", { type: "video/mp4" });
    const event = {
      dataTransfer: { files: [mockFile] },
      preventDefault: vi.fn(),
    } as unknown as DragEvent;

    const result = props.handleDrop(null, event, null, false);
    expect(result).toBe(true);
    expect(uploadMedia).toHaveBeenCalledWith(mockFile);
  });

  it("handlePaste uploads video files", () => {
    const uploadMedia = vi.fn();
    const props = createEditorProps({ minimal: false, uploadMedia });
    const mockFile = new File([""], "clip.mp4", { type: "video/mp4" });
    const event = {
      clipboardData: {
        items: [{ getAsFile: () => mockFile, type: "video/mp4" }],
      },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;

    const result = props.handlePaste(null, event);
    expect(result).toBe(true);
    expect(uploadMedia).toHaveBeenCalledWith(mockFile);
  });

  it("handleDrop returns false when no files", () => {
    const uploadMedia = vi.fn();
    const props = createEditorProps({ minimal: false, uploadMedia });
    const event = {
      dataTransfer: { files: [] },
      preventDefault: vi.fn(),
    } as unknown as DragEvent;

    const result = props.handleDrop(null, event, null, false);
    expect(result).toBe(false);
  });

  it("handleDrop returns false for non-media files", () => {
    const uploadMedia = vi.fn();
    const props = createEditorProps({ minimal: false, uploadMedia });
    const mockFile = new File([""], "doc.pdf", { type: "application/pdf" });
    const event = {
      dataTransfer: { files: [mockFile] },
      preventDefault: vi.fn(),
    } as unknown as DragEvent;

    const result = props.handleDrop(null, event, null, false);
    expect(result).toBe(false);
  });

  it("handlePaste returns false when no clipboardData", () => {
    const uploadMedia = vi.fn();
    const props = createEditorProps({ minimal: false, uploadMedia });
    const event = {
      clipboardData: null,
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;

    const result = props.handlePaste(null, event);
    expect(result).toBe(false);
  });
});

describe("Image NodeView - error/load events", () => {
  it("hides image and shows error placeholder on image error", () => {
    const { dom } = createImageNodeView({
      editor: createMockEditor(false),
      getPos: () => 0,
      node: createMockNode({ src: "https://example.com/broken.png" }),
    });
    const img = dom.querySelector("img")!;
    img.dispatchEvent(new Event("error"));
    expect(img.style.display).toBe("none");
    const errorEl = dom.querySelector(".tiptap-image-error");
    expect(errorEl?.getAttribute("style")).toContain("flex");
  });

  it("shows image and hides error on image load", () => {
    const { dom } = createImageNodeView({
      editor: createMockEditor(false),
      getPos: () => 0,
      node: createMockNode(),
    });
    const img = dom.querySelector("img")!;
    // Simulate error then load
    img.dispatchEvent(new Event("error"));
    img.dispatchEvent(new Event("load"));
    expect(img.style.display).toBe("block");
    expect(dom.hasAttribute("data-error")).toBe(false);
  });

  it("resets error state when update receives new src", () => {
    const { dom, update } = createImageNodeView({
      editor: createMockEditor(true),
      getPos: () => 0,
      node: createMockNode(),
    });
    const img = dom.querySelector("img")!;
    // Simulate error
    img.dispatchEvent(new Event("error"));
    expect(dom.getAttribute("data-error")).toBe("true");

    // Update with new src
    update({
      attrs: {
        align: "center",
        alt: "",
        src: "https://example.com/new.png",
        width: null,
      },
      type: { name: "image" },
    });
    expect(img.style.display).toBe("block");
    expect(dom.hasAttribute("data-error")).toBe(false);
  });

  it("does not reset error state when update has same src", () => {
    const { dom, update } = createImageNodeView({
      editor: createMockEditor(true),
      getPos: () => 0,
      node: createMockNode({ src: "https://example.com/image.png" }),
    });
    const img = dom.querySelector("img")!;
    img.dispatchEvent(new Event("error"));

    update({
      attrs: {
        align: "center",
        alt: "",
        src: "https://example.com/image.png",
        width: null,
      },
      type: { name: "image" },
    });
    // Error placeholder is NOT reset because src didn't change
    expect(img.style.display).toBe("none");
  });

  it("update without width does not set width style", () => {
    const { dom, update } = createImageNodeView({
      editor: createMockEditor(true),
      getPos: () => 0,
      node: createMockNode({ width: 200 }),
    });
    update({
      attrs: {
        align: "center",
        alt: "",
        src: "https://example.com/new.png",
        width: null,
      },
      type: { name: "image" },
    });
    const img = dom.querySelector("img")!;
    // Width should still be from previous state since update only sets if width exists
    expect(img.src).toBe("https://example.com/new.png");
  });
});

describe("Image NodeView - resize interactions", () => {
  const createResizableView = (width = 200) => {
    const mockRun = vi.fn();
    const editor = {
      chain: () => ({
        focus: () => ({
          updateAttributes: () => ({ run: mockRun }),
        }),
      }),
      isEditable: true,
    };
    const { dom, destroy } = createImageNodeView({
      editor,
      getPos: () => 0,
      node: createMockNode({ width }),
    });
    const img = dom.querySelector("img")!;
    Object.defineProperty(img, "offsetWidth", {
      configurable: true,
      value: width,
    });
    Object.defineProperty(img, "offsetHeight", {
      configurable: true,
      value: width / 2,
    });
    return { destroy, dom, img, mockRun };
  };

  it("mousedown on resize handle sets data-resizing attribute", () => {
    const { dom } = createResizableView();
    const handle = dom.querySelector(".tiptap-resize-handle.bottom-right")!;
    handle.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      })
    );
    expect(dom.getAttribute("data-resizing")).toBe("true");
    // Clean up
    document.dispatchEvent(new MouseEvent("mouseup"));
  });

  it("mouse drag resizes image width", () => {
    const { dom, img } = createResizableView();
    const handle = dom.querySelector(".tiptap-resize-handle.bottom-right")!;

    handle.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      })
    );
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 150, clientY: 100 })
    );

    const newWidth = Number.parseInt(img.style.width, 10);
    expect(newWidth).toBeGreaterThan(200);

    document.dispatchEvent(new MouseEvent("mouseup"));
  });

  it("mouseup ends resize and calls editor updateAttributes", () => {
    const { dom, mockRun } = createResizableView();
    const handle = dom.querySelector(".tiptap-resize-handle.bottom-right")!;

    handle.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      })
    );
    document.dispatchEvent(new MouseEvent("mouseup"));

    expect(dom.getAttribute("data-resizing")).toBeNull();
    expect(mockRun).toHaveBeenCalled();
  });

  it("resize enforces minimum width", () => {
    const { img } = createResizableView(100);
    const handle = img
      .closest(".tiptap-image-wrapper")!
      .querySelector(".tiptap-resize-handle.bottom-left")!;

    handle.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        clientX: 200,
        clientY: 200,
      })
    );
    // Move far left to shrink below minimum
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 500, clientY: 200 })
    );

    const newWidth = Number.parseInt(img.style.width, 10);
    expect(newWidth).toBeGreaterThanOrEqual(50);

    document.dispatchEvent(new MouseEvent("mouseup"));
  });

  it("touchstart on resize handle starts resize", () => {
    const { dom } = createResizableView();
    const handle = dom.querySelector(".tiptap-resize-handle.bottom-right")!;

    const touchEvent = new Event("touchstart", {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(touchEvent, "touches", {
      value: [{ clientX: 100, clientY: 100 }],
    });
    Object.defineProperty(touchEvent, "preventDefault", { value: vi.fn() });
    Object.defineProperty(touchEvent, "stopPropagation", { value: vi.fn() });
    handle.dispatchEvent(touchEvent);

    expect(dom.getAttribute("data-resizing")).toBe("true");

    const endEvent = new Event("touchend", { bubbles: true });
    Object.defineProperty(endEvent, "touches", { value: [] });
    document.dispatchEvent(endEvent);
  });

  it("touch drag resizes and touchend saves", () => {
    const { dom, img, mockRun } = createResizableView();
    const handle = dom.querySelector(".tiptap-resize-handle.bottom-right")!;

    const startEvent = new Event("touchstart", {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(startEvent, "touches", {
      value: [{ clientX: 100, clientY: 100 }],
    });
    Object.defineProperty(startEvent, "preventDefault", { value: vi.fn() });
    Object.defineProperty(startEvent, "stopPropagation", { value: vi.fn() });
    handle.dispatchEvent(startEvent);

    const moveEvent = new Event("touchmove", { cancelable: true });
    Object.defineProperty(moveEvent, "touches", {
      value: [{ clientX: 160, clientY: 100 }],
    });
    Object.defineProperty(moveEvent, "preventDefault", { value: vi.fn() });
    document.dispatchEvent(moveEvent);

    const newWidth = Number.parseInt(img.style.width, 10);
    expect(newWidth).toBeGreaterThan(200);

    const endEvent = new Event("touchend", { bubbles: true });
    Object.defineProperty(endEvent, "touches", { value: [] });
    document.dispatchEvent(endEvent);
    expect(mockRun).toHaveBeenCalled();
  });

  it("touchcancel ends resize", () => {
    const { dom, mockRun } = createResizableView();
    const handle = dom.querySelector(".tiptap-resize-handle.bottom-right")!;

    const startEvent = new Event("touchstart", {
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(startEvent, "touches", {
      value: [{ clientX: 100, clientY: 100 }],
    });
    Object.defineProperty(startEvent, "preventDefault", { value: vi.fn() });
    Object.defineProperty(startEvent, "stopPropagation", { value: vi.fn() });
    handle.dispatchEvent(startEvent);

    const cancelEvent = new Event("touchcancel", { bubbles: true });
    Object.defineProperty(cancelEvent, "touches", { value: [] });
    document.dispatchEvent(cancelEvent);

    expect(dom.getAttribute("data-resizing")).toBeNull();
    expect(mockRun).toHaveBeenCalled();
  });

  it("destroy removes document event listeners", () => {
    const { destroy } = createResizableView();
    expect(() => destroy()).not.toThrow();
  });

  it("getPos returning undefined skips editor update", () => {
    const mockRun = vi.fn();
    const editor = {
      chain: () => ({
        focus: () => ({
          updateAttributes: () => ({ run: mockRun }),
        }),
      }),
      isEditable: true,
    };
    const { dom } = createImageNodeView({
      editor,
      getPos: () => undefined,
      node: createMockNode({ width: 200 }),
    });
    const img = dom.querySelector("img")!;
    Object.defineProperty(img, "offsetWidth", { value: 200 });
    Object.defineProperty(img, "offsetHeight", { value: 100 });

    const handle = dom.querySelector(".tiptap-resize-handle.bottom-right")!;
    handle.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      })
    );
    document.dispatchEvent(new MouseEvent("mouseup"));

    expect(mockRun).not.toHaveBeenCalled();
  });
});
