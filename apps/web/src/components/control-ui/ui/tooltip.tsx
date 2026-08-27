"use client";

import type { CSSProperties } from "react";

import type { TooltipPopupProps, TooltipPositionerProps } from "@base-ui/react/tooltip";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import type { ComponentProps, Ref } from "react";
import type { PopupKnobStyle } from "@/components/control-ui/knob-contracts";
import { cn } from "@/components/control-ui/lib/cn";
import { skinEffects, skinId } from "@/components/control-ui/skin";

type TooltipProviderProps = Omit<ComponentProps<typeof TooltipPrimitive.Provider>, "delay" | "timeout"> & {
  delay?: number;
  timeout?: number;
  delayDuration?: number;
  skipDelayDuration?: number;
};

export function TooltipProvider({ delay, delayDuration, timeout, skipDelayDuration, ...props }: TooltipProviderProps) {
  const resolvedDelay = delay ?? delayDuration;
  const resolvedTimeout = timeout ?? skipDelayDuration;

  return (
    <TooltipPrimitive.Provider
      {...(resolvedDelay !== undefined ? { delay: resolvedDelay } : {})}
      {...(resolvedTimeout !== undefined ? { timeout: resolvedTimeout } : {})}
      {...props}
    />
  );
}

export function Tooltip(props: ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root {...props} />;
}

type TooltipTriggerProps = ComponentProps<typeof TooltipPrimitive.Trigger> & {
  ref?: Ref<HTMLButtonElement>;
};

export function TooltipTrigger({ render, children, ref, ...props }: TooltipTriggerProps) {
  return (
    <TooltipPrimitive.Trigger ref={ref} render={render} {...props}>
      {children}
    </TooltipPrimitive.Trigger>
  );
}

type TooltipContentPositionerProps = Omit<TooltipPositionerProps, keyof TooltipPopupProps>;

export type TooltipContentProps = Omit<TooltipPopupProps & Omit<TooltipContentPositionerProps, "style">, "style"> & {
  style?: CSSProperties & PopupKnobStyle;
} & {
  arrow?: boolean;
  hidden?: boolean;
  ref?: Ref<HTMLDivElement>;
};

export function TooltipContent({
  className,
  children,
  side = "top",
  sideOffset = 8,
  align = "center",
  alignOffset = 0,
  arrowPadding = 10,
  anchor,
  positionMethod,
  collisionBoundary,
  collisionPadding,
  sticky,
  disableAnchorTracking,
  collisionAvoidance,
  arrow = true,
  hidden = false,
  ref,
  ...props
}: TooltipContentProps) {
  if (hidden) return null;

  const positionerProps: TooltipContentPositionerProps = {
    side,
    sideOffset,
    align,
    alignOffset,
    arrowPadding,
    anchor,
    positionMethod,
    collisionBoundary,
    collisionPadding,
    sticky,
    disableAnchorTracking,
    collisionAvoidance,
  };

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        data-control-ui="tooltip"
        data-popup-kind="tooltip"
        data-control-family="popup"
        data-slot="positioner"
        data-skin={skinId()}
        data-effects={skinEffects()}
        className="z-[90]"
        {...positionerProps}
      >
        <TooltipPrimitive.Popup
          ref={ref}
          role="tooltip"
          data-control-ui="tooltip"
          data-popup-kind="tooltip"
          data-control-family="popup"
          data-popup-part="surface"
          data-slot="content"
          data-arrow={arrow ? "true" : undefined}
          className={cn("relative flex w-fit max-w-xs flex-col px-2.5 py-1", className)}
          {...props}
        >
          {children}
          {arrow ? (
            <TooltipPrimitive.Arrow
              data-control-ui="tooltip"
              data-control-family="popup"
              data-popup-kind="tooltip"
              data-slot="arrow"
              className={cn(
                "flex",
                "data-[side=top]:-bottom-[8px]",
                "data-[side=bottom]:-top-[8px]",
                "data-[side=left]:-right-[10px]",
                "data-[side=right]:-left-[10px]",
              )}
            >
              <TooltipArrowSvg />
            </TooltipPrimitive.Arrow>
          ) : null}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

function TooltipArrowSvg() {
  return (
    <svg aria-hidden="true" focusable="false" width="12" height="8" viewBox="0 0 12 8" fill="none" overflow="visible">
      <path
        data-control-ui="tooltip"
        data-popup-kind="tooltip"
        data-control-family="popup"
        data-slot="arrow-shape"
        d="M0 7L4 2Q6 0 8 2L12 7L12 8L0 8Z"
      />
    </svg>
  );
}
