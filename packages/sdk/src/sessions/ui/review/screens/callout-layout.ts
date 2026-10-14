import type { ShotPoint, ShotRect } from "./callout-report";

const PILL_GAP_PX = 6;
const ROW_GAP_PX = 6;
const BAND_GAP_PX = 14;
const LINE_INSET_PX = 12;

export interface BoxSize {
  height: number;
  width: number;
}

export interface CalloutTarget {
  id: string;
  outline: ShotRect | null;
}

export interface PlacedPill {
  x: number;
  y: number;
}

export interface CalloutLine {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface CalloutLayout {
  height: number;
  imageTop: number;
  lines: Record<string, CalloutLine>;
  pills: Record<string, PlacedPill>;
}

type Band = "above" | "below";

interface BandItem {
  anchor: ShotPoint | null;
  anchorX: number;
  id: string;
  size: BoxSize;
}

interface Row {
  height: number;
  items: { id: string; x: number }[];
  right: number;
}

function anchorOf(
  outline: ShotRect | null,
  band: Band,
  image: BoxSize
): ShotPoint | null {
  if (!outline) {
    return null;
  }
  const edgeY = band === "above" ? outline.y : outline.y + outline.height;
  return {
    x: (outline.x + outline.width / 2) * image.width,
    y: edgeY * image.height,
  };
}

function bandOf(outline: ShotRect | null): Band {
  return outline && outline.y + outline.height / 2 < 0.5 ? "above" : "below";
}

function packRows(items: BandItem[], imageWidth: number): Row[] {
  const rows: Row[] = [];
  const byAnchor = [...items].sort((a, b) => a.anchorX - b.anchorX);
  for (const { anchorX, id, size } of byAnchor) {
    const maxX = Math.max(0, imageWidth - size.width);
    const idealX = Math.min(maxX, Math.max(0, anchorX - size.width / 2));
    const xIn = (row: Row) => Math.max(idealX, row.right + PILL_GAP_PX);
    const fitting = rows.find(
      (row) => xIn(row) <= maxX && xIn(row) - idealX <= size.width / 2
    );
    const row = fitting ?? { height: 0, items: [], right: -PILL_GAP_PX };
    if (!fitting) {
      rows.push(row);
    }
    const x = xIn(row);
    row.items.push({ id, x });
    row.right = x + size.width;
    row.height = Math.max(row.height, size.height);
  }
  return rows;
}

function bandHeight(rows: Row[]): number {
  if (rows.length === 0) {
    return 0;
  }
  const rowsHeight = rows.reduce((total, row) => total + row.height, 0);
  return rowsHeight + ROW_GAP_PX * (rows.length - 1) + BAND_GAP_PX;
}

function lineFrom(pill: PlacedPill, size: BoxSize, anchorX: number): number {
  const inset = Math.min(LINE_INSET_PX, size.width / 2);
  return Math.min(
    pill.x + size.width - inset,
    Math.max(pill.x + inset, anchorX)
  );
}

export function layoutCallouts(options: {
  image: BoxSize;
  sizes: Record<string, BoxSize>;
  targets: CalloutTarget[];
}): CalloutLayout {
  const { image, sizes } = options;
  const bands: Record<Band, BandItem[]> = { above: [], below: [] };
  for (const { id, outline } of options.targets) {
    const band = bandOf(outline);
    const anchor = anchorOf(outline, band, image);
    bands[band].push({
      anchor,
      anchorX: anchor?.x ?? image.width / 2,
      id,
      size: sizes[id] ?? { height: 0, width: 0 },
    });
  }
  const aboveRows = packRows(bands.above, image.width);
  const belowRows = packRows(bands.below, image.width);
  const imageTop = bandHeight(aboveRows);
  const pills: Record<string, PlacedPill> = {};

  let aboveBottom = imageTop - BAND_GAP_PX;
  for (const row of aboveRows) {
    for (const { id, x } of row.items) {
      pills[id] = { x, y: aboveBottom - (sizes[id]?.height ?? 0) };
    }
    aboveBottom -= row.height + ROW_GAP_PX;
  }
  let belowTop = imageTop + image.height + BAND_GAP_PX;
  for (const row of belowRows) {
    for (const { id, x } of row.items) {
      pills[id] = { x, y: belowTop };
    }
    belowTop += row.height + ROW_GAP_PX;
  }

  const lines: Record<string, CalloutLine> = {};
  for (const band of ["above", "below"] as const) {
    for (const { anchor, id, size } of bands[band]) {
      const pill = pills[id];
      if (!(anchor && pill)) {
        continue;
      }
      lines[id] = {
        fromX: lineFrom(pill, size, anchor.x),
        fromY: band === "above" ? pill.y + size.height : pill.y,
        toX: anchor.x,
        toY: imageTop + anchor.y,
      };
    }
  }
  return {
    height: imageTop + image.height + bandHeight(belowRows),
    imageTop,
    lines,
    pills,
  };
}
