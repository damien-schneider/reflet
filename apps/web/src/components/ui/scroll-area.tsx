"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

type ScrollDirection = "vertical" | "horizontal" | "both";

function getOverflowStyle(direction: ScrollDirection): CSSProperties {
  if (direction === "vertical") {
    return { overflowX: "hidden", overflowY: "scroll" };
  }
  if (direction === "horizontal") {
    return { overflowX: "scroll", overflowY: "hidden" };
  }
  return {};
}

function ScrollArea({
  className,
  classNameViewport,
  styleViewport,
  children,
  direction = "both",
  ...props
}: ScrollAreaPrimitive.Root.Props & {
  classNameViewport?: string;
  styleViewport?: CSSProperties;
  direction?: ScrollDirection;
}) {
  return (
    <ScrollAreaPrimitive.Root
      className={cn("relative", className)}
      data-slot="scroll-area"
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        className={cn(
          "focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1",
          classNameViewport
        )}
        data-slot="scroll-area-viewport"
        style={{ ...getOverflowStyle(direction), ...styleViewport }}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      className={cn(
        "data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent flex touch-none p-px transition-colors select-none",
        className
      )}
      data-orientation={orientation}
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        className="rounded-full bg-border relative flex-1"
        data-slot="scroll-area-thumb"
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
