export interface AnnotationColor {
  baseColor: string;
  strengthPercent: number;
}

export const DEFAULT_ANNOTATION_COLOR: AnnotationColor = {
  baseColor: "#ef4444",
  strengthPercent: 100,
};

export function annotationColorHex({
  baseColor,
  strengthPercent,
}: AnnotationColor): string {
  const channels = [1, 3, 5].map((offset) => {
    const channel = Number.parseInt(baseColor.slice(offset, offset + 2), 16);
    return Math.round(255 + ((channel - 255) * strengthPercent) / 100)
      .toString(16)
      .padStart(2, "0");
  });
  return `#${channels.join("")}`;
}
