"use client";

import type { KeyboardEvent, PointerEvent } from "react";

const MIN_DRAWER_WIDTH = 480;
const DRAWER_VIEWPORT_GUTTER = 64;
const KEYBOARD_RESIZE_STEP = 32;

export function clampDrawerWidth(width: number, viewportWidth: number) {
  return Math.min(
    Math.max(width, MIN_DRAWER_WIDTH),
    viewportWidth - DRAWER_VIEWPORT_GUTTER
  );
}

interface DrawerResizeEdgeProps {
  onResize: (width: number) => void;
}

export function DrawerResizeEdge({ onResize }: DrawerResizeEdgeProps) {
  const resizeTo = (width: number) =>
    onResize(clampDrawerWidth(width, window.innerWidth));

  const handlePointerMove = (event: PointerEvent<HTMLHRElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      resizeTo(window.innerWidth - event.clientX);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLHRElement>) => {
    const drawerWidth = event.currentTarget.parentElement?.offsetWidth;
    if (!drawerWidth) {
      return;
    }
    if (event.key === "ArrowLeft") {
      resizeTo(drawerWidth + KEYBOARD_RESIZE_STEP);
    }
    if (event.key === "ArrowRight") {
      resizeTo(drawerWidth - KEYBOARD_RESIZE_STEP);
    }
  };

  return (
    <hr
      aria-label="Resize feedback panel"
      aria-orientation="vertical"
      className="absolute inset-y-0 left-0 z-10 m-0 hidden h-full w-1.5 cursor-ew-resize touch-none border-0 transition-colors hover:bg-primary/20 focus-visible:bg-primary/30 focus-visible:outline-none md:block"
      onKeyDown={handleKeyDown}
      onPointerDown={(event) =>
        event.currentTarget.setPointerCapture(event.pointerId)
      }
      onPointerMove={handlePointerMove}
      tabIndex={0}
    />
  );
}
