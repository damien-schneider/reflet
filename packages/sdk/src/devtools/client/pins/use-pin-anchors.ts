import { useEffect, useState } from "react";
import { findOnPage } from "../find-on-page";
import { type DevNote, pinNumbers } from "../notes/note-store";

export interface PinAnchor {
  element: Element;
  note: DevNote;
  number: number;
  x: number;
  y: number;
}

/** Layout can move without a scroll or resize (accordions, data loading). */
const LAYOUT_HEARTBEAT_MS = 500;

function measure(notes: DevNote[]): PinAnchor[] {
  const numbers = pinNumbers(notes, window.location.pathname);
  return notes.flatMap((note) => {
    const number = numbers.get(note.id);
    const element =
      number === undefined ? null : findOnPage(note.selection.selector);
    const rect = element?.getBoundingClientRect();
    const isRendered = rect && rect.width > 0 && rect.height > 0;
    const isOnScreen = rect && rect.bottom > 0 && rect.top < window.innerHeight;
    if (!(element && number && isRendered && isOnScreen)) {
      return [];
    }
    return [{ element, note, number, x: rect.left, y: rect.top }];
  });
}

function sameAnchors(a: PinAnchor[], b: PinAnchor[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (anchor, index) =>
        anchor.note === b[index]?.note &&
        anchor.element === b[index]?.element &&
        Math.round(anchor.x) === Math.round(b[index]?.x ?? Number.NaN) &&
        Math.round(anchor.y) === Math.round(b[index]?.y ?? Number.NaN)
    )
  );
}

/** Where each note of this page sits right now; the numbering follows creation order. */
export function usePinAnchors(notes: DevNote[], isActive: boolean) {
  const [anchors, setAnchors] = useState<PinAnchor[]>([]);

  useEffect(() => {
    if (!isActive) {
      setAnchors([]);
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const next = measure(notes);
      setAnchors((current) => (sameAnchors(current, next) ? current : next));
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(update);
    };

    update();
    const heartbeat = window.setInterval(schedule, LAYOUT_HEARTBEAT_MS);
    window.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(heartbeat);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, [isActive, notes]);

  return anchors;
}
