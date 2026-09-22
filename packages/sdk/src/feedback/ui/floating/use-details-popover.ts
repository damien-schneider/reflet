import { type MouseEvent, useEffect, useRef, useState } from "react";
import { listenToKeydown } from "../widget-keys";

export function useDetailsPopover() {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState("above");
  const [anchorLeft, setAnchorLeft] = useState(0);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const reposition = () => {
      const bounds = summaryRef.current?.getBoundingClientRect();
      if (bounds && detailsRef.current?.open) {
        setAnchorLeft(bounds.left);
        setPlacement(
          bounds.bottom < window.innerHeight / 2 ? "below" : "above"
        );
      }
    };
    const dismissOutside = (event: globalThis.PointerEvent) => {
      const details = detailsRef.current;
      if (details?.open && !event.composedPath().includes(details)) {
        setOpen(false);
      }
    };
    const dismissWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !detailsRef.current?.open) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      summaryRef.current?.focus();
    };
    document.addEventListener("pointerdown", dismissOutside);
    const stopListeningToKeys = listenToKeydown(
      detailsRef.current,
      dismissWithEscape,
      true
    );
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      stopListeningToKeys();
      window.removeEventListener("resize", reposition);
    };
  }, []);

  const show = () => {
    const bounds = summaryRef.current?.getBoundingClientRect();
    if (bounds) {
      setAnchorLeft(bounds.left);
      setPlacement(bounds.bottom < window.innerHeight / 2 ? "below" : "above");
    }
    setOpen(true);
  };
  return {
    anchorLeft,
    detailsProps: { "data-placement": placement, open, ref: detailsRef },
    hide: () => {
      setOpen(false);
      summaryRef.current?.focus();
    },
    show,
    summaryProps: {
      onClick: (event: MouseEvent<HTMLElement>) => {
        event.preventDefault();
        if (open) {
          setOpen(false);
        } else {
          show();
        }
      },
      ref: summaryRef,
    },
  };
}
