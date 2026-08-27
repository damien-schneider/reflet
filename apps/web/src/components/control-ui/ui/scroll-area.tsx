"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import type { CSSProperties } from "react";
import type { ScrollAreaProps } from "@/components/control-ui/contracts";
import type { ScrollAreaKnobStyle } from "@/components/control-ui/knob-contracts";
import { cn } from "@/components/control-ui/lib/cn";

const maskXOverflowClasses = cn(
  "data-[overflow-x-start]:mask-l-from-[calc(100%_-_var(--scroll-fade-size))]",
  "data-[overflow-x-end]:mask-r-from-[calc(100%_-_var(--scroll-fade-size))]",
);

const maskYOverflowClasses = cn(
  "data-[overflow-y-start]:mask-t-from-[calc(100%_-_var(--scroll-fade-size))]",
  "data-[overflow-y-end]:mask-b-from-[calc(100%_-_var(--scroll-fade-size))]",
);

function Scrollbar({
  orientation,
  visibility,
  thumbStyle,
}: {
  orientation: "vertical" | "horizontal";
  visibility: ScrollAreaProps["scrollbarVisibility"];
  thumbStyle?: CSSProperties & ScrollAreaKnobStyle;
}) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      orientation={orientation}
      data-control-ui="scroll-area"
      data-control-family="scroll-area"
      data-slot="scrollbar"
      data-visibility={visibility}
      className={cn("m-px flex touch-none select-none", orientation === "vertical" ? "w-1.5 justify-center" : "h-1.5 flex-col")}
    >
      <ScrollAreaPrimitive.Thumb
        data-control-ui="scroll-area"
        data-control-family="scroll-area"
        data-slot="thumb"
        className={cn("flex-1", orientation === "vertical" ? "w-full" : "h-full")}
        style={thumbStyle}
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

function viewportStyle(maxHeight: ScrollAreaProps["maxHeight"], lockX: boolean, lockY: boolean): CSSProperties | undefined {
  if (!maxHeight && !lockX && !lockY) return undefined;
  return {
    ...(maxHeight ? { maxHeight } : {}),
    ...(lockX ? { overflowX: "hidden" } : {}),
    ...(lockY ? { overflowY: "hidden" } : {}),
  };
}

export function ScrollArea({
  className,
  viewportClassName,
  viewportProps,
  viewportRef,
  maxHeight,
  mask = true,
  lockAxis,
  scrollbarVisibility = "scroll",
  children,
  style,
  ...props
}: ScrollAreaProps) {
  const lockX = lockAxis === "x" || lockAxis === "both";
  const lockY = lockAxis === "y" || lockAxis === "both";
  const resolvedViewportStyle = viewportStyle(maxHeight, lockX, lockY);
  const { style: viewportPropsStyle, ...resolvedViewportProps } = viewportProps ?? {};
  const mergedViewportStyle = viewportPropsStyle || resolvedViewportStyle ? { ...viewportPropsStyle, ...resolvedViewportStyle } : undefined;
  const thumbStyle = style;
  const cornerStyle = style;

  return (
    <ScrollAreaPrimitive.Root
      {...props}
      data-control-ui="scroll-area"
      data-control-family="scroll-area"
      data-slot="root"
      className={cn("relative overflow-hidden", className)}
      style={style}
    >
      {/* overscroll stays at default so wheel falls through to parent — `overscroll-contain` would trap it */}
      <ScrollAreaPrimitive.Viewport
        data-control-ui="scroll-area"
        data-control-family="scroll-area"
        data-slot="viewport"
        {...resolvedViewportProps}
        data-scroll-area-part="viewport"
        ref={viewportRef}
        className={cn("h-full w-full", mask && !lockX && maskXOverflowClasses, mask && !lockY && maskYOverflowClasses, viewportClassName)}
        style={mergedViewportStyle}
      >
        <ScrollAreaPrimitive.Content
          data-control-ui="scroll-area"
          data-control-family="scroll-area"
          data-slot="content"
          style={{ minWidth: 0 }}
        >
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      {!lockY && <Scrollbar orientation="vertical" visibility={scrollbarVisibility} thumbStyle={thumbStyle} />}
      {!lockX && <Scrollbar orientation="horizontal" visibility={scrollbarVisibility} thumbStyle={thumbStyle} />}
      {!lockX && !lockY && (
        <ScrollAreaPrimitive.Corner
          data-control-ui="scroll-area"
          data-control-family="scroll-area"
          data-slot="corner"
          style={cornerStyle}
        />
      )}
    </ScrollAreaPrimitive.Root>
  );
}
