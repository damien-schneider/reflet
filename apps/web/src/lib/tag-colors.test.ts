import { describe, expect, it } from "vitest";
import {
  getRandomTagColor,
  getTagColorValues,
  getTagDotColor,
  getTagSwatchClass,
  getTagTextColor,
  isValidTagColor,
  migrateHexToNamedColor,
  TAG_COLOR_LABELS,
  TAG_COLORS,
} from "./tag-colors";

const HARDCODED_COLOR = /#|dark:|rgb\(|oklch\(/;

describe("TAG_COLORS", () => {
  it("contains exactly 10 colors", () => {
    expect(TAG_COLORS).toHaveLength(10);
  });

  it("contains all expected colors", () => {
    const expected = [
      "default",
      "gray",
      "brown",
      "orange",
      "yellow",
      "green",
      "blue",
      "purple",
      "pink",
      "red",
    ];
    expect([...TAG_COLORS]).toEqual(expected);
  });
});

describe("TAG_COLOR_LABELS", () => {
  it("has a label for every TAG_COLOR", () => {
    for (const color of TAG_COLORS) {
      expect(TAG_COLOR_LABELS[color]).toBeDefined();
      expect(typeof TAG_COLOR_LABELS[color]).toBe("string");
    }
  });

  it("capitalizes labels correctly", () => {
    expect(TAG_COLOR_LABELS.default).toBe("Default");
    expect(TAG_COLOR_LABELS.red).toBe("Red");
    expect(TAG_COLOR_LABELS.blue).toBe("Blue");
  });
});

describe("isValidTagColor", () => {
  it("returns true for all valid tag colors", () => {
    for (const color of TAG_COLORS) {
      expect(isValidTagColor(color)).toBe(true);
    }
  });

  it("returns false for invalid color strings", () => {
    expect(isValidTagColor("")).toBe(false);
    expect(isValidTagColor("invalid")).toBe(false);
    expect(isValidTagColor("RED")).toBe(false);
    expect(isValidTagColor("Blue")).toBe(false);
    expect(isValidTagColor("#ff0000")).toBe(false);
    expect(isValidTagColor(" red")).toBe(false);
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

  it("resolves known hex colors via migration", () => {
    const result = getTagColorValues("#ef4444");
    const redResult = getTagColorValues("red");
    expect(result).toEqual(redResult);
  });

  it("falls back to default for unknown hex colors", () => {
    const result = getTagColorValues("#123456");
    const defaultResult = getTagColorValues("default");
    expect(result).toEqual(defaultResult);
  });

  it("returns a bg and text string for every named color", () => {
    for (const color of TAG_COLORS) {
      const result = getTagColorValues(color);
      expect(typeof result.bg).toBe("string");
      expect(typeof result.text).toBe("string");
    }
  });
});

describe("getTagTextColor", () => {
  it("returns the token-backed text colour", () => {
    expect(getTagTextColor("orange")).toBe("var(--tag-orange-text)");
  });

  it("falls back to default for invalid color", () => {
    expect(getTagTextColor("invalid")).toBe(getTagTextColor("default"));
  });
});

describe("getTagDotColor", () => {
  it("returns the token-backed text colour for valid named colors", () => {
    expect(getTagDotColor("red")).toBe("var(--tag-red-text)");
  });

  it("returns the token-backed text colour for known hex via migration", () => {
    expect(getTagDotColor("#3b82f6")).toBe("var(--tag-blue-text)");
  });

  it("returns the raw hex for unknown hex colors", () => {
    expect(getTagDotColor("#abcdef")).toBe("#abcdef");
  });

  it("returns the muted foreground for 'default'", () => {
    expect(getTagDotColor("default")).toBe("var(--muted-foreground)");
  });
});

describe("getRandomTagColor", () => {
  it("returns a valid tag color", () => {
    const color = getRandomTagColor();
    expect(isValidTagColor(color)).toBe(true);
  });

  it("never returns 'default'", () => {
    for (let i = 0; i < 100; i++) {
      expect(getRandomTagColor()).not.toBe("default");
    }
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

describe("migrateHexToNamedColor", () => {
  it("maps known hex values to named colors", () => {
    expect(migrateHexToNamedColor("#ef4444")).toBe("red");
    expect(migrateHexToNamedColor("#f97316")).toBe("orange");
    expect(migrateHexToNamedColor("#eab308")).toBe("yellow");
    expect(migrateHexToNamedColor("#22c55e")).toBe("green");
    expect(migrateHexToNamedColor("#14b8a6")).toBe("green");
    expect(migrateHexToNamedColor("#3b82f6")).toBe("blue");
    expect(migrateHexToNamedColor("#8b5cf6")).toBe("purple");
    expect(migrateHexToNamedColor("#a855f7")).toBe("purple");
    expect(migrateHexToNamedColor("#ec4899")).toBe("pink");
    expect(migrateHexToNamedColor("#6b7280")).toBe("gray");
  });

  it("is case-insensitive", () => {
    expect(migrateHexToNamedColor("#EF4444")).toBe("red");
    expect(migrateHexToNamedColor("#Ef4444")).toBe("red");
  });

  it("returns 'default' for unknown hex values", () => {
    expect(migrateHexToNamedColor("#000000")).toBe("default");
    expect(migrateHexToNamedColor("#ffffff")).toBe("default");
    expect(migrateHexToNamedColor("#123456")).toBe("default");
  });

  it("returns 'default' for empty string", () => {
    expect(migrateHexToNamedColor("")).toBe("default");
  });

  it("returns 'default' for non-hex strings", () => {
    expect(migrateHexToNamedColor("red")).toBe("default");
    expect(migrateHexToNamedColor("not-a-color")).toBe("default");
  });
});
