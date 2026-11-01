import { describe, expect, it } from "vitest";
import { clampDrawerWidth } from "./drawer-resize-edge";

describe("clampDrawerWidth", () => {
  it("keeps a dragged width inside the viewport bounds", () => {
    expect(clampDrawerWidth(900, 1440)).toBe(900);
  });

  it("never shrinks the drawer below its readable minimum", () => {
    expect(clampDrawerWidth(120, 1440)).toBe(480);
  });

  it("leaves a gutter of the page visible when dragged wide", () => {
    expect(clampDrawerWidth(1440, 1440)).toBe(1376);
  });
});
