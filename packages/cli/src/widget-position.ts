export const WIDGET_POSITIONS = [
  "bottom-right",
  "bottom-left",
  "top-right",
  "top-left",
] as const;

export type WidgetPosition = (typeof WIDGET_POSITIONS)[number];

export function isWidgetPosition(value: string): value is WidgetPosition {
  return (WIDGET_POSITIONS as readonly string[]).includes(value);
}
