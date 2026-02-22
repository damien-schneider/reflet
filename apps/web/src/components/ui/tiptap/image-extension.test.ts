import { describe, expect, it, vi } from "vitest";

// Mock the base TiptapImage extension
vi.mock("@tiptap/extension-image", () => ({
  default: {
    extend: vi.fn((config: Record<string, unknown>) => {
      // Simulate the extended extension by running addAttributes
      const addAttributes = config.addAttributes as () => Record<
        string,
        unknown
      >;
      const attrs = addAttributes.call({
        parent: () => ({ src: {}, alt: {} }),
      });
      return {
        name: "image",
        attrs,
        configure: vi.fn(),
      };
    }),
  },
}));

describe("ImageExtension", () => {
  it("exports ImageExtension", async () => {
    const { ImageExtension } = await import("./image-extension");
    expect(ImageExtension).toBeDefined();
  });

  it("defines width attribute with default null", async () => {
    const { ImageExtension } = await import("./image-extension");
    expect(ImageExtension.attrs.width).toBeDefined();
    expect(ImageExtension.attrs.width.default).toBeNull();
  });

  it("defines height attribute with default null", async () => {
    const { ImageExtension } = await import("./image-extension");
    expect(ImageExtension.attrs.height).toBeDefined();
    expect(ImageExtension.attrs.height.default).toBeNull();
  });

  it("defines align attribute with default center", async () => {
    const { ImageExtension } = await import("./image-extension");
    expect(ImageExtension.attrs.align).toBeDefined();
    expect(ImageExtension.attrs.align.default).toBe("center");
  });

  describe("width attribute", () => {
    it("parseHTML extracts width from element", async () => {
      const { ImageExtension } = await import("./image-extension");
      const element = document.createElement("img");
      element.setAttribute("width", "300");
      expect(ImageExtension.attrs.width.parseHTML(element)).toBe("300");
    });

    it("renderHTML returns width when set", async () => {
      const { ImageExtension } = await import("./image-extension");
      const result = ImageExtension.attrs.width.renderHTML({ width: "400" });
      expect(result).toEqual({ width: "400" });
    });

    it("renderHTML returns empty object when width is null", async () => {
      const { ImageExtension } = await import("./image-extension");
      const result = ImageExtension.attrs.width.renderHTML({ width: null });
      expect(result).toEqual({});
    });
  });

  describe("height attribute", () => {
    it("parseHTML extracts height from element", async () => {
      const { ImageExtension } = await import("./image-extension");
      const element = document.createElement("img");
      element.setAttribute("height", "200");
      expect(ImageExtension.attrs.height.parseHTML(element)).toBe("200");
    });

    it("renderHTML returns height when set", async () => {
      const { ImageExtension } = await import("./image-extension");
      const result = ImageExtension.attrs.height.renderHTML({ height: "250" });
      expect(result).toEqual({ height: "250" });
    });

    it("renderHTML returns empty object when height is null", async () => {
      const { ImageExtension } = await import("./image-extension");
      const result = ImageExtension.attrs.height.renderHTML({ height: null });
      expect(result).toEqual({});
    });
  });

  describe("align attribute", () => {
    it("parseHTML reads data-align attribute", async () => {
      const { ImageExtension } = await import("./image-extension");
      const element = document.createElement("img");
      element.setAttribute("data-align", "left");
      expect(ImageExtension.attrs.align.parseHTML(element)).toBe("left");
    });

    it("parseHTML defaults to center when data-align is missing", async () => {
      const { ImageExtension } = await import("./image-extension");
      const element = document.createElement("img");
      expect(ImageExtension.attrs.align.parseHTML(element)).toBe("center");
    });

    it("renderHTML outputs data-align attribute", async () => {
      const { ImageExtension } = await import("./image-extension");
      const result = ImageExtension.attrs.align.renderHTML({ align: "right" });
      expect(result).toEqual({ "data-align": "right" });
    });
  });

  it("exports ImageAlignment type", async () => {
    // Just verifying the module can be imported with the type
    const mod = await import("./image-extension");
    expect(mod.ImageExtension).toBeDefined();
  });
});
