import {
  isTagColor,
  TAG_COLORS,
} from "@reflet/backend/convex/feedback/tag_colors";
import { describe, expect, it } from "vitest";
import {
  getTagColorValues,
  getTagDotColor,
  getTagSwatchClass,
} from "./tag-colors";

const HARDCODED_COLOR = /#|dark:|rgb\(|oklch\(/;

describe("isTagColor", () => {
  it("returns false for invalid color strings", () => {
    expect(isTagColor("")).toBe(false);
    expect(isTagColor("invalid")).toBe(false);
    expect(isTagColor("RED")).toBe(false);
    expect(isTagColor("Blue")).toBe(false);
    expect(isTagColor("#ff0000")).toBe(false);
    expect(isTagColor(" red")).toBe(false);
  });
});

describe("getTagColorValues", () => {
  it("returns token-backed bg and text for valid named colors", () => {
    const result = getTagColorValues("red");
    expect(result.bg).toBe(
      "color-mix(in oklab, var(--tag-red) 15%, transparent)"
    );
    expect(result.text).toBe("var(--tag-red-text)");
  });

  it("maps gray and default onto the muted surface", () => {
    for (const color of ["gray", "default"]) {
      const result = getTagColorValues(color);
      expect(result.bg).toBe("var(--muted)");
      expect(result.text).toBe("var(--muted-foreground)");
    }
  });

  it("gives every chromatic name a distinct token pair", () => {
    const chromatic = TAG_COLORS.filter(
      (color) => color !== "gray" && color !== "default"
    );
    const texts = chromatic.map((color) => getTagColorValues(color).text);
    expect(new Set(texts).size).toBe(chromatic.length);
  });

  it("never emits a raw colour literal", () => {
    for (const color of TAG_COLORS) {
      const { bg, text } = getTagColorValues(color);
      expect(`${bg} ${text}`).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(|oklch\(/i);
    }
  });

  it("falls back to default for invalid color names", () => {
    const result = getTagColorValues("nonexistent");
    const defaultResult = getTagColorValues("default");
    expect(result).toEqual(defaultResult);
  });

  it("falls back to default for unknown hex colors", () => {
    const result = getTagColorValues("#123456");
    const defaultResult = getTagColorValues("default");
    expect(result).toEqual(defaultResult);
  });
});

describe("getTagDotColor", () => {
  it("returns the token-backed text colour for valid named colors", () => {
    expect(getTagDotColor("red")).toBe("var(--tag-red-text)");
  });

  it("falls back to the muted foreground for anything outside the palette", () => {
    expect(getTagDotColor("#3b82f6")).toBe("var(--muted-foreground)");
  });

  it("returns the muted foreground for 'default'", () => {
    expect(getTagDotColor("default")).toBe("var(--muted-foreground)");
  });
});

describe("getTagSwatchClass", () => {
  it("returns the dedicated tag palette classes for valid colors", () => {
    expect(getTagSwatchClass("blue")).toBe("bg-tag-blue border-tag-blue");
    expect(getTagSwatchClass("red")).toBe("bg-tag-red border-tag-red");
    expect(getTagSwatchClass("brown")).toBe("bg-tag-brown border-tag-brown");
    expect(getTagSwatchClass("yellow")).toBe("bg-tag-yellow border-tag-yellow");
    expect(getTagSwatchClass("gray")).toBe("bg-muted border-border");
  });

  it("falls back to default class for invalid color", () => {
    expect(getTagSwatchClass("nope")).toBe(getTagSwatchClass("default"));
  });

  it("gives every chromatic name its own distinct classes", () => {
    const seen: Record<string, true> = {};
    for (const color of TAG_COLORS) {
      if (color === "default" || color === "gray") {
        continue;
      }
      const classes = getTagSwatchClass(color);
      expect(seen[classes]).toBeUndefined();
      seen[classes] = true;
    }
  });

  it("never emits a hardcoded color or a dark variant", () => {
    for (const color of TAG_COLORS) {
      expect(getTagSwatchClass(color)).not.toMatch(HARDCODED_COLOR);
    }
  });
});
