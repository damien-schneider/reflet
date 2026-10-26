import { useEffect, useState } from "react";
import type { LiveCapture } from "../../protocol";

const VISIBLE_FOR_MS = 6000;

export function describeCapture({ element, kind }: LiveCapture): string {
  const target = element.role
    ? `${element.role} “${element.label}”`
    : `“${element.label}”`;
  return kind === "pick" ? `Pointed at ${target}` : `Clicked ${target}`;
}

export function useRecentCapture(
  capture: LiveCapture | null
): LiveCapture | null {
  const [expired, setExpired] = useState<LiveCapture | null>(null);

  useEffect(() => {
    if (!capture) {
      return;
    }
    const timer = setTimeout(
      () => setExpired(capture),
      Math.max(capture.at + VISIBLE_FOR_MS - Date.now(), 0)
    );
    return () => clearTimeout(timer);
  }, [capture]);

  return capture === expired ? null : capture;
}
