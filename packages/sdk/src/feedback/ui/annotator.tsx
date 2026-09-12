import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { isDegenerate } from "../core/annotations";
import type {
  Annotation,
  AnnotationTool,
  CapturedImage,
  FeedbackWidgetLabels,
  Point,
} from "../types";
import {
  annotationColorHex,
  DEFAULT_ANNOTATION_COLOR,
} from "./annotation/color-value";
import { TextAnnotationEditor } from "./annotation/text/text-editor";
import { useTextAnnotation } from "./annotation/text/use-text-annotation";
import { type AnnotationEditor, AnnotationToolbar } from "./annotation/toolbar";
import { useAnnotationCanvas } from "./annotation/use-annotation-canvas";
import { useImageMorph } from "./annotation/use-image-morph";

function toImagePoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): Point {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: Math.max(
      0,
      Math.min(
        canvas.width,
        ((clientX - bounds.left) / bounds.width) * canvas.width
      )
    ),
    y: Math.max(
      0,
      Math.min(
        canvas.height,
        ((clientY - bounds.top) / bounds.height) * canvas.height
      )
    ),
  };
}

export function Annotator({
  capture,
  labels,
  editor,
}: {
  capture: CapturedImage;
  labels: FeedbackWidgetLabels;
  editor: AnnotationEditor & { trigger?: HTMLElement | null };
}) {
  const { annotations, onChange, onDone, onRetake } = editor;
  const morph = useImageMorph(editor.trigger, onDone);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tool, setTool] = useState<AnnotationTool>("rectangle");
  const [colorSelection, setColorSelection] = useState(
    DEFAULT_ANNOTATION_COLOR
  );
  const color = annotationColorHex(colorSelection);
  const [draft, setDraft] = useState<Annotation | null>(null);
  const { canvasRef, hasError, isDecoded } = useAnnotationCanvas(
    capture,
    draft ? [...annotations, draft] : annotations
  );
  const text = useTextAnnotation({ annotations, color, onChange });
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!(canvas && isDecoded) || event.button !== 0) {
      return;
    }

    const point = toImagePoint(canvas, event.clientX, event.clientY);
    if (tool === "text") {
      event.preventDefault();
      text.beginText(canvas, point);
      return;
    }
    canvas.setPointerCapture(event.pointerId);

    setDraft({
      color,
      end: point,
      id: crypto.randomUUID(),
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

  return (
    <dialog
      aria-label={labels.annotateHint}
      className="overlay"
      data-closing={morph.isClosing}
      data-opening={morph.isOpening}
      onCancel={(event) => {
        event.preventDefault();
        morph.close();
      }}
      ref={dialogRef}
    >
      {hasError && (
        <p className="error" role="alert">
          {labels.captureFailed}
        </p>
      )}
      <style>{`.editor-image { --rf-capture-ratio: ${capture.width / capture.height}; }`}</style>
      <div className="editor">
        <div className="editor-image" ref={morph.frameRef}>
          <div className="editor-visual" ref={morph.visualRef}>
            <img
              alt=""
              height={capture.height}
              src={capture.objectUrl}
              width={capture.width}
            />
            <canvas
              data-tool={tool}
              height={capture.height}
              onPointerCancel={() => setDraft(null)}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              ref={canvasRef}
              width={capture.width}
            />
          </div>
        </div>
      </div>

      {text.textDraft && (
        <TextAnnotationEditor
          draft={text.textDraft}
          key={text.textDraft.annotation.id}
          onCancel={text.cancelText}
          onCommit={(value) => {
            if (canvasRef.current) {
              text.commitText(canvasRef.current, value);
            }
          }}
        />
      )}
      <AnnotationToolbar
        drawing={{
          color: colorSelection,
          setColor: setColorSelection,
          setTool,
          tool,
        }}
        editor={{
          annotations,
          onChange,
          onDone: () => morph.close(),
          onRetake: onRetake ? () => morph.close(onRetake) : undefined,
        }}
        labels={labels}
      />
    </dialog>
  );
}
