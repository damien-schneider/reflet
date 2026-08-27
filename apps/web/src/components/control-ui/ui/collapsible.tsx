"use client";

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import { useRender } from "@base-ui/react/use-render";
import type { ComponentProps, ReactNode } from "react";
import type { CollapsibleContentProps, CollapsibleProps, CollapsibleTriggerProps } from "@/components/control-ui/contracts";
import { cn } from "@/components/control-ui/lib/cn";

function CollapsibleTriggerElement({
  triggerProps,
  open,
  render,
  className,
  children,
}: {
  triggerProps: ComponentProps<"button"> & { "data-control-ui"?: string; "data-control-family"?: string; "data-slot"?: string };
  open: boolean;
  render: CollapsibleTriggerProps["render"];
  className?: string;
  children: ReactNode;
}) {
  const state = { open };

  return useRender({
    defaultTagName: "button",
    render,
    state,
    props: {
      ...triggerProps,
      "data-control-ui": triggerProps["data-control-ui"] ?? "collapsible",
      "data-control-family": triggerProps["data-control-family"] ?? "collapsible",
      "data-slot": triggerProps["data-slot"] ?? "trigger",
      "data-state": open ? "open" : "closed",
      "data-collapsible-part": "trigger",
      className: cn(triggerProps.className, className),
      children,
    },
  });
}

// emits its own anatomy and state hooks, so consumers never style on Base UI's private attributes
export function Collapsible({ className, ...props }: CollapsibleProps) {
  return (
    <CollapsiblePrimitive.Root
      className={className}
      render={(renderProps, state) => (
        <div
          data-control-ui="collapsible"
          data-control-family="collapsible"
          data-slot="root"
          {...renderProps}
          data-state={state.open ? "open" : "closed"}
          className={renderProps.className}
        />
      )}
      {...props}
    />
  );
}

export function CollapsibleTrigger({ render, className, children, ...props }: CollapsibleTriggerProps) {
  return (
    <CollapsiblePrimitive.Trigger
      data-control-ui="collapsible"
      data-control-family="collapsible"
      data-slot="trigger"
      className="cursor-pointer"
      {...props}
      data-collapsible-part="trigger"
      render={(triggerProps, state) => (
        <CollapsibleTriggerElement triggerProps={triggerProps} open={state.open} render={render} className={className}>
          {children}
        </CollapsibleTriggerElement>
      )}
    />
  );
}

export function CollapsibleContent({ className, children, ...props }: CollapsibleContentProps) {
  return (
    <CollapsiblePrimitive.Panel
      className="h-[var(--collapsible-panel-height)] overflow-hidden data-ending-style:h-0 data-starting-style:h-0"
      {...props}
      render={(renderProps, state) => (
        <div
          data-control-ui="collapsible"
          data-control-family="collapsible"
          data-slot="content"
          {...renderProps}
          data-collapsible-part="content"
          data-state={state.open ? "open" : "closed"}
          className={renderProps.className}
        />
      )}
    >
      <div className={className}>{children}</div>
    </CollapsiblePrimitive.Panel>
  );
}
