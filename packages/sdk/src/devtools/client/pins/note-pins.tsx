import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { SelectionOutline } from "../../../feedback/ui/selection-outline";
import { listenToKeydown } from "../../../feedback/ui/widget-keys";
import type { CodeTarget } from "../code/code-panel";
import { NoteCard } from "../notes/note-card";
import type { NotesSnapshot } from "../notes/note-store";
import { type PinAnchor, usePinAnchors } from "./use-pin-anchors";

const PIN_SIZE = 24;
const EDGE_GAP = 12;
const POPOVER_GAP = 8;
const POPOVER_WIDTH = 320;

function pinPosition(anchor: PinAnchor) {
  return {
    left: Math.min(
      Math.max(anchor.x - PIN_SIZE / 2, EDGE_GAP),
      window.innerWidth - PIN_SIZE - EDGE_GAP
    ),
    top: Math.min(
      Math.max(anchor.y - PIN_SIZE, EDGE_GAP),
      window.innerHeight - PIN_SIZE - EDGE_GAP
    ),
  };
}

function NotePopover({
  anchor,
  notes,
  onClose,
  onOpenCode,
}: {
  anchor: PinAnchor;
  notes: NotesSnapshot;
  onClose: () => void;
  onOpenCode: (target: CodeTarget) => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState<number | null>(null);
  const pin = pinPosition(anchor);
  const fitsRight =
    pin.left + PIN_SIZE + POPOVER_GAP + POPOVER_WIDTH + EDGE_GAP <
    window.innerWidth;
  const left = fitsRight
    ? pin.left + PIN_SIZE + POPOVER_GAP
    : Math.max(EDGE_GAP, pin.left - POPOVER_GAP - POPOVER_WIDTH);

  useLayoutEffect(() => {
    const height = popoverRef.current?.offsetHeight ?? 0;
    setTop(
      Math.max(
        EDGE_GAP,
        Math.min(pin.top, window.innerHeight - height - EDGE_GAP)
      )
    );
  }, [pin.top]);

  useEffect(() => {
    const closeOnOutsidePress = (event: PointerEvent) => {
      const path = event.composedPath();
      const isInside = path.some(
        (node) =>
          node === popoverRef.current ||
          (node instanceof HTMLElement && node.dataset.pin === anchor.note.id)
      );
      if (!isInside) {
        onClose();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePress, true);
    const stopKeys = listenToKeydown(popoverRef.current, (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    });
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress, true);
      stopKeys();
    };
  }, [anchor.note.id, onClose]);

  return (
    <div
      aria-label={`Note ${anchor.number}`}
      className="dt-popover glass"
      ref={popoverRef}
      role="dialog"
      style={{
        left,
        top: top ?? pin.top,
        visibility: top === null ? "hidden" : "visible",
      }}
    >
      <NoteCard
        isLocating={notes.activity[anchor.note.id] === "locating"}
        note={anchor.note}
        onOpenCode={(target) => {
          onClose();
          onOpenCode(target);
        }}
        pinNumber={anchor.number}
      />
    </div>
  );
}

/** Figma-style: one numbered bubble per note on this page, its note one click away. */
export function NotePins({
  isVisible,
  notes,
  onOpenCode,
}: {
  isVisible: boolean;
  notes: NotesSnapshot;
  onOpenCode: (target: CodeTarget) => void;
}) {
  const anchors = usePinAnchors(notes.notes, isVisible);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const closePopover = useCallback(() => setOpenNoteId(null), []);
  const openAnchor = anchors.find((anchor) => anchor.note.id === openNoteId);

  return (
    <>
      {anchors.map((anchor) => (
        <button
          aria-expanded={anchor.note.id === openNoteId}
          aria-label={`Note ${anchor.number}: ${anchor.note.note || anchor.note.selection.label}`}
          className="dt-pin"
          data-locating={notes.activity[anchor.note.id] === "locating"}
          data-pin={anchor.note.id}
          data-sent={Boolean(anchor.note.sent)}
          key={anchor.note.id}
          onClick={() =>
            setOpenNoteId((current) =>
              current === anchor.note.id ? null : anchor.note.id
            )
          }
          style={pinPosition(anchor)}
          type="button"
        >
          {anchor.number}
        </button>
      ))}
      {openAnchor && (
        <>
          <SelectionOutline node={openAnchor.element} />
          <NotePopover
            anchor={openAnchor}
            notes={notes}
            onClose={closePopover}
            onOpenCode={onOpenCode}
          />
        </>
      )}
    </>
  );
}
