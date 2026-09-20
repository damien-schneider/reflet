"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ctrl-ui/react/ui/tooltip";
import { CaretDown, Fire, Lightning, Sparkle, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { TagBadge } from "@/components/tag-badge";
import { cn } from "@/lib/utils";
import type { Priority } from "./ai-analysis-types";
import { isPriority, PRIORITY_OPTIONS } from "./ai-analysis-types";

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string; icon: typeof Fire }
> = {
  critical: { color: "red", icon: Fire, label: "Critical" },
  high: { color: "orange", icon: Lightning, label: "High" },
  low: { color: "blue", icon: Sparkle, label: "Low" },
  medium: { color: "yellow", icon: Sparkle, label: "Medium" },
  none: { color: "gray", icon: Sparkle, label: "None" },
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
  const updateAnalysis = useMutation(
    api.feedback.triage_actions.updateAnalysis
  );
  const config = PRIORITY_CONFIG[effectivePriority];
  const Icon = config.icon;

  const handleChange = async (value: string) => {
    if (!isPriority(value)) {
      return;
    }
    await updateAnalysis({
      feedbackId,
      priority: value,
    });
  };

  const handleClear = async () => {
    await updateAnalysis({
      clearPriority: true,
      feedbackId,
    });
  };

  const aiNote =
    isOverridden && aiPriority
      ? `AI suggested: ${PRIORITY_CONFIG[aiPriority].label}`
      : reasoning;

  const badge = (
    <TagBadge
      className="h-8 gap-1 rounded-full px-3 font-normal text-xs"
      color={config.color}
    >
      <Icon className="h-3 w-3" weight="fill" />
      <span>P: {config.label}</span>
      <Sparkle
        className={cn(
          "h-2.5 w-2.5",
          isOverridden ? "opacity-80" : "opacity-50"
        )}
        weight={isOverridden ? "fill" : "regular"}
      />
      {isAdmin && <CaretDown className="h-3 w-3 opacity-70" />}
    </TagBadge>
  );

  const tooltip = (
    <TooltipContent className="max-w-xs">
      <p className="font-semibold text-xs">Priority: {config.label}</p>
      {aiNote && <p className="mt-1 text-xs opacity-80">{aiNote}</p>}
    </TooltipContent>
  );

  if (!isAdmin) {
    return (
      <Tooltip>
        <TooltipTrigger
          aria-label={`Priority: ${config.label}`}
          render={
            <Button className="h-auto rounded-full p-0" variant="quiet" />
          }
        >
          {badge}
        </TooltipTrigger>
        {tooltip}
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          aria-label={`Priority: ${config.label}. Change priority`}
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  className="h-auto select-none rounded-full p-0"
                  variant="quiet"
                />
              }
            />
          }
        >
          {badge}
        </TooltipTrigger>
        {tooltip}
      </Tooltip>
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
