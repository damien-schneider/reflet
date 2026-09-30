"use client";

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
import { CaretDown, Sparkle, TreeStructure, X } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { TagBadge } from "@/components/tag-badge";
import type { Complexity } from "./ai-analysis-types";
import { COMPLEXITY_OPTIONS, isComplexity } from "./ai-analysis-types";

const COMPLEXITY_CONFIG: Record<Complexity, { label: string; color: string }> =
  {
    complex: { color: "orange", label: "Complex" },
    moderate: { color: "yellow", label: "Moderate" },
    simple: { color: "blue", label: "Simple" },
    trivial: { color: "green", label: "Trivial" },
    very_complex: { color: "red", label: "Very Complex" },
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
  const updateAnalysis = useMutation(
    api.feedback.triage_actions.updateAnalysis
  );
  const config = COMPLEXITY_CONFIG[effectiveComplexity];

  const handleChange = async (value: string) => {
    if (!isComplexity(value)) {
      return;
    }
    await updateAnalysis({
      complexity: value,
      feedbackId,
    });
  };

  const handleClear = async () => {
    await updateAnalysis({
      clearComplexity: true,
      feedbackId,
    });
  };

  const aiNote =
    isOverridden && aiComplexity
      ? `AI suggested: ${COMPLEXITY_CONFIG[aiComplexity].label}`
      : reasoning;

  const badgeContent = (
    <>
      <TreeStructure aria-hidden />
      <span>C: {config.label}</span>
      <Sparkle
        aria-hidden
        className={isOverridden ? "opacity-80" : "opacity-50"}
        weight={isOverridden ? "fill" : "regular"}
      />
      {isAdmin && <CaretDown aria-hidden className="opacity-70" />}
    </>
  );
  const badgeButton = (
    <TagBadge color={config.color} render={<button type="button" />} />
  );

  const tooltip = (
    <TooltipContent className="max-w-xs">
      <p className="font-semibold text-xs">Complexity: {config.label}</p>
      {aiNote && <p className="mt-1 text-xs opacity-80">{aiNote}</p>}
    </TooltipContent>
  );

  if (!isAdmin) {
    return (
      <Tooltip>
        <TooltipTrigger
          aria-label={`Complexity: ${config.label}`}
          render={badgeButton}
        >
          {badgeContent}
        </TooltipTrigger>
        {tooltip}
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          aria-label={`Complexity: ${config.label}. Change complexity`}
          render={
            <DropdownMenuTrigger className="select-none" render={badgeButton} />
          }
        >
          {badgeContent}
        </TooltipTrigger>
        {tooltip}
      </Tooltip>
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
