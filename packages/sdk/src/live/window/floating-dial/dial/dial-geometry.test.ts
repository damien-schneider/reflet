import { describe, expect, it } from "vitest";
import {
  DIAL_READOUT,
  DIAL_SIZE,
  type DialSegmentShape,
  dialLabelArc,
  dialLayout,
  dialSegmentShape,
} from "./dial-geometry";

const CENTER = DIAL_SIZE / 2;
const GAP_EDGE_DEGREES = 36;
const TOO_NARROW = /too narrow/;
const ARC_SWEEP_FLAG = /A [\d.]+ [\d.]+ 0 [01] ([01])/;

const PAGES: Record<string, readonly (readonly string[])[]> = {
  "one wedge around the whole ring": [["a"]],
  "three islands of nine": [
    ["a", "b", "c", "d", "e"],
    ["f", "g"],
    ["h", "i"],
  ],
  "two lone wedges": [["a"], ["b"]],
};

const ring = (islands: readonly (readonly string[])[]): DialSegmentShape[] => {
  const layout = dialLayout(islands);
  return islands.flat().map((id) => dialSegmentShape(layout.slot(id)));
};

const clockwiseDegreesFromTop = (shape: DialSegmentShape): number => {
  const x = shape.left + shape.anchor.x - CENTER;
  const y = shape.top + shape.anchor.y - CENTER;
  return ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360;
};

const steps = (angles: number[]): number[] =>
  angles.slice(1).map((angle, index) => angle - (angles[index] ?? Number.NaN));

describe.each(Object.entries(PAGES))("a dial with %s", (_, islands) => {
  it("keeps every control and its icon inside the dial", () => {
    for (const shape of ring(islands)) {
      expect(shape.left).toBeGreaterThanOrEqual(0);
      expect(shape.top).toBeGreaterThanOrEqual(0);
      expect(shape.left + shape.width).toBeLessThanOrEqual(DIAL_SIZE);
      expect(shape.top + shape.height).toBeLessThanOrEqual(DIAL_SIZE);
      expect(shape.anchor.x).toBeGreaterThan(0);
      expect(shape.anchor.x).toBeLessThan(shape.width);
      expect(shape.anchor.y).toBeGreaterThan(0);
      expect(shape.anchor.y).toBeLessThan(shape.height);
    }
  });

  it("lays the controls out clockwise after the top gap", () => {
    const angles = ring(islands).map(clockwiseDegreesFromTop);

    expect(angles[0]).toBeGreaterThan(GAP_EDGE_DEGREES);
    expect(angles.at(-1)).toBeLessThan(360 - GAP_EDGE_DEGREES);
    for (const step of steps(angles)) {
      expect(step).toBeGreaterThan(0);
    }
  });

  it("leaves the top gap free for the readout", () => {
    for (const shape of ring(islands)) {
      const overlapsReadout =
        shape.top < DIAL_READOUT.top + DIAL_READOUT.height &&
        shape.top + shape.height > DIAL_READOUT.top &&
        shape.left < DIAL_READOUT.left + DIAL_READOUT.width &&
        shape.left + shape.width > DIAL_READOUT.left;
      expect(overlapsReadout).toBe(false);
    }
  });
});

describe("dial islands", () => {
  it("gives every island the same share of the ring, then splits it evenly between its controls", () => {
    const [ab, bc, cd, de] = steps(
      ring([
        ["a", "b", "c"],
        ["d", "e"],
      ]).map(clockwiseDegreesFromTop)
    );

    expect(bc).toBeCloseTo(ab ?? 0, 1);
    expect(de).toBeCloseTo(((ab ?? 0) * 3) / 2, 1);
    expect(cd).toBeGreaterThan(((ab ?? 0) + (de ?? 0)) / 2);
  });

  it("mirrors two islands around the bottom gap, like the Reflet mark", () => {
    const [record, organization, close] = ring([
      ["record"],
      ["organization", "close"],
    ]).map(clockwiseDegreesFromTop);
    const leftMiddle = ((organization ?? 0) + (close ?? 0)) / 2;

    expect(leftMiddle).toBeCloseTo(360 - (record ?? 0), 1);
  });

  it("refuses an island too narrow for its rounded ends", () => {
    const crowded = Array.from(
      { length: 11 },
      (_, index) => `control-${index}`
    );

    expect(() => dialLayout([crowded, ["lone"]])).toThrow(TOO_NARROW);
  });
});

describe("dial labels", () => {
  const sweepOf = (id: "a" | "b" | "c"): string => {
    const layout = dialLayout([["a"], ["b", "c"]]);
    return dialLabelArc(layout.slot(id)).path.match(ARC_SWEEP_FLAG)?.[1] ?? "";
  };

  it("runs clockwise on the upper half and counterclockwise underneath, so text stays upright", () => {
    expect(sweepOf("c")).toBe("1");
    expect(sweepOf("b")).toBe("0");
  });

  it("measures the room a label has along the ring", () => {
    const layout = dialLayout([["wide"], ["narrow", "other"]]);

    expect(dialLabelArc(layout.slot("wide")).length).toBeGreaterThan(
      dialLabelArc(layout.slot("narrow")).length
    );
  });
});
