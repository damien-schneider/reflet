"use client";

import { CaretDown, Fire, Lightning, Sparkle, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback } from "react";

import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Priority } from "./ai-analysis-types";
import { isPriority, PRIORITY_OPTIONS } from "./ai-analysis-types";

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string; icon: typeof Fire }
> = {
  critical: { label: "Critical", color: "red", icon: Fire },
  high: { label: "High", color: "orange", icon: Lightning },
  medium: { label: "Medium", color: "yellow", icon: Sparkle },
  low: { label: "Low", color: "blue", icon: Sparkle },
  none: { label: "None", color: "gray", icon: Sparkle },
};

export function PriorityBadge({
  feedbackId,
  effectivePriority,
  aiPriority,
  reasoning,
  isOverridden,
  isAdmin,
  hasHumanOverride,
}: {
  feedbackId: Id<"feedback">;
  effectivePriority: Priority;
  aiPriority?: Priority | null;
  reasoning?: string | null;
  isOverridden: boolean;
  isAdmin: boolean;
  hasHumanOverride: boolean;
}) {
  const updateAnalysis = useMutation(api.feedback_actions.updateAnalysis);
  const config = PRIORITY_CONFIG[effectivePriority];
  const Icon = config.icon;

  const handleChange = useCallback(
    async (value: string) => {
      if (!isPriority(value)) {
        return;
      }
      await updateAnalysis({
        feedbackId,
        priority: value,
      });
    },
    [feedbackId, updateAnalysis]
  );

  const handleClear = useCallback(async () => {
    await updateAnalysis({
      feedbackId,
      clearPriority: true,
    });
  }, [feedbackId, updateAnalysis]);

  const tooltipContent =
    isOverridden && aiPriority
      ? `AI suggested: ${PRIORITY_CONFIG[aiPriority].label}`
      : (reasoning ?? `AI Priority: ${config.label}`);

  const badge = (
    <Badge
      className="h-8 gap-1 rounded-full px-3 font-normal text-xs"
      color={config.color}
    >
      <Icon className="h-3 w-3" weight="fill" />
      <span>P: {config.label}</span>
      <Tooltip>
        <TooltipTrigger onClick={(e) => e.stopPropagation()} render={<span />}>
          <Sparkle
            className={cn(
              "h-2.5 w-2.5",
              isOverridden ? "opacity-80" : "opacity-50"
            )}
            weight={isOverridden ? "fill" : "regular"}
          />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
      {isAdmin && <CaretDown className="h-3 w-3 opacity-70" />}
    </Badge>
  );

  if (!isAdmin) {
    return (
      <Tooltip>
        <TooltipTrigger>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-semibold text-xs">Priority: {config.label}</p>
          {reasoning && <p className="mt-1 text-xs opacity-80">{reasoning}</p>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex cursor-pointer select-none items-center"
        render={<button type="button" />}
      >
        {badge}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuRadioGroup
          onValueChange={handleChange}
          value={effectivePriority}
        >
          {PRIORITY_OPTIONS.map((option) => {
            const optConfig = PRIORITY_CONFIG[option];
            const OptIcon = optConfig.icon;
            return (
              <DropdownMenuRadioItem key={option} value={option}>
                <OptIcon className="h-3 w-3" weight="fill" />
                {optConfig.label}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
        {hasHumanOverride && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleClear}>
              <X className="h-3 w-3" />
              Reset to AI value
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
