import { useLayoutEffect, useRef, useState } from "react";

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function thumbnailFrame(frame: HTMLElement, trigger: HTMLElement) {
  const destination = frame.getBoundingClientRect();
  const thumbnail = trigger.getBoundingClientRect();
  const scale = Math.max(
    thumbnail.width / destination.width,
    thumbnail.height / destination.height
  );
  const insetX = (destination.width - thumbnail.width / scale) / 2;
  const insetBottom = destination.height - thumbnail.height / scale;
  const radius =
    Number.parseFloat(getComputedStyle(trigger).borderRadius) / scale;
  return {
    clipPath: `inset(0px ${insetX}px ${insetBottom}px ${insetX}px round ${radius}px)`,
    transform: `translate(${thumbnail.x - destination.x - insetX * scale}px, ${thumbnail.y - destination.y}px) scale(${scale})`,
  };
}

function expandedFrame(visual: HTMLElement) {
  return {
    clipPath: `inset(0px 0px 0px 0px round ${getComputedStyle(visual).borderRadius})`,
    transform: "none",
  };
}

const TIMING = { duration: 340, easing: "cubic-bezier(0.22, 1, 0.36, 1)" };

export function useImageMorph(
  trigger: HTMLElement | null | undefined,
  onDone: () => void
) {
  const frameRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const entrance = useRef<Animation | null>(null);
  const exit = useRef<Animation | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const visual = visualRef.current;
    if (frame && visual?.animate && trigger && !prefersReducedMotion()) {
      setIsOpening(true);
      entrance.current = visual.animate(
        [thumbnailFrame(frame, trigger), expandedFrame(visual)],
        TIMING
      );
      entrance.current.finished.then(
        () => setIsOpening(false),
        () => undefined
      );
    }
    return () => {
      entrance.current?.cancel();
      exit.current?.cancel();
    };
  }, [trigger]);

  const close = (action = onDone) => {
    if (exit.current) {
      return;
    }
    const frame = frameRef.current;
    const visual = visualRef.current;
    if (!(frame && visual?.animate && trigger) || prefersReducedMotion()) {
      action();
      return;
    }
    const current =
      entrance.current?.playState === "running"
        ? {
            clipPath: getComputedStyle(visual).clipPath,
            transform: getComputedStyle(visual).transform,
          }
        : expandedFrame(visual);
    entrance.current?.cancel();
    setIsClosing(true);
    const animation = visual.animate(
      [current, thumbnailFrame(frame, trigger)],
      { ...TIMING, duration: 260, fill: "forwards" }
    );
    exit.current = animation;
    animation.finished.then(action, () => undefined);
  };

  return { close, frameRef, isClosing, isOpening, visualRef };
}
