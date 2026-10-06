import { v } from "convex/values";

export const TAG_COLORS = [
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
] as const;

export type TagColor = (typeof TAG_COLORS)[number];

export const tagColorValidator = v.union(
  ...TAG_COLORS.map((color) => v.literal(color))
);

export function isTagColor(color: string): color is TagColor {
  return TAG_COLORS.some((candidate) => candidate === color);
}
