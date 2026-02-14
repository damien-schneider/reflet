"use client";

import {
  CaretDown,
  Clock,
  Fire,
  Lightning,
  Sparkle,
  TreeStructure,
  X,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useCallback, useState } from "react";

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Priority = "critical" | "high" | "medium" | "low" | "none";
type Complexity =
  | "trivial"
  | "simple"
  | "moderate"
  | "complex"
  | "very_complex";

export interface AiAnalysisDisplayProps {
  feedbackId: Id<"feedback">;
  aiPriority?: Priority | null;
  aiPriorityReasoning?: string | null;
  aiComplexity?: Complexity | null;
  aiComplexityReasoning?: string | null;
  aiTimeEstimate?: string | null;
  priority?: Priority | null;
  complexity?: Complexity | null;
  timeEstimate?: string | null;
  isAdmin: boolean;
}

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

const COMPLEXITY_CONFIG: Record<Complexity, { label: string; color: string }> =
  {
    trivial: { label: "Trivial", color: "green" },
    simple: { label: "Simple", color: "blue" },
    moderate: { label: "Moderate", color: "yellow" },
    complex: { label: "Complex", color: "orange" },
    very_complex: { label: "Very Complex", color: "red" },
  };

const PRIORITY_OPTIONS: Priority[] = [
  "critical",
  "high",
  "medium",
  "low",
  "none",
];
const COMPLEXITY_OPTIONS: Complexity[] = [
  "trivial",
  "simple",
  "moderate",
  "complex",
  "very_complex",
];

const isPriority = (value: string): value is Priority =>
  (PRIORITY_OPTIONS as readonly string[]).includes(value);

const isComplexity = (value: string): value is Complexity =>
  (COMPLEXITY_OPTIONS as readonly string[]).includes(value);

function PriorityBadge({
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

function ComplexityBadge({
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

type TimeUnit = "minutes" | "hours" | "days" | "weeks";

const TIME_UNIT_OPTIONS: { value: TimeUnit; label: string }[] = [
  { value: "minutes", label: "min" },
  { value: "hours", label: "h" },
  { value: "days", label: "d" },
  { value: "weeks", label: "w" },
];

const TIME_UNIT_VALUES: TimeUnit[] = TIME_UNIT_OPTIONS.map((o) => o.value);

const isTimeUnit = (value: string): value is TimeUnit =>
  (TIME_UNIT_VALUES as readonly string[]).includes(value);

const TIME_UNIT_LABELS: Record<TimeUnit, string> = {
  minutes: "minutes",
  hours: "hours",
  days: "days",
  weeks: "weeks",
};

const NUMBER_OPTIONS_BY_UNIT: Record<TimeUnit, number[]> = {
  minutes: [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60],
  hours: [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24],
  days: [1, 2, 3, 4, 5, 6, 7],
  weeks: [1, 2, 3, 4, 6, 8],
};

const TIME_ESTIMATE_REGEX =
  /^(\d+)\s*(minutes?|min|hours?|h|days?|d|weeks?|w)$/i;

function parseTimeEstimate(estimate: string): {
  amount: number;
  unit: TimeUnit;
} {
  const match = estimate.match(TIME_ESTIMATE_REGEX);
  if (!match) {
    return { amount: 1, unit: "hours" };
  }
  const amount = Number.parseInt(match[1], 10);
  const rawUnit = match[2].toLowerCase();
  let unit: TimeUnit = "hours";
  if (rawUnit.startsWith("min")) {
    unit = "minutes";
  } else if (rawUnit.startsWith("h")) {
    unit = "hours";
  } else if (rawUnit.startsWith("d")) {
    unit = "days";
  } else if (rawUnit.startsWith("w")) {
    unit = "weeks";
  }
  return { amount, unit };
}

function formatTimeEstimate(amount: number, unit: TimeUnit): string {
  return `${amount} ${TIME_UNIT_LABELS[unit]}`;
}

function TimeEstimateBadge({
  feedbackId,
  effectiveEstimate,
  aiTimeEstimate,
  isOverridden,
  isAdmin,
  hasHumanOverride,
}: {
  feedbackId: Id<"feedback">;
  effectiveEstimate: string;
  aiTimeEstimate?: string | null;
  isOverridden: boolean;
  isAdmin: boolean;
  hasHumanOverride: boolean;
}) {
  const updateAnalysis = useMutation(api.feedback_actions.updateAnalysis);
  const parsed = parseTimeEstimate(effectiveEstimate);
  const [amount, setAmount] = useState(parsed.amount);
  const [unit, setUnit] = useState<TimeUnit>(parsed.unit);
  const [isOpen, setIsOpen] = useState(false);

  const handleSave = useCallback(
    async (newAmount: number, newUnit: TimeUnit) => {
      const formatted = formatTimeEstimate(newAmount, newUnit);
      if (formatted !== effectiveEstimate) {
        await updateAnalysis({
          feedbackId,
          timeEstimate: formatted,
        });
      }
    },
    [feedbackId, effectiveEstimate, updateAnalysis]
  );

  const handleClear = useCallback(async () => {
    await updateAnalysis({
      feedbackId,
      clearTimeEstimate: true,
    });
    setIsOpen(false);
  }, [feedbackId, updateAnalysis]);

  const handleAmountChange = useCallback(
    (value: string) => {
      const newAmount = Number.parseInt(value, 10);
      if (Number.isNaN(newAmount) || newAmount < 1) {
        return;
      }
      setAmount(newAmount);
      handleSave(newAmount, unit);
    },
    [unit, handleSave]
  );

  const handleUnitChange = useCallback(
    (value: string) => {
      if (!isTimeUnit(value)) {
        return;
      }
      const newUnit = value;
      setUnit(newUnit);
      const options = NUMBER_OPTIONS_BY_UNIT[newUnit];
      const closestAmount = options.reduce((prev, curr) =>
        Math.abs(curr - amount) < Math.abs(prev - amount) ? curr : prev
      );
      setAmount(closestAmount);
      handleSave(closestAmount, newUnit);
    },
    [amount, handleSave]
  );

  const tooltipContent = isOverridden
    ? `AI suggested: ${aiTimeEstimate}`
    : `AI Time Estimate: ${effectiveEstimate}`;

  const badge = (
    <Badge
      className="h-8 gap-1 rounded-full px-3 font-normal text-xs"
      color="purple"
    >
      <Clock className="h-3 w-3" />
      <span>{effectiveEstimate}</span>
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
        <TooltipContent>
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
        <TooltipContent>
          <p className="font-semibold text-xs">Time Estimate</p>
          <p className="mt-1 text-xs opacity-80">
            Estimated implementation time: {effectiveEstimate}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) {
          const p = parseTimeEstimate(effectiveEstimate);
          setAmount(p.amount);
          setUnit(p.unit);
        }
      }}
      open={isOpen}
    >
      <PopoverTrigger render={<button type="button" />}>{badge}</PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3" sideOffset={4}>
        <p className="mb-2 font-medium text-xs">Time estimate</p>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex h-8 cursor-pointer items-center gap-1 rounded-md border border-input bg-transparent px-2.5 text-sm"
              render={<button type="button" />}
            >
              {amount}
              <CaretDown className="h-3 w-3 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-48 w-20 overflow-auto"
            >
              <DropdownMenuRadioGroup
                onValueChange={handleAmountChange}
                value={String(amount)}
              >
                {NUMBER_OPTIONS_BY_UNIT[unit].map((n) => (
                  <DropdownMenuRadioItem key={n} value={String(n)}>
                    {n}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex h-8 cursor-pointer items-center gap-1 rounded-md border border-input bg-transparent px-2.5 text-sm"
              render={<button type="button" />}
            >
              {TIME_UNIT_LABELS[unit]}
              <CaretDown className="h-3 w-3 opacity-60" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-28">
              <DropdownMenuRadioGroup
                onValueChange={handleUnitChange}
                value={unit}
              >
                {TIME_UNIT_OPTIONS.map((opt) => (
                  <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                    {TIME_UNIT_LABELS[opt.value]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {hasHumanOverride && (
          <button
            className="mt-2 flex w-full items-center justify-center gap-1 border-t pt-2 text-muted-foreground text-xs hover:text-foreground"
            onClick={handleClear}
            type="button"
          >
            <X className="h-3 w-3" />
            Reset to AI value
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function AiAnalysisDisplay({
  feedbackId,
  aiPriority,
  aiPriorityReasoning,
  aiComplexity,
  aiComplexityReasoning,
  aiTimeEstimate,
  priority,
  complexity,
  timeEstimate,
  isAdmin,
}: AiAnalysisDisplayProps) {
  if (!isAdmin) {
    return null;
  }

  const effectivePriority = priority ?? aiPriority;
  const effectiveComplexity = complexity ?? aiComplexity;
  const effectiveTimeEstimate = timeEstimate ?? aiTimeEstimate;

  const hasAnyAnalysis =
    effectivePriority || effectiveComplexity || effectiveTimeEstimate;

  if (!hasAnyAnalysis) {
    return null;
  }

  const isPriorityOverridden = priority != null && priority !== aiPriority;
  const isComplexityOverridden =
    complexity != null && complexity !== aiComplexity;
  const isTimeOverridden =
    timeEstimate != null && timeEstimate !== aiTimeEstimate;

  return (
    <div className="flex items-center gap-1.5">
      {effectivePriority && (
        <PriorityBadge
          aiPriority={aiPriority}
          effectivePriority={effectivePriority}
          feedbackId={feedbackId}
          hasHumanOverride={priority != null}
          isAdmin={isAdmin}
          isOverridden={isPriorityOverridden}
          reasoning={aiPriorityReasoning}
        />
      )}
      {effectiveComplexity && (
        <ComplexityBadge
          aiComplexity={aiComplexity}
          effectiveComplexity={effectiveComplexity}
          feedbackId={feedbackId}
          hasHumanOverride={complexity != null}
          isAdmin={isAdmin}
          isOverridden={isComplexityOverridden}
          reasoning={aiComplexityReasoning}
        />
      )}
      {effectiveTimeEstimate && (
        <TimeEstimateBadge
          aiTimeEstimate={aiTimeEstimate}
          effectiveEstimate={effectiveTimeEstimate}
          feedbackId={feedbackId}
          hasHumanOverride={timeEstimate != null}
          isAdmin={isAdmin}
          isOverridden={isTimeOverridden}
        />
      )}
    </div>
  );
}
