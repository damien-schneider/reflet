import { useCallback, useEffect, useRef, useState } from "react";
import { releaseCapture } from "../../core/capture";
import type { CapturedImage } from "../../types";

export function useOwnedCapture() {
  const [image, setImage] = useState<CapturedImage | null>(null);
  const ownedImage = useRef<CapturedImage | null>(null);
  useEffect(() => () => releaseCapture(ownedImage.current), []);
  const replace = useCallback((nextImage: CapturedImage | null) => {
    releaseCapture(ownedImage.current);
    ownedImage.current = nextImage;
    setImage(nextImage);
  }, []);
  return [image, replace] as const;
}
