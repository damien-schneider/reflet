import { describe, expect, it } from "vitest";
import type { ColorPalette } from "./color-utils";
import { generateColorCssVars, generateColorPalette } from "./color-utils";

describe("generateColorPalette", () => {
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
      primaryForeground: "#ffffff",
      primaryHover: "#2563eb",
      primaryLight: "#eff6ff",
    };

    const vars = generateColorCssVars(palette);

    expect(vars["--color-primary"]).toBe("#3b82f6");
    expect(vars["--color-primary-hover"]).toBe("#2563eb");
    expect(vars["--color-primary-light"]).toBe("#eff6ff");
    expect(vars["--color-primary-foreground"]).toBe("#ffffff");
  });
});
