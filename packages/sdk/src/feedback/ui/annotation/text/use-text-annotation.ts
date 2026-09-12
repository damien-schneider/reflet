import { useState } from "react";
import { normalizeRect } from "../../../core/annotations";
import type { Annotation, Point } from "../../../types";
import type { TextDraft } from "./text-editor";

function containsPoint(annotation: Annotation, point: Point) {
  const bounds = normalizeRect(annotation.start, annotation.end);
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

export function useTextAnnotation(options: {
  annotations: Annotation[];
  color: string;
  onChange: (annotations: Annotation[]) => void;
}) {
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null);

  const beginText = (canvas: HTMLCanvasElement, point: Point) => {
    const bounds = canvas.getBoundingClientRect();
    const existing = [...options.annotations]
      .reverse()
      .find((item) => item.tool === "text" && containsPoint(item, point));
    const annotation =
      existing ??
      ({
        color: options.color,
        end: point,
        id: crypto.randomUUID(),
        start: point,
        tool: "text",
      } satisfies Annotation);
    const fontSize = existing
      ? (existing.end.y - existing.start.y) /
        (existing.text?.split("\n").length ?? 1) /
        1.4
      : (18 * canvas.width) / bounds.width;
    setTextDraft({
      annotation,
      fontSize,
      position: {
        x: bounds.x + (annotation.start.x / canvas.width) * bounds.width,
        y: bounds.y + (annotation.start.y / canvas.height) * bounds.height,
      },
    });
  };

  const commitText = (canvas: HTMLCanvasElement, text: string) => {
    const context = canvas.getContext("2d");
    if (!(textDraft && context)) {
      return;
    }
    const value = text.trim();
    const remaining = options.annotations.filter(
      ({ id }) => id !== textDraft.annotation.id
    );
    if (value) {
      context.font = `${textDraft.fontSize}px ui-sans-serif, system-ui, sans-serif`;
      const lines = value.split("\n");
      remaining.push({
        ...textDraft.annotation,
        end: {
          x:
            textDraft.annotation.start.x +
            Math.max(...lines.map((line) => context.measureText(line).width)),
          y:
            textDraft.annotation.start.y +
            lines.length * textDraft.fontSize * 1.4,
        },
        text: value,
      });
    }
    options.onChange(remaining);
    setTextDraft(null);
  };

  return {
    beginText,
    cancelText: () => setTextDraft(null),
    commitText,
    textDraft,
  };
}
