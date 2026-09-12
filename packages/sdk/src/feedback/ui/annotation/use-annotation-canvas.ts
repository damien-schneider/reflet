import { useEffect, useRef, useState } from "react";
import { drawAnnotations } from "../../core/annotation-renderer";
import type { Annotation, CapturedImage } from "../../types";

export function useAnnotationCanvas(
  capture: CapturedImage,
  annotations: Annotation[]
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bitmap, setBitmap] = useState<HTMLImageElement | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  useEffect(() => {
    const image = new Image();
    image.onload = () => setBitmap(image);
    image.onerror = () => setFailedUrl(capture.objectUrl);
    image.src = capture.objectUrl;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [capture.objectUrl]);

  const isDecoded = bitmap?.src === capture.objectUrl;
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!(canvas && context && bitmap && isDecoded)) {
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    drawAnnotations(context, annotations);
  }, [annotations, bitmap, isDecoded]);

  return { canvasRef, hasError: failedUrl === capture.objectUrl, isDecoded };
}
