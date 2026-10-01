"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { Sparkle } from "@phosphor-icons/react";
import {
  FEEDBACK_PROPERTIES,
  resolvePropertyValue,
} from "@reflet/backend/convex/feedback/property_values";
import {
  AnalysisPropertyDescription,
  AnalysisPropertyEditor,
} from "@/features/feedback/components/properties/analysis/editor-sections";
import {
  type AnalysisPropertyProps,
  PROPERTY_ORIGIN_LABELS,
  propertyValueLabel,
} from "@/features/feedback/components/properties/analysis/property-definition";
import { useAnalysisEditor } from "@/features/feedback/components/properties/analysis/use-analysis-editor";

export function AnalysisProperty({
  feedbackId,
  name,
  values,
}: AnalysisPropertyProps) {
  const effective = resolvePropertyValue(values.human, values.ai);
  const editor = useAnalysisEditor({ feedbackId, name });
  const label = FEEDBACK_PROPERTIES[name].label;
  const valueLabel = propertyValueLabel(name, effective.value);
  const origin = PROPERTY_ORIGIN_LABELS[effective.origin];
  return (
    <Popover onOpenChange={editor.setOpen} open={editor.open}>
      <PopoverTrigger
        aria-label={`${label}: ${valueLabel}. ${origin}`}
        render={<Button size="xs" variant="surface" />}
      >
        {effective.origin === "ai" && <Sparkle aria-hidden />}
        <span data-property-label>{label}: </span>
        {valueLabel}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-3">
        <AnalysisPropertyDescription name={name} values={values} />
        {values.editable && editor.open && (
          <AnalysisPropertyEditor editor={editor} name={name} values={values} />
        )}
      </PopoverContent>
    </Popover>
  );
}
