"use client";

import { CaretDown, Sparkle, TreeStructure, X } from "@phosphor-icons/react";
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
import type { Complexity } from "./ai-analysis-types";
import { COMPLEXITY_OPTIONS, isComplexity } from "./ai-analysis-types";

const COMPLEXITY_CONFIG: Record<Complexity, { label: string; color: string }> =
  {
    trivial: { label: "Trivial", color: "green" },
    simple: { label: "Simple", color: "blue" },
    moderate: { label: "Moderate", color: "yellow" },
    complex: { label: "Complex", color: "orange" },
    very_complex: { label: "Very Complex", color: "red" },
  };

export function ComplexityBadge({
  feedbackId,
  effectiveComplexity,
  aiComplexity,
  reasoning,
  isOverridden,
  isAdmin,
  hasHumanOverride,
}: {
  feedbackId: Id<"feedback">;
  effectiveComplexity: Complexity;
  aiComplexity?: Complexity | null;
  reasoning?: string | null;
  isOverridden: boolean;
  isAdmin: boolean;
  hasHumanOverride: boolean;
}) {
  const updateAnalysis = useMutation(api.feedback_actions.updateAnalysis);
  const config = COMPLEXITY_CONFIG[effectiveComplexity];

  const handleChange = useCallback(
    async (value: string) => {
      if (!isComplexity(value)) {
        return;
      }
      await updateAnalysis({
        feedbackId,
        complexity: value,
      });
    },
    [feedbackId, updateAnalysis]
  );

  const handleClear = useCallback(async () => {
    await updateAnalysis({
      feedbackId,
      clearComplexity: true,
    });
  }, [feedbackId, updateAnalysis]);

  const tooltipContent =
    isOverridden && aiComplexity
      ? `AI suggested: ${COMPLEXITY_CONFIG[aiComplexity].label}`
      : (reasoning ?? `AI Complexity: ${config.label}`);

  const badge = (
    <Badge
      className="h-8 gap-1 rounded-full px-3 font-normal text-xs"
      color={config.color}
    >
      <TreeStructure className="h-3 w-3" />
      <span>C: {config.label}</span>
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
          <p className="font-semibold text-xs">Complexity: {config.label}</p>
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
          value={effectiveComplexity}
        >
          {COMPLEXITY_OPTIONS.map((option) => {
            const optConfig = COMPLEXITY_CONFIG[option];
            return (
              <DropdownMenuRadioItem key={option} value={option}>
                <TreeStructure className="h-3 w-3" />
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
