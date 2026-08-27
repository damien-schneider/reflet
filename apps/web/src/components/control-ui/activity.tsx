"use client";

import { Check, ChevronRight, CircleAlert, CircleDashed, LoaderCircle } from "lucide-react";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { createContext, useContext } from "react";

import type { ActivityDetailFormat, ActivityKind, ActivityProps, ActivityState, ScrollAreaProps } from "@/components/control-ui/contracts";
import type { ActivityKnobStyle } from "@/components/control-ui/knob-contracts";
import { cn } from "@/components/control-ui/lib/cn";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/control-ui/ui/collapsible";
import { ScrollArea } from "@/components/control-ui/ui/scroll-area";

type ActivityStyleProps<Props, Style> = Omit<Props, "style"> & {
  style?: CSSProperties & Style;
};

const activityStatusLabels = {
  pending: "Pending",
  running: "Running",
  success: "Complete",
  error: "Failed",
} satisfies Record<ActivityState, string>;

const activityStatusIcons = {
  pending: CircleDashed,
  running: LoaderCircle,
  success: Check,
  error: CircleAlert,
} satisfies Record<ActivityState, typeof CircleDashed>;

type ActivityContextValue = {
  isError: boolean;
  isRunning: boolean;
  kind: ActivityKind;
  name?: string;
  state: ActivityState;
  statusLabel: ReactNode;
};

const ActivityContext = createContext<ActivityContextValue | null>(null);

function useActivityContext() {
  const context = useContext(ActivityContext);
  if (!context) throw new Error("Activity compound components must be rendered inside <Activity>.");
  return context;
}

function formatActivityTitle(value: string) {
  const words = value
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();

  return words ? `${words[0].toUpperCase()}${words.slice(1)}` : value;
}

export function Activity({ kind = "default", name, state = "pending", statusLabel, className, children, ...props }: ActivityProps) {
  const context = {
    isError: state === "error",
    isRunning: state === "running",
    kind,
    name,
    state,
    statusLabel: statusLabel ?? activityStatusLabels[state],
  };
  return (
    <ActivityContext.Provider value={context}>
      <Collapsible
        data-control-ui="activity"
        data-control-family="activity"
        data-slot="root"
        data-activity-state={state}
        data-activity-kind={kind}
        data-activity-name={name}
        aria-busy={context.isRunning || undefined}
        className={cn("group/activity my-1 min-w-0", className)}
        {...props}
      >
        <span
          role={context.isError ? "alert" : "status"}
          aria-live={context.isError ? "assertive" : "polite"}
          aria-atomic="true"
          data-control-ui="activity"
          data-control-family="activity"
          data-slot="announcement"
          data-status={state}
          className="sr-only"
        >
          {context.statusLabel}
        </span>
        {children}
      </Collapsible>
    </ActivityContext.Provider>
  );
}

export type ActivityRowProps = ActivityStyleProps<ComponentProps<"div">, ActivityKnobStyle>;

const activityRowClassName = "flex min-h-8 w-fit max-w-full items-center gap-2 px-1.5 py-1";

export function ActivityRow({ className, ...props }: ActivityRowProps) {
  return (
    <div
      data-control-ui="activity"
      data-control-family="activity"
      data-slot="row"
      {...props}
      className={cn(activityRowClassName, className)}
    />
  );
}

export type ActivityTriggerProps = ActivityStyleProps<ComponentProps<typeof CollapsibleTrigger>, ActivityKnobStyle> & {
  chevronProps?: ActivityStyleProps<ComponentProps<typeof ChevronRight>, ActivityKnobStyle> & { "data-slot"?: string };
};

export function ActivityTrigger({ className, children, chevronProps, ...props }: ActivityTriggerProps) {
  return (
    <CollapsibleTrigger
      data-control-ui="activity"
      data-control-family="activity"
      data-slot="trigger"
      {...props}
      className={cn(activityRowClassName, className)}
    >
      {children}
      <ChevronRight
        aria-hidden="true"
        data-control-ui="activity"
        data-control-family="activity"
        data-slot="chevron"
        {...chevronProps}
        className={cn("size-3.5 shrink-0", chevronProps?.className)}
      />
    </CollapsibleTrigger>
  );
}

export type ActivityIconProps = ActivityStyleProps<ComponentProps<"span">, ActivityKnobStyle>;

export function ActivityIcon({ className, children, ...props }: ActivityIconProps) {
  const activity = useActivityContext();
  const Icon = activityStatusIcons[activity.state];
  return (
    <span
      aria-hidden="true"
      data-control-ui="activity"
      data-control-family="activity"
      data-status-icon={children === undefined ? "" : undefined}
      data-slot="icon"
      {...props}
      className={cn("flex size-4 shrink-0 items-center justify-center [&_svg]:size-4", className)}
    >
      {children ?? <Icon />}
    </span>
  );
}

export type ActivityTitleProps = ActivityStyleProps<ComponentProps<"span">, ActivityKnobStyle>;

export function ActivityTitle({ className, children, ...props }: ActivityTitleProps) {
  const activity = useActivityContext();
  return (
    <span
      data-control-ui="activity"
      data-control-family="activity"
      data-slot="title"
      {...props}
      className={cn("min-w-0 flex-1 truncate", className)}
    >
      {children ?? (activity.name ? formatActivityTitle(activity.name) : undefined)}
    </span>
  );
}

export type ActivityStatusProps = ActivityStyleProps<ComponentProps<"span">, ActivityKnobStyle>;

export function ActivityStatus({ className, children, ...props }: ActivityStatusProps) {
  const activity = useActivityContext();
  return (
    <span
      data-control-ui="activity"
      data-control-family="activity"
      data-slot="status"
      data-kind={activity.kind}
      {...props}
      data-status={activity.state}
      className={cn("shrink-0", className)}
    >
      {children ?? activity.statusLabel}
    </span>
  );
}

export type ActivityContentProps = Omit<ComponentProps<typeof CollapsibleContent>, "children"> & {
  children?: ReactNode;
  maxHeight?: string | false;
  scrollAreaProps?: Omit<ScrollAreaProps, "children" | "maxHeight">;
};

export function ActivityContent({
  className,
  children,
  maxHeight = "var(--activity-content-max-height, min(24rem, 50dvh))",
  scrollAreaProps,
  ...props
}: ActivityContentProps) {
  const { className: scrollAreaClassName, viewportProps, lockAxis = "x", ...resolvedScrollAreaProps } = scrollAreaProps ?? {};
  const resolvedViewportProps = {
    ...viewportProps,
    "data-control-ui": viewportProps?.["data-control-ui"] ?? "activity",
    "data-slot": viewportProps?.["data-slot"] ?? "content-viewport",
  };
  return (
    <CollapsibleContent data-control-ui="activity" data-slot="content" className={className} {...props}>
      <ScrollArea
        maxHeight={maxHeight || undefined}
        lockAxis={lockAxis}
        viewportProps={resolvedViewportProps}
        className={cn("min-w-0", scrollAreaClassName)}
        {...resolvedScrollAreaProps}
      >
        <div className="grid min-w-0 gap-3 pb-2 pl-7.5 pr-1 pt-0.5">{children}</div>
      </ScrollArea>
    </CollapsibleContent>
  );
}

export type ActivityDetailProps = ComponentProps<"div"> & { style?: CSSProperties & ActivityKnobStyle };

export function ActivityDetail({ className, ...props }: ActivityDetailProps) {
  return (
    <div
      data-control-ui="activity"
      data-control-family="activity"
      data-slot="detail"
      {...props}
      className={cn("grid min-w-0 gap-1", className)}
    />
  );
}

export type ActivityDetailLabelProps = ActivityStyleProps<ComponentProps<"div">, ActivityKnobStyle>;

export function ActivityDetailLabel({ className, ...props }: ActivityDetailLabelProps) {
  return (
    <div
      data-control-ui="activity"
      data-control-family="activity"
      data-slot="detail-label"
      {...props}
      className={cn("uppercase", className)}
    />
  );
}

export type ActivityDetailContentProps = ActivityStyleProps<ComponentProps<"div">, ActivityKnobStyle> & {
  format?: ActivityDetailFormat;
};

export function ActivityDetailContent({ format = "text", className, ...props }: ActivityDetailContentProps) {
  return (
    <div
      data-control-ui="activity"
      data-control-family="activity"
      data-slot="detail-content"
      data-format={format}
      {...props}
      className={cn("min-w-0 whitespace-pre-wrap wrap-anywhere", format === "code" && "w-fit max-w-full px-2 py-1.5", className)}
    />
  );
}
