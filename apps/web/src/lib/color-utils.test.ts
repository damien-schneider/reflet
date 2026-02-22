import { describe, expect, it } from "vitest";
import type { ColorPalette } from "./color-utils";
import {
  generateColorCssVars,
  generateColorPalette,
  isValidHexColor,
  normalizeHexColor,
} from "./color-utils";

describe("isValidHexColor", () => {
  it("accepts 6-digit hex with #", () => {
    expect(isValidHexColor("#ff0000")).toBe(true);
    expect(isValidHexColor("#000000")).toBe(true);
    expect(isValidHexColor("#ffffff")).toBe(true);
    expect(isValidHexColor("#abcdef")).toBe(true);
  });

  it("accepts 6-digit hex without #", () => {
    expect(isValidHexColor("ff0000")).toBe(true);
    expect(isValidHexColor("ABCDEF")).toBe(true);
  });

  it("accepts 3-digit hex with #", () => {
    expect(isValidHexColor("#fff")).toBe(true);
    expect(isValidHexColor("#000")).toBe(true);
    expect(isValidHexColor("#abc")).toBe(true);
  });

  it("accepts 3-digit hex without #", () => {
    expect(isValidHexColor("fff")).toBe(true);
    expect(isValidHexColor("ABC")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isValidHexColor("#AbCdEf")).toBe(true);
    expect(isValidHexColor("AbCdEf")).toBe(true);
  });

  it("rejects invalid hex values", () => {
    expect(isValidHexColor("")).toBe(false);
    expect(isValidHexColor("#")).toBe(false);
    expect(isValidHexColor("#gg0000")).toBe(false);
    expect(isValidHexColor("#12345")).toBe(false);
    expect(isValidHexColor("#1234567")).toBe(false);
    expect(isValidHexColor("xyz")).toBe(false);
    expect(isValidHexColor("red")).toBe(false);
    expect(isValidHexColor("#ab")).toBe(false);
    expect(isValidHexColor("#abcd")).toBe(false);
  });
});

describe("normalizeHexColor", () => {
  it("adds # prefix if missing", () => {
    expect(normalizeHexColor("ff0000")).toBe("#ff0000");
  });

  it("keeps existing # prefix", () => {
    expect(normalizeHexColor("#ff0000")).toBe("#ff0000");
  });

  it("expands 3-digit hex to 6-digit", () => {
    expect(normalizeHexColor("#fff")).toBe("#ffffff");
    expect(normalizeHexColor("#000")).toBe("#000000");
    expect(normalizeHexColor("#abc")).toBe("#aabbcc");
    expect(normalizeHexColor("f0f")).toBe("#ff00ff");
  });

  it("keeps 6-digit hex unchanged", () => {
    expect(normalizeHexColor("#abcdef")).toBe("#abcdef");
    expect(normalizeHexColor("abcdef")).toBe("#abcdef");
  });
});

describe("generateColorPalette", () => {
  it("returns all expected properties", () => {
    const palette = generateColorPalette("#3b82f6");
    expect(palette).toHaveProperty("primary");
    expect(palette).toHaveProperty("primaryHover");
    expect(palette).toHaveProperty("primaryLight");
    expect(palette).toHaveProperty("primaryForeground");
  });

  it("sets primary to the original hex (with #)", () => {
    expect(generateColorPalette("#ff0000").primary).toBe("#ff0000");
    expect(generateColorPalette("ff0000").primary).toBe("#ff0000");
  });

  it("generates a darker hover color", () => {
    const palette = generateColorPalette("#3b82f6");
    // hover should be a valid hex
    expect(palette.primaryHover).toMatch(/^#[0-9a-f]{6}$/i);
    // hover should be different from primary
    expect(palette.primaryHover).not.toBe(palette.primary);
  });

  it("generates a light background color", () => {
    const palette = generateColorPalette("#3b82f6");
    expect(palette.primaryLight).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("returns white foreground for dark colors", () => {
    const palette = generateColorPalette("#000000");
    expect(palette.primaryForeground).toBe("#ffffff");

    const darkBlue = generateColorPalette("#1a1a2e");
    expect(darkBlue.primaryForeground).toBe("#ffffff");
  });

  it("returns black foreground for light colors", () => {
    const palette = generateColorPalette("#ffffff");
    expect(palette.primaryForeground).toBe("#000000");

    const lightYellow = generateColorPalette("#ffff00");
    expect(lightYellow.primaryForeground).toBe("#000000");
  });

  it("handles pure red", () => {
    const palette = generateColorPalette("#ff0000");
    expect(palette.primary).toBe("#ff0000");
    expect(palette.primaryForeground).toBe("#ffffff");
  });

  it("handles pure green", () => {
    const palette = generateColorPalette("#00ff00");
    expect(palette.primary).toBe("#00ff00");
    expect(palette.primaryForeground).toBe("#000000");
  });

  it("handles hex without # prefix", () => {
    const palette = generateColorPalette("3b82f6");
    expect(palette.primary).toBe("#3b82f6");
  });

  it("handles grayscale colors (0 saturation)", () => {
    const palette = generateColorPalette("#808080");
    expect(palette.primary).toBe("#808080");
    expect(palette.primaryHover).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("returns valid hex for all palette values", () => {
    const hexRegex = /^#[0-9a-f]{6}$/i;
    const palette = generateColorPalette("#e91e63");
    expect(palette.primary).toMatch(hexRegex);
    expect(palette.primaryHover).toMatch(hexRegex);
    expect(palette.primaryLight).toMatch(hexRegex);
    expect(["#000000", "#ffffff"]).toContain(palette.primaryForeground);
  });
});

describe("generateColorCssVars", () => {
  it("returns all four CSS custom properties", () => {
    const palette: ColorPalette = {
      primary: "#3b82f6",
      primaryHover: "#2563eb",
      primaryLight: "#eff6ff",
      primaryForeground: "#ffffff",
    };

    const vars = generateColorCssVars(palette);

    expect(vars["--color-primary"]).toBe("#3b82f6");
    expect(vars["--color-primary-hover"]).toBe("#2563eb");
    expect(vars["--color-primary-light"]).toBe("#eff6ff");
    expect(vars["--color-primary-foreground"]).toBe("#ffffff");
  });

  it("has exactly 4 keys", () => {
    const palette = generateColorPalette("#ff5722");
    const vars = generateColorCssVars(palette);
    expect(Object.keys(vars)).toHaveLength(4);
  });

  it("integrates correctly with generateColorPalette", () => {
    const palette = generateColorPalette("#9c27b0");
    const vars = generateColorCssVars(palette);
    expect(vars["--color-primary"]).toBe(palette.primary);
    expect(vars["--color-primary-hover"]).toBe(palette.primaryHover);
    expect(vars["--color-primary-light"]).toBe(palette.primaryLight);
    expect(vars["--color-primary-foreground"]).toBe(palette.primaryForeground);
  });
});
