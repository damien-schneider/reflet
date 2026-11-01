import { cn } from "@ctrl-ui/react/lib/cn";
import { Text } from "@ctrl-ui/react/ui/typography";
import type { PointerEvent, ReactNode } from "react";
import { canDragWindow, dragWindow } from "../../window-host";
import { DIAL_SIZE } from "./dial-geometry";

const INTERACTIVE =
  "button, a, input, select, textarea, [role='button'], [data-control-family='scroll-area']";

function startWindowDrag(event: PointerEvent<HTMLElement>) {
  const isOnControl =
    event.target instanceof Element && event.target.closest(INTERACTIVE);
  if (event.button === 0 && !isOnControl) {
    dragWindow();
  }
}

export function DialLegend({
  action,
  children,
  isExpanded = false,
  title,
}: {
  action?: ReactNode;
  children?: ReactNode;
  isExpanded?: boolean;
  title: string;
}) {
  return (
    <div
      className="live-dial-chip dark flex min-h-0 min-w-0 max-w-full flex-col items-center gap-0.5 rounded-[18px] px-3 py-1.5 text-foreground"
      data-expanded={isExpanded || undefined}
      data-skin=""
    >
      <div className="flex min-w-0 max-w-full items-center gap-1">
        <Text className="truncate" size="label" title={title}>
          {title}
        </Text>
        {action}
      </div>
      {children}
    </div>
  );
}

export function DialFrame({
  children,
  hub,
  legend,
  notice,
}: {
  children?: ReactNode;
  hub: ReactNode;
  legend: ReactNode;
  notice?: ReactNode;
}) {
  const isDraggable = canDragWindow();
  return (
    <main
      className="flex h-dvh select-none flex-col items-center gap-2 overflow-hidden px-2 pt-3 text-center text-foreground"
      onPointerDown={isDraggable ? startWindowDrag : undefined}
    >
      <section
        aria-label="Reflet Live"
        className="live-dial relative shrink-0 rounded-full"
        style={{ height: DIAL_SIZE, width: DIAL_SIZE }}
      >
        {children}
        <div
          className={cn(
            "live-dial-hub absolute flex flex-col items-center justify-center gap-1 rounded-full",
            isDraggable && "cursor-grab active:cursor-grabbing"
          )}
        >
          {hub}
        </div>
        {notice}
      </section>
      {legend}
    </main>
  );
}
