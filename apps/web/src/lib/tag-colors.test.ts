import { describe, expect, it } from "vitest";
import {
  getColorBadgeStyles,
  getRandomTagColor,
  getTagBgColor,
  getTagColorStyles,
  getTagColorValues,
  getTagDotColor,
  getTagSwatchClass,
  getTagTextClass,
  getTagTextColor,
  isValidTagColor,
  migrateHexToNamedColor,
  TAG_COLOR_LABELS,
  TAG_COLORS,
} from "./tag-colors";

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
  it("returns bg and text for valid named colors (light mode)", () => {
    const result = getTagColorValues("red");
    expect(result.bg).toBe("#ffe2dd");
    expect(result.text).toBe("#e03e3e");
  });

  it("returns dark mode values when isDark is true", () => {
    const result = getTagColorValues("red", true);
    expect(result.bg).toBe("rgba(234, 87, 82, 0.15)");
    expect(result.text).toBe("#df5452");
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

  it("returns correct values for every named color in light mode", () => {
    for (const color of TAG_COLORS) {
      const result = getTagColorValues(color);
      expect(result).toHaveProperty("bg");
      expect(result).toHaveProperty("text");
      expect(typeof result.bg).toBe("string");
      expect(typeof result.text).toBe("string");
    }
  });
});

describe("getTagColorStyles", () => {
  it("returns CSSProperties with backgroundColor, color, and borderColor", () => {
    const styles = getTagColorStyles("blue");
    expect(styles.backgroundColor).toBe("#d3e5ef");
    expect(styles.color).toBe("#0b6e99");
    expect(styles.borderColor).toBe("#0b6e994d");
  });

  it("returns dark mode styles when isDark is true", () => {
    const styles = getTagColorStyles("blue", true);
    expect(styles.backgroundColor).toBe("rgba(82, 156, 202, 0.15)");
    expect(styles.color).toBe("#5e87c9");
  });

  it("falls back to default for invalid color", () => {
    const defaultStyles = getTagColorStyles("default");
    const invalidStyles = getTagColorStyles("xyz");
    expect(invalidStyles).toEqual(defaultStyles);
  });
});

describe("getColorBadgeStyles", () => {
  it("returns palette styles for valid named colors", () => {
    const styles = getColorBadgeStyles("green");
    expect(styles.backgroundColor).toBe("#dbeddb");
    expect(styles.color).toBe("#0f7b6c");
    expect(styles.borderColor).toBe("#0f7b6c30");
  });

  it("returns palette styles for 'default' color", () => {
    const styles = getColorBadgeStyles("default");
    expect(styles.backgroundColor).toBe("#f1f1ef");
    expect(styles.color).toBe("#787774");
  });

  it("returns alpha-based styles for unknown hex colors", () => {
    const hex = "#abcdef";
    const styles = getColorBadgeStyles(hex);
    expect(styles.backgroundColor).toBe("#abcdef15");
    expect(styles.color).toBe("#abcdef");
    expect(styles.borderColor).toBe("#abcdef30");
  });

  it("returns palette styles for known legacy hex colors", () => {
    const styles = getColorBadgeStyles("#ef4444");
    const redStyles = getColorBadgeStyles("red");
    expect(styles).toEqual(redStyles);
  });
});

describe("getTagBgColor", () => {
  it("returns background color in light mode", () => {
    expect(getTagBgColor("purple")).toBe("#e8deee");
  });

  it("returns background color in dark mode", () => {
    expect(getTagBgColor("purple", true)).toBe("rgba(154, 109, 215, 0.15)");
  });

  it("falls back to default for invalid color", () => {
    expect(getTagBgColor("invalid")).toBe(getTagBgColor("default"));
  });
});

describe("getTagTextColor", () => {
  it("returns text color in light mode", () => {
    expect(getTagTextColor("orange")).toBe("#d9730d");
  });

  it("returns text color in dark mode", () => {
    expect(getTagTextColor("orange", true)).toBe("#c77d48");
  });

  it("falls back to default for invalid color", () => {
    expect(getTagTextColor("invalid")).toBe(getTagTextColor("default"));
  });
});

describe("getTagDotColor", () => {
  it("returns text color for valid named colors", () => {
    expect(getTagDotColor("red")).toBe("#e03e3e");
  });

  it("returns dark text color when isDark is true", () => {
    expect(getTagDotColor("red", true)).toBe("#df5452");
  });

  it("returns text color for known hex via migration", () => {
    expect(getTagDotColor("#3b82f6")).toBe("#0b6e99");
  });

  it("returns the raw hex for unknown hex colors", () => {
    expect(getTagDotColor("#abcdef")).toBe("#abcdef");
  });

  it("returns default text color for 'default'", () => {
    expect(getTagDotColor("default")).toBe("#787774");
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

describe("getTagTextClass", () => {
  it("returns Tailwind class string for valid colors", () => {
    const cls = getTagTextClass("red");
    expect(cls).toContain("text-[#e03e3e]");
    expect(cls).toContain("dark:text-[#df5452]");
  });

  it("falls back to default class for invalid color", () => {
    expect(getTagTextClass("invalid")).toBe(getTagTextClass("default"));
  });
});

describe("getTagSwatchClass", () => {
  it("returns Tailwind class string for valid colors", () => {
    const cls = getTagSwatchClass("blue");
    expect(cls).toContain("bg-[#d3e5ef]");
  });

  it("falls back to default class for invalid color", () => {
    expect(getTagSwatchClass("nope")).toBe(getTagSwatchClass("default"));
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
