"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { FlowNode, FlowNodeBody, FlowNodeHeader } from "@ctrl-ui/react/ui/flow";
import {
  DotsThree,
  type Icon,
  Warning,
  WarningCircle,
} from "@phosphor-icons/react";
import type { FlowIssue } from "@reflet/survey-core";
import type { ReactNode } from "react";
import {
  FLOW_NODE_MAX_HEIGHT,
  FLOW_NODE_WIDTH,
} from "@/features/surveys/lib/flow/layout";

interface NodeCardProps {
  badge?: ReactNode;
  children: ReactNode;
  icon: Icon;
  isSelected: boolean;
  menu?: ReactNode;
  title: string;
}

export function NodeCard({
  badge,
  children,
  icon: StepIcon,
  isSelected,
  menu,
  title,
}: NodeCardProps) {
  return (
    <FlowNode
      selected={isSelected}
      style={{ maxHeight: FLOW_NODE_MAX_HEIGHT, width: FLOW_NODE_WIDTH }}
    >
      <FlowNodeHeader>
        <StepIcon
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
        <p className="min-w-0 flex-1 truncate" title={title}>
          {title}
        </p>
        {badge}
        {menu}
      </FlowNodeHeader>
      <FlowNodeBody className="mx-1.5 mb-1.5 min-h-0 overflow-hidden rounded-lg bg-muted/60 px-2.5 py-2">
        {children}
      </FlowNodeBody>
    </FlowNode>
  );
}

export function NodeRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-end tabular-nums">{value}</span>
    </div>
  );
}

export function NodeSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-border/70 border-t pt-1.5">
      <span className="text-muted-foreground">{title}</span>
      {children}
    </div>
  );
}

export function IssueBadge({ issues }: { issues: readonly FlowIssue[] }) {
  if (issues.length === 0) {
    return null;
  }
  const hasError = issues.some((issue) => issue.severity === "error");
  const BadgeIcon = hasError ? WarningCircle : Warning;
  const summary = issues.map((issue) => issue.message).join(" ");
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium text-xs tabular-nums",
        hasError
          ? "bg-red-500/10 text-red-700 dark:text-red-300"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
      )}
      title={summary}
    >
      <BadgeIcon aria-hidden className="size-3.5" weight="bold" />
      {issues.length}
      <span className="sr-only">
        {hasError ? "Needs fixing: " : "Heads-up: "}
        {summary}
      </span>
    </span>
  );
}

export interface NodeMenuAction {
  disabled?: boolean;
  isDestructive?: boolean;
  label: string;
  onSelect: () => void;
}

export function NodeMenu({
  actions,
  stepTitle,
}: {
  actions: NodeMenuAction[];
  stepTitle: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for “${stepTitle}”`}
        className="nodrag nopan shrink-0"
        iconOnly
        size="xs"
        variant="ghost"
      >
        <DotsThree aria-hidden weight="bold" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {actions.map((action) => (
          <DropdownMenuItem
            className={action.isDestructive ? "text-destructive" : undefined}
            disabled={action.disabled}
            key={action.label}
            onClick={action.onSelect}
          >
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
