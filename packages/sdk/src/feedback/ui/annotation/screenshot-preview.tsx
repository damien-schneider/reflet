import type { Annotation, CapturedImage } from "../../types";
import { useAnnotationCanvas } from "./use-annotation-canvas";

export function ScreenshotPreview({
  annotations,
  capture,
}: {
  annotations: Annotation[];
  capture: CapturedImage;
}) {
  const { canvasRef } = useAnnotationCanvas(capture, annotations);
  return (
    <>
      <img
        alt=""
        draggable={false}
        height={capture.height}
        src={capture.objectUrl}
        width={capture.width}
      />
      {annotations.length > 0 && (
        <canvas height={capture.height} ref={canvasRef} width={capture.width} />
      )}
    </>
  );
}
