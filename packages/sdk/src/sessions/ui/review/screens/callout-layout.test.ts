import { expect, it } from "vitest";
import { type BoxSize, layoutCallouts } from "./callout-layout";

const IMAGE = { height: 250, width: 400 };
const PILL = { height: 26, width: 180 };

const outlineAt = (x: number, y: number) => ({
  height: 0.1,
  width: 0.1,
  x,
  y,
});

function boxesOverlap(
  a: { x: number; y: number },
  b: { x: number; y: number },
  size: BoxSize
) {
  return (
    a.x < b.x + size.width &&
    b.x < a.x + size.width &&
    a.y < b.y + size.height &&
    b.y < a.y + size.height
  );
}

it("puts labels for the top half above the screenshot and the rest below, outside the image", () => {
  const layout = layoutCallouts({
    image: IMAGE,
    sizes: { high: PILL, low: PILL },
    targets: [
      { id: "high", outline: outlineAt(0.4, 0.1) },
      { id: "low", outline: outlineAt(0.4, 0.8) },
    ],
  });

  const imageBottom = layout.imageTop + IMAGE.height;
  expect(layout.pills.high?.y).toBeLessThanOrEqual(
    layout.imageTop - PILL.height
  );
  expect(layout.pills.low?.y).toBeGreaterThanOrEqual(imageBottom);
  expect(layout.lines.high).toMatchObject({
    toY: layout.imageTop + 0.1 * IMAGE.height,
  });
  expect(layout.lines.low).toMatchObject({
    toY: layout.imageTop + 0.9 * IMAGE.height,
  });
  expect(layout.height).toBeGreaterThanOrEqual(imageBottom + PILL.height);
});

it("never overlaps labels pointing at the same spot and keeps them inside the width", () => {
  const ids = ["a", "b", "c", "d"];
  const layout = layoutCallouts({
    image: IMAGE,
    sizes: Object.fromEntries(ids.map((id) => [id, PILL])),
    targets: ids.map((id) => ({ id, outline: outlineAt(0.9, 0.05) })),
  });

  const placed = ids.map((id) => layout.pills[id]);
  for (const [index, pill] of placed.entries()) {
    expect(pill?.x).toBeGreaterThanOrEqual(0);
    expect((pill?.x ?? 0) + PILL.width).toBeLessThanOrEqual(IMAGE.width);
    for (const other of placed.slice(index + 1)) {
      expect(pill && other && boxesOverlap(pill, other, PILL)).toBe(false);
    }
  }
});

it("places a label without a line when nothing on the screen matched", () => {
  const layout = layoutCallouts({
    image: IMAGE,
    sizes: { page: PILL },
    targets: [{ id: "page", outline: null }],
  });

  expect(layout.pills.page).toBeDefined();
  expect(layout.lines.page).toBeUndefined();
});
