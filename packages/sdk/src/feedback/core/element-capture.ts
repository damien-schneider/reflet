import type { ElementSelection } from "../../types";
import type { Annotation, CapturedImage } from "../types";

const SELECTION_COLOR = "#4f46e5";
const SELECTION_ANNOTATION_PREFIX = "selection-";

export function isSelectionAnnotation({ id }: Annotation): boolean {
  return id.startsWith(SELECTION_ANNOTATION_PREFIX);
}

export function highlightFor(
  selection: ElementSelection,
  capture: CapturedImage
): Annotation {
  const scale = capture.width / window.innerWidth;
  const { rect } = selection;

  return {
    color: SELECTION_COLOR,
    end: {
      x: (rect.x + rect.width) * scale,
      y: (rect.y + rect.height) * scale,
    },
    id: `${SELECTION_ANNOTATION_PREFIX}${rect.x}-${rect.y}`,
    start: { x: rect.x * scale, y: rect.y * scale },
    tool: "rectangle",
  };
}
