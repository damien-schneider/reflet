"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { toast } from "@ctrl-ui/react/ui/toast";
import { Sparkle } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import {
  COMPLEXITY_LABELS,
  FEEDBACK_PROPERTIES,
  PRIORITY_LABELS,
  resolvePropertyValue,
} from "@reflet/backend/convex/feedback/property_values";
import { useMutation } from "convex/react";
import { useState } from "react";

type AnalysisPropertyName = "priority" | "complexity" | "timeEstimate";
const isPriority = (
  value: string
): value is NonNullable<Doc<"feedback">["priority"]> =>
  Object.keys(PRIORITY_LABELS).some((option) => option === value);
const isComplexity = (
  value: string
): value is NonNullable<Doc<"feedback">["complexity"]> =>
  Object.keys(COMPLEXITY_LABELS).some((option) => option === value);
const CLEAR_PROPERTY = {
  complexity: { clearComplexity: true },
  priority: { clearPriority: true },
  timeEstimate: { clearTimeEstimate: true },
} as const;
const RESET_PROPERTY = {
  complexity: { resetComplexity: true },
  priority: { resetPriority: true },
  timeEstimate: { resetTimeEstimate: true },
} as const;

function propertyValueLabel(
  name: AnalysisPropertyName,
  value: string | null | undefined
) {
  if (value === null || value === undefined) {
    return "Not set";
  }
  if (name === "priority" && isPriority(value)) {
    return PRIORITY_LABELS[value];
  }
  if (name === "complexity" && isComplexity(value)) {
    return COMPLEXITY_LABELS[value];
  }
  return value;
}

export function AnalysisProperty({
  feedbackId,
  name,
  values,
}: {
  feedbackId: Id<"feedback">;
  name: AnalysisPropertyName;
  values: {
    human?: string | null;
    ai?: string | null;
    reasoning?: string | null;
    editable: boolean;
  };
}) {
  const effective = resolvePropertyValue(values.human, values.ai);
  const [open, setOpen] = useState(false);
  const [estimate, setEstimate] = useState("");
  const [saving, setSaving] = useState(false);
  const update = useMutation(api.feedback.triage_actions.updateAnalysis);
  const label = FEEDBACK_PROPERTIES[name].label;
  const origin = {
    ai: "AI proposal",
    human: "Human decision",
    unset: "No value",
  }[effective.origin];
  const options = name === "priority" ? PRIORITY_LABELS : COMPLEXITY_LABELS;

  async function save(value: string) {
    setSaving(true);
    try {
      if (name === "priority" && isPriority(value)) {
        await update({ feedbackId, priority: value });
      }
      if (name === "complexity" && isComplexity(value)) {
        await update({ complexity: value, feedbackId });
      }
      if (name === "timeEstimate") {
        await update({ feedbackId, timeEstimate: value.trim() });
      }
      setOpen(false);
    } catch (error) {
      toast.error(`Could not update ${label.toLowerCase()}`, {
        description: error instanceof Error ? error.message : "Try again",
      });
    } finally {
      setSaving(false);
    }
  }
  async function changeSource(reset: boolean) {
    setSaving(true);
    try {
      await update({
        feedbackId,
        ...(reset ? RESET_PROPERTY[name] : CLEAR_PROPERTY[name]),
      });
      setOpen(false);
    } catch (error) {
      toast.error(`Could not update ${label.toLowerCase()}`, {
        description: error instanceof Error ? error.message : "Try again",
      });
    } finally {
      setSaving(false);
    }
  }
  return (
    <Popover
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setEstimate(effective.value ?? "");
        }
      }}
      open={open}
    >
      <PopoverTrigger
        aria-label={`${label}: ${propertyValueLabel(name, effective.value)}. ${origin}`}
        render={<Button size="xs" variant="surface" />}
      >
        {effective.origin === "ai" && <Sparkle aria-hidden />}
        {label}: {propertyValueLabel(name, effective.value)}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-3">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-muted-foreground text-xs">
          {FEEDBACK_PROPERTIES[name].meaning}
        </p>
        <p className="text-sm">
          {origin}: {propertyValueLabel(name, effective.value)}
        </p>
        {values.ai !== null && (
          <p className="text-muted-foreground text-xs">
            AI proposal: {propertyValueLabel(name, values.ai)}
            {values.reasoning && ` — ${values.reasoning}`}
          </p>
        )}
        {values.editable && (
          <>
            {name === "timeEstimate" ? (
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (estimate.trim()) {
                    save(estimate);
                  }
                }}
              >
                <Input
                  aria-label="Time estimate"
                  maxLength={80}
                  onChange={(event) => setEstimate(event.target.value)}
                  placeholder="e.g. 2 days"
                  value={estimate}
                />
                <Button
                  disabled={saving || !estimate.trim()}
                  size="sm"
                  type="submit"
                >
                  Save
                </Button>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(options).map(([value, optionLabel]) => (
                  <Button
                    disabled={saving}
                    key={value}
                    onClick={() => save(value)}
                    size="xs"
                    variant={effective.value === value ? "surface" : "ghost"}
                  >
                    {optionLabel}
                  </Button>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1 border-t pt-2">
              <Button
                disabled={saving}
                onClick={() => changeSource(false)}
                size="xs"
                variant="ghost"
              >
                Clear value
              </Button>
              {effective.origin === "human" && (
                <Button
                  disabled={saving}
                  onClick={() => changeSource(true)}
                  size="xs"
                  variant="ghost"
                >
                  {values.ai === null
                    ? "Remove human decision"
                    : "Use AI proposal"}
                </Button>
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
