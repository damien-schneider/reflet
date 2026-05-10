/**
 * Shared color preset for work item labels.
 *
 * Each entry combines a stable `id` (persisted as `color` on the label
 * record), a Tailwind background class for the dot/swatch, a contrasting
 * text class for chip labels, and a soft tint used as the chip background.
 *
 * Used by:
 *  - `<LabelPill>` to render the colored chip
 *  - `<CreateLabelDialog>` swatch picker
 *  - Phase 3 inline labels popover (imports from this file)
 */

export type LabelColorId =
  | "slate"
  | "red"
  | "orange"
  | "amber"
  | "green"
  | "teal"
  | "blue"
  | "purple";

export interface LabelColor {
  /** Subtle border on the chip. */
  readonly border: string;
  /** Soft chip background. */
  readonly chip: string;
  readonly id: LabelColorId;
  readonly label: string;
  /** Solid swatch (used for the dot inside the pill, and the picker swatch). */
  readonly swatch: string;
  /** Foreground text on the chip. */
  readonly text: string;
}

export const LABEL_COLORS: readonly LabelColor[] = [
  {
    id: "slate",
    label: "Slate",
    swatch: "bg-slate-500",
    chip: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-300",
    border: "border-slate-500/30",
  },
  {
    id: "red",
    label: "Red",
    swatch: "bg-red-500",
    chip: "bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/30",
  },
  {
    id: "orange",
    label: "Orange",
    swatch: "bg-orange-500",
    chip: "bg-orange-500/10",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-500/30",
  },
  {
    id: "amber",
    label: "Amber",
    swatch: "bg-amber-500",
    chip: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
  },
  {
    id: "green",
    label: "Green",
    swatch: "bg-green-500",
    chip: "bg-green-500/10",
    text: "text-green-600 dark:text-green-400",
    border: "border-green-500/30",
  },
  {
    id: "teal",
    label: "Teal",
    swatch: "bg-teal-500",
    chip: "bg-teal-500/10",
    text: "text-teal-600 dark:text-teal-400",
    border: "border-teal-500/30",
  },
  {
    id: "blue",
    label: "Blue",
    swatch: "bg-blue-500",
    chip: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
  },
  {
    id: "purple",
    label: "Purple",
    swatch: "bg-purple-500",
    chip: "bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30",
  },
] as const;

export const DEFAULT_LABEL_COLOR_ID: LabelColorId = "slate";

const COLOR_BY_ID = new Map<string, LabelColor>(
  LABEL_COLORS.map((color) => [color.id, color])
);

/**
 * Resolve a stored color id to its preset. Falls back to the default
 * preset when the id is unknown (e.g. legacy data).
 */
export const resolveLabelColor = (id: string | undefined): LabelColor => {
  if (id) {
    const found = COLOR_BY_ID.get(id);
    if (found) {
      return found;
    }
  }
  return COLOR_BY_ID.get(DEFAULT_LABEL_COLOR_ID) ?? LABEL_COLORS[0];
};
