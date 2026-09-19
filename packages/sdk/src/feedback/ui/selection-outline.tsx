import { useEffect, useRef } from "react";

/**
 * Keeps the picked element ringed while the reporter writes about it, so the
 * composer parked next to it is visibly about that element.
 */
export function SelectionOutline({ node }: { node: Element | null }) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!(box && node)) {
      return;
    }

    let frame = 0;
    const draw = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const hidden =
        rect.width === 0 ||
        rect.height === 0 ||
        rect.bottom < 0 ||
        rect.top > window.innerHeight;
      box.style.opacity = hidden ? "0" : "1";
      box.style.width = `${rect.width}px`;
      box.style.height = `${rect.height}px`;
      box.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(draw);
    };

    draw();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(draw);
    observer?.observe(node);
    window.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [node]);

  if (!node) {
    return null;
  }

  return <div aria-hidden="true" className="selection-outline" ref={boxRef} />;
}
