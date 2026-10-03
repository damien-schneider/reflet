"use client";

import { cn } from "@ctrl-ui/react/lib/cn";
import { Code, Cursor, Eye, SignOut, Timer } from "@phosphor-icons/react";
import { useId } from "react";
import {
  TRIGGER_DESCRIPTIONS,
  TRIGGER_LABELS,
} from "@/features/surveys/lib/constants";
import type { TriggerType } from "@/store/surveys";

const TRIGGER_ICON_MAP = {
  exit_intent: SignOut,
  feedback_submitted: Cursor,
  manual: Code,
  page_visit: Eye,
  time_delay: Timer,
} as const;

const TRIGGER_ORDER: TriggerType[] = [
  "manual",
  "page_visit",
  "time_delay",
  "exit_intent",
  "feedback_submitted",
];

interface TriggerPickerProps {
  density?: "comfortable" | "compact";
  labelledBy: string;
  onChange: (type: TriggerType) => void;
  value: TriggerType;
}

export function TriggerPicker({
  density = "comfortable",
  labelledBy,
  value,
  onChange,
}: TriggerPickerProps) {
  const name = useId();
  const compact = density === "compact";

  return (
    <div
      aria-labelledby={labelledBy}
      className={cn(
        compact
          ? "grid grid-cols-1 gap-2 sm:grid-cols-2"
          : "flex flex-col gap-2"
      )}
      role="radiogroup"
    >
      {TRIGGER_ORDER.map((type) => {
        const Icon = TRIGGER_ICON_MAP[type];
        const isSelected = value === type;

        return (
          <label
            className={cn(
              "flex cursor-pointer gap-3 rounded-lg border text-left hover:bg-accent/50",
              "has-checked:border-primary has-checked:bg-primary/5",
              "has-focus-visible:outline-2 has-focus-visible:outline-ring has-focus-visible:outline-offset-2",
              compact ? "items-center px-3 py-2.5" : "items-start p-3"
            )}
            key={type}
          >
            <input
              checked={isSelected}
              className="sr-only"
              name={name}
              onChange={() => onChange(type)}
              type="radio"
              value={type}
            />
            <Icon
              aria-hidden
              className={cn(
                "size-4 shrink-0",
                !compact && "mt-0.5",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}
            />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-sm">
                {TRIGGER_LABELS[type]}
              </span>
              <span
                className={cn(
                  "mt-0.5 block text-pretty text-muted-foreground",
                  compact ? "text-xs" : "text-sm"
                )}
              >
                {TRIGGER_DESCRIPTIONS[type].description}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
