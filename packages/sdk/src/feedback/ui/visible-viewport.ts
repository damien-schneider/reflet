export interface VisibleViewport {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
}

/**
 * The part of the page the reporter can actually see, in fixed-position
 * coordinates. On mobile the keyboard shrinks this without touching
 * `window.innerHeight`, so anything that must stay reachable measures here.
 */
export function visibleViewport(): VisibleViewport {
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft ?? 0;
  const top = viewport?.offsetTop ?? 0;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  return {
    bottom: window.innerHeight - top - height,
    height,
    left,
    right: window.innerWidth - left - width,
    top,
    width,
  };
}

export function onViewportChange(update: () => void) {
  window.addEventListener("resize", update);
  window.visualViewport?.addEventListener("resize", update);
  window.visualViewport?.addEventListener("scroll", update);
  return () => {
    window.removeEventListener("resize", update);
    window.visualViewport?.removeEventListener("resize", update);
    window.visualViewport?.removeEventListener("scroll", update);
  };
}
