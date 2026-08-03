import { describe, expect, it } from "vitest";
import { buildSnapdomOptions, fitWithin, WIDGET_MARKER } from "../capture";

describe("buildSnapdomOptions", () => {
  it("always excludes the widget so it never lands in its own screenshot", () => {
    expect(buildSnapdomOptions({}).exclude).toContain(`[${WIDGET_MARKER}]`);
  });

  it("clips to the viewport when capturing the whole page", () => {
    expect(buildSnapdomOptions({}).clip).toBe("viewport");
  });

  it("captures a picked element in full instead of clipping", () => {
    const element = document.createElement("div");

    expect(buildSnapdomOptions({ element }).clip).toBeUndefined();
  });

  it("appends caller supplied selectors", () => {
    const options = buildSnapdomOptions({
      excludeSelectors: [".intercom-launcher", "#cookie-banner"],
    });

    expect(options.exclude).toEqual([
      `[${WIDGET_MARKER}]`,
      ".intercom-launcher",
      "#cookie-banner",
    ]);
  });

  it("caps the pixel ratio so retina captures stay uploadable", () => {
    expect(buildSnapdomOptions({ devicePixelRatio: 3 }).dpr).toBe(2);
    expect(buildSnapdomOptions({ devicePixelRatio: 1 }).dpr).toBe(1);
  });

  it("falls back to a ratio of one when the browser reports nothing", () => {
    expect(buildSnapdomOptions({ devicePixelRatio: 0 }).dpr).toBe(1);
  });

  it("embeds fonts so text is not rendered with fallback glyphs", () => {
    expect(buildSnapdomOptions({}).embedFonts).toBe(true);
  });
});

describe("fitWithin", () => {
  it("leaves a capture that is already small enough untouched", () => {
    expect(fitWithin({ height: 800, width: 1280 }, 2000)).toEqual({
      height: 800,
      scale: 1,
      width: 1280,
    });
  });

  it("scales an oversized capture down proportionally", () => {
    expect(fitWithin({ height: 2000, width: 3000 }, 1500)).toEqual({
      height: 1000,
      scale: 0.5,
      width: 1500,
    });
  });

  it("never returns a zero dimension", () => {
    expect(fitWithin({ height: 1, width: 4000 }, 100).height).toBe(1);
  });
});
