"use client";

import { Code, Cursor, Eye, SignOut, Timer } from "@phosphor-icons/react";
import {
  TRIGGER_DESCRIPTIONS,
  TRIGGER_LABELS,
} from "@/features/surveys/lib/constants";
import { cn } from "@/lib/utils";
import type { TriggerType } from "@/store/surveys";

const TRIGGER_ICON_MAP = {
  manual: Code,
  page_visit: Eye,
  time_delay: Timer,
  exit_intent: SignOut,
  feedback_submitted: Cursor,
} as const;

const TRIGGER_ORDER: TriggerType[] = [
  "manual",
  "page_visit",
  "time_delay",
  "exit_intent",
  "feedback_submitted",
];

interface TriggerPickerProps {
  onChange: (type: TriggerType) => void;
  value: TriggerType;
}

export function TriggerPicker({ value, onChange }: TriggerPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      {TRIGGER_ORDER.map((type) => {
        const Icon = TRIGGER_ICON_MAP[type];
        const isSelected = value === type;
        const { description } = TRIGGER_DESCRIPTIONS[type];

        return (
          <button
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3 text-left transition-all",
              isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "hover:border-foreground/20 hover:bg-accent/50"
            )}
            key={type}
            onClick={() => onChange(type)}
            type="button"
          >
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
                isSelected ? "bg-primary/10" : "bg-muted"
              )}
            >
              <Icon
                className={cn(
                  "size-4 transition-colors",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "font-medium text-sm",
                  isSelected && "text-primary"
                )}
              >
                {TRIGGER_LABELS[type]}
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs leading-snug">
                {description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface TriggerPickerCompactProps {
  onChange: (type: TriggerType) => void;
  value: TriggerType;
}

export function TriggerPickerCompact({
  value,
  onChange,
}: TriggerPickerCompactProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {TRIGGER_ORDER.map((type) => {
        const Icon = TRIGGER_ICON_MAP[type];
        const isSelected = value === type;
        const { description } = TRIGGER_DESCRIPTIONS[type];

        return (
          <button
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all",
              isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "hover:border-foreground/20 hover:bg-accent/50"
            )}
            key={type}
            onClick={() => onChange(type)}
            type="button"
          >
            <Icon
              className={cn(
                "size-4 shrink-0",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}
            />
            <div className="min-w-0">
              <p className="truncate font-medium text-xs">
                {TRIGGER_LABELS[type]}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
