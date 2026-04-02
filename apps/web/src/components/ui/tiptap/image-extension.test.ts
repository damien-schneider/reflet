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

interface AttrSpec {
  default: unknown;
  parseHTML: (element: HTMLElement) => unknown;
  renderHTML: (attrs: Record<string, unknown>) => Record<string, unknown>;
}

async function importImageAttrs(): Promise<Record<string, AttrSpec>> {
  const { ImageExtension } = await import("./image-extension");
  return (ImageExtension as unknown as { attrs: Record<string, AttrSpec> })
    .attrs;
}

describe("ImageExtension", () => {
  it("exports ImageExtension", async () => {
    const { ImageExtension } = await import("./image-extension");
    expect(ImageExtension).toBeDefined();
  });

  it("defines width attribute with default null", async () => {
    const attrs = await importImageAttrs();
    expect(attrs.width).toBeDefined();
    expect(attrs.width.default).toBeNull();
  });

  it("defines height attribute with default null", async () => {
    const attrs = await importImageAttrs();
    expect(attrs.height).toBeDefined();
    expect(attrs.height.default).toBeNull();
  });

  it("defines align attribute with default center", async () => {
    const attrs = await importImageAttrs();
    expect(attrs.align).toBeDefined();
    expect(attrs.align.default).toBe("center");
  });

  describe("width attribute", () => {
    it("parseHTML extracts width from element", async () => {
      const attrs = await importImageAttrs();
      const element = document.createElement("img");
      element.setAttribute("width", "300");
      expect(attrs.width.parseHTML(element)).toBe("300");
    });

    it("renderHTML returns width when set", async () => {
      const attrs = await importImageAttrs();
      const result = attrs.width.renderHTML({ width: "400" });
      expect(result).toEqual({ width: "400" });
    });

    it("renderHTML returns empty object when width is null", async () => {
      const attrs = await importImageAttrs();
      const result = attrs.width.renderHTML({ width: null });
      expect(result).toEqual({});
    });
  });

  describe("height attribute", () => {
    it("parseHTML extracts height from element", async () => {
      const attrs = await importImageAttrs();
      const element = document.createElement("img");
      element.setAttribute("height", "200");
      expect(attrs.height.parseHTML(element)).toBe("200");
    });

    it("renderHTML returns height when set", async () => {
      const attrs = await importImageAttrs();
      const result = attrs.height.renderHTML({ height: "250" });
      expect(result).toEqual({ height: "250" });
    });

    it("renderHTML returns empty object when height is null", async () => {
      const attrs = await importImageAttrs();
      const result = attrs.height.renderHTML({ height: null });
      expect(result).toEqual({});
    });
  });

  describe("align attribute", () => {
    it("parseHTML reads data-align attribute", async () => {
      const attrs = await importImageAttrs();
      const element = document.createElement("img");
      element.setAttribute("data-align", "left");
      expect(attrs.align.parseHTML(element)).toBe("left");
    });

    it("parseHTML defaults to center when data-align is missing", async () => {
      const attrs = await importImageAttrs();
      const element = document.createElement("img");
      expect(attrs.align.parseHTML(element)).toBe("center");
    });

    it("renderHTML outputs data-align attribute", async () => {
      const attrs = await importImageAttrs();
      const result = attrs.align.renderHTML({ align: "right" });
      expect(result).toEqual({ "data-align": "right" });
    });
  });

  it("exports ImageAlignment type", async () => {
    // Just verifying the module can be imported with the type
    const mod = await import("./image-extension");
    expect(mod.ImageExtension).toBeDefined();
  });
});
