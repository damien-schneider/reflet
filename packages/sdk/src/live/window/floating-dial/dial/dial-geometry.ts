const SIZE = 208;
const CENTER = SIZE / 2;
const RING_WIDTH = 40;
const RING_OUTER = CENTER;
const RING_INNER = RING_OUTER - RING_WIDTH;
const RING_MID = RING_OUTER - RING_WIDTH / 2;
const CAP_RADIUS = RING_WIDTH / 2;
const GAP_DEGREES = 72;
const ISLAND_GAP_DEGREES = 10;
const LABEL_INSET_DEGREES = 5;
const ARC_SAMPLES = 24;
const CAP_SAMPLES = 12;
const READOUT_WIDTH = 168;
const DIVIDER_INSET = 9;
const READOUT_HEIGHT = 20;
const READOUT_TOP = 8;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const CAP_DEGREES = (Math.atan(CAP_RADIUS / RING_MID) * 180) / Math.PI;
const SPAN_START = GAP_DEGREES / 2;
const SPAN_END = 360 - GAP_DEGREES / 2;

interface Point {
  x: number;
  y: number;
}

const ringPoint = (radius: number, degreesClockwiseFromTop: number): Point => {
  const radians = toRadians(degreesClockwiseFromTop);
  return {
    x: CENTER + radius * Math.sin(radians),
    y: CENTER - radius * Math.cos(radians),
  };
};

const arcPoints = (radius: number, from: number, to: number): Point[] =>
  Array.from({ length: ARC_SAMPLES + 1 }, (_, step) =>
    ringPoint(radius, from + ((to - from) * step) / ARC_SAMPLES)
  );

const capPoints = (degrees: number, direction: 1 | -1): Point[] => {
  const center = ringPoint(RING_MID, degrees);
  const radians = toRadians(degrees);
  const outward = { x: Math.sin(radians), y: -Math.cos(radians) };
  const clockwise = { x: Math.cos(radians), y: Math.sin(radians) };
  return Array.from({ length: CAP_SAMPLES + 1 }, (_, step) => {
    const turn = (Math.PI * step) / CAP_SAMPLES;
    const along = direction * Math.sin(turn);
    return {
      x:
        center.x +
        CAP_RADIUS * (outward.x * Math.cos(turn) + clockwise.x * along),
      y:
        center.y +
        CAP_RADIUS * (outward.y * Math.cos(turn) + clockwise.y * along),
    };
  });
};

const round = (value: number): number => Math.round(value * 100) / 100;

const formatPoint = (point: Point): string =>
  `${round(point.x)} ${round(point.y)}`;

export const DIAL_SIZE = SIZE;

export const DIAL_RING_WIDTH = RING_WIDTH;

export interface DialSlot {
  capsEnd: boolean;
  capsStart: boolean;
  from: number;
  to: number;
}

export interface DialLayout<Id extends string> {
  dividers: readonly string[];
  slot: (id: Id) => DialSlot;
  tracks: readonly string[];
}

interface Bounds {
  height: number;
  left: number;
  top: number;
  width: number;
}

export const DIAL_READOUT = {
  height: READOUT_HEIGHT,
  left: CENTER - READOUT_WIDTH / 2,
  top: READOUT_TOP,
  width: READOUT_WIDTH,
} as const satisfies Bounds;

export interface DialSegmentShape extends Bounds {
  anchor: Point;
  path: string;
}

const arcPath = (from: number, to: number, isClockwise = true): string => {
  const largeArc = Math.abs(to - from) > 180 ? 1 : 0;
  return `M ${formatPoint(ringPoint(RING_MID, from))} A ${RING_MID} ${RING_MID} 0 ${largeArc} ${isClockwise ? 1 : 0} ${formatPoint(ringPoint(RING_MID, to))}`;
};

const dividerPath = (degrees: number): string =>
  `M ${formatPoint(ringPoint(RING_INNER + DIVIDER_INSET, degrees))} L ${formatPoint(ringPoint(RING_OUTER - DIVIDER_INSET, degrees))}`;

export const dialLayout = <Id extends string>(
  islands: readonly (readonly Id[])[]
): DialLayout<Id> => {
  const islandSweep =
    (SPAN_END - SPAN_START - (islands.length - 1) * ISLAND_GAP_DEGREES) /
    islands.length;
  const slots = new Map<Id, DialSlot>();
  const tracks: string[] = [];
  const dividers: string[] = [];
  for (const [islandIndex, island] of islands.entries()) {
    const islandStart =
      SPAN_START + islandIndex * (islandSweep + ISLAND_GAP_DEGREES);
    const sweep = islandSweep / island.length;
    const capsPerSlot = island.length === 1 ? 2 : 1;
    if (sweep <= capsPerSlot * CAP_DEGREES) {
      throw new Error(`Dial island ${island.join(", ")} is too narrow`);
    }
    tracks.push(
      arcPath(
        islandStart + CAP_DEGREES,
        islandStart + islandSweep - CAP_DEGREES
      )
    );
    for (const [index, id] of island.entries()) {
      slots.set(id, {
        capsEnd: index === island.length - 1,
        capsStart: index === 0,
        from: islandStart + index * sweep,
        to: islandStart + (index + 1) * sweep,
      });
      if (index > 0) {
        dividers.push(dividerPath(islandStart + index * sweep));
      }
    }
  }
  return {
    dividers,
    slot: (id) => {
      const slot = slots.get(id);
      if (!slot) {
        throw new Error(`"${id}" has no place on this dial`);
      }
      return slot;
    },
    tracks,
  };
};

export interface DialLabelArc {
  length: number;
  path: string;
}

export const dialLabelArc = (slot: DialSlot): DialLabelArc => {
  const from = slot.from + LABEL_INSET_DEGREES;
  const to = slot.to - LABEL_INSET_DEGREES;
  const middle = (from + to) / 2;
  const isUnderside = middle > 90 && middle < 270;
  return {
    length: RING_MID * toRadians(to - from),
    path: isUnderside ? arcPath(to, from, false) : arcPath(from, to),
  };
};

const pixelBounds = (points: Point[]): Bounds => {
  const xs = points.map((point) => round(point.x));
  const ys = points.map((point) => round(point.y));
  const left = Math.floor(Math.min(...xs));
  const top = Math.floor(Math.min(...ys));
  return {
    height: Math.ceil(Math.max(...ys)) - top,
    left,
    top,
    width: Math.ceil(Math.max(...xs)) - left,
  };
};

const sectorPath = (sector: DialSlot, origin: Bounds): string => {
  const { capsEnd, capsStart, from, to } = sector;
  const at = (radius: number, degrees: number): string => {
    const point = ringPoint(radius, degrees);
    return formatPoint({ x: point.x - origin.left, y: point.y - origin.top });
  };
  const largeArc = to - from > 180 ? 1 : 0;
  return [
    `M ${at(RING_OUTER, from)}`,
    `A ${RING_OUTER} ${RING_OUTER} 0 ${largeArc} 1 ${at(RING_OUTER, to)}`,
    capsEnd
      ? `A ${CAP_RADIUS} ${CAP_RADIUS} 0 0 1 ${at(RING_INNER, to)}`
      : `L ${at(RING_INNER, to)}`,
    `A ${RING_INNER} ${RING_INNER} 0 ${largeArc} 0 ${at(RING_INNER, from)}`,
    capsStart
      ? `A ${CAP_RADIUS} ${CAP_RADIUS} 0 0 1 ${at(RING_OUTER, from)}`
      : "",
    "Z",
  ]
    .filter(Boolean)
    .join(" ");
};

export const dialSegmentShape = (slot: DialSlot): DialSegmentShape => {
  const sector: DialSlot = {
    ...slot,
    from: slot.capsStart ? slot.from + CAP_DEGREES : slot.from,
    to: slot.capsEnd ? slot.to - CAP_DEGREES : slot.to,
  };
  const bounds = pixelBounds([
    ...arcPoints(RING_OUTER, sector.from, sector.to),
    ...(sector.capsEnd ? capPoints(sector.to, 1) : []),
    ...arcPoints(RING_INNER, sector.from, sector.to),
    ...(sector.capsStart ? capPoints(sector.from, -1) : []),
  ]);
  const anchor = ringPoint(RING_MID, (slot.from + slot.to) / 2);
  return {
    ...bounds,
    anchor: {
      x: round(anchor.x - bounds.left),
      y: round(anchor.y - bounds.top),
    },
    path: sectorPath(sector, bounds),
  };
};
