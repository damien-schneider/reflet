import {
  type ComponentType,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { drawAnnotations } from "../core/annotation-renderer";
import { ANNOTATION_COLORS, isDegenerate } from "../core/annotations";
import type {
  Annotation,
  AnnotationTool,
  CapturedImage,
  FeedbackWidgetLabels,
  Point,
} from "../types";
import {
  ArrowIcon,
  BlurIcon,
  HighlightIcon,
  PencilIcon,
  SquareIcon,
  TrashIcon,
  UndoIcon,
} from "./icons";

const TOOLS: Array<{
  icon: ComponentType;
  id: AnnotationTool;
  label: string;
}> = [
  { icon: PencilIcon, id: "pen", label: "Draw" },
  { icon: ArrowIcon, id: "arrow", label: "Arrow" },
  { icon: SquareIcon, id: "rectangle", label: "Box" },
  { icon: HighlightIcon, id: "highlight", label: "Highlight" },
  { icon: BlurIcon, id: "blur", label: "Hide" },
];

function toImagePoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): Point {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: ((clientX - bounds.left) / bounds.width) * canvas.width,
    y: ((clientY - bounds.top) / bounds.height) * canvas.height,
  };
}

export function Annotator({
  annotations,
  capture,
  labels,
  onChange,
  onDone,
}: {
  annotations: Annotation[];
  capture: CapturedImage;
  labels: FeedbackWidgetLabels;
  onChange: (annotations: Annotation[]) => void;
  onDone: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextId = useRef(0);
  const [tool, setTool] = useState<AnnotationTool>("pen");
  const [color, setColor] = useState<string>(ANNOTATION_COLORS[0]);
  const [draft, setDraft] = useState<Annotation | null>(null);
  // State, not a ref: the redraw effect must re-run once the bitmap is decoded.
  const [base, setBase] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (active) {
        setBase(image);
      }
    };
    image.src = capture.objectUrl;
    return () => {
      active = false;
      setBase(null);
    };
  }, [capture.objectUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!(canvas && context)) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (base) {
      context.drawImage(base, 0, 0, canvas.width, canvas.height);
    }
    drawAnnotations(context, draft ? [...annotations, draft] : annotations);
  }, [annotations, base, draft]);

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.setPointerCapture(event.pointerId);
    const point = toImagePoint(canvas, event.clientX, event.clientY);
    nextId.current += 1;

    setDraft({
      color,
      end: point,
      id: `a${nextId.current}`,
      points: tool === "pen" ? [point] : undefined,
      start: point,
      tool,
    });
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!(canvas && draft)) {
      return;
    }

    const point = toImagePoint(canvas, event.clientX, event.clientY);
    setDraft(
      draft.tool === "pen"
        ? { ...draft, end: point, points: [...(draft.points ?? []), point] }
        : { ...draft, end: point }
    );
  };

  const onPointerUp = () => {
    if (!draft) {
      return;
    }
    if (!isDegenerate(draft)) {
      onChange([...annotations, draft]);
    }
    setDraft(null);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onDone();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onDone]);

  return (
    <div className="overlay">
      <div className="editor">
        <canvas
          height={capture.height}
          onPointerCancel={onPointerUp}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          ref={canvasRef}
          width={capture.width}
        />
      </div>

      <div className="toolbar">
        <div className="group">
          {TOOLS.map(({ icon: Icon, id, label }) => (
            <button
              aria-label={label}
              aria-pressed={tool === id}
              className="tool"
              key={id}
              onClick={() => setTool(id)}
              title={label}
              type="button"
            >
              <Icon />
            </button>
          ))}
        </div>

        <div className="group">
          {ANNOTATION_COLORS.map((value) => (
            <button
              aria-label={`Color ${value}`}
              aria-pressed={color === value}
              className="swatch"
              key={value}
              onClick={() => setColor(value)}
              style={{ background: value }}
              type="button"
            />
          ))}
        </div>

        <div className="group">
          <button
            aria-label={labels.undo}
            className="tool"
            disabled={annotations.length === 0}
            onClick={() => onChange(annotations.slice(0, -1))}
            title={labels.undo}
            type="button"
          >
            <UndoIcon />
          </button>
          <button
            aria-label={labels.clearAnnotations}
            className="tool"
            disabled={annotations.length === 0}
            onClick={() => onChange([])}
            title={labels.clearAnnotations}
            type="button"
          >
            <TrashIcon />
          </button>
          <button className="done-btn" onClick={onDone} type="button">
            {labels.done}
          </button>
        </div>
      </div>
    </div>
  );
}
