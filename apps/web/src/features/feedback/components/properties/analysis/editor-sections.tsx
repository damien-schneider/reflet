"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  COMPLEXITY_LABELS,
  FEEDBACK_PROPERTIES,
  PRIORITY_LABELS,
  resolvePropertyValue,
} from "@reflet/backend/convex/feedback/property_values";
import { useState } from "react";
import {
  type AnalysisEditor,
  type AnalysisPropertyName,
  type AnalysisPropertyValues,
  PROPERTY_ORIGIN_LABELS,
  propertyValueLabel,
} from "@/features/feedback/components/properties/analysis/property-definition";

export function AnalysisPropertyDescription({
  name,
  values,
}: {
  name: AnalysisPropertyName;
  values: AnalysisPropertyValues;
}) {
  const effective = resolvePropertyValue(values.human, values.ai);
  return (
    <>
      <p className="font-medium text-sm">{FEEDBACK_PROPERTIES[name].label}</p>
      <p className="text-muted-foreground text-xs">
        {FEEDBACK_PROPERTIES[name].meaning}
      </p>
      <p className="text-sm">
        {PROPERTY_ORIGIN_LABELS[effective.origin]}:{" "}
        {propertyValueLabel(name, effective.value)}
      </p>
      {values.ai !== null && (
        <p className="text-muted-foreground text-xs">
          AI proposal: {propertyValueLabel(name, values.ai)}
          {values.reasoning && ` — ${values.reasoning}`}
        </p>
      )}
    </>
  );
}

function TimeEstimateEditor({
  initialValue,
  editor,
}: {
  initialValue: string | null | undefined;
  editor: AnalysisEditor;
}) {
  const [estimate, setEstimate] = useState(initialValue ?? "");
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (estimate.trim()) {
          editor.save(estimate);
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
        disabled={editor.saving || !estimate.trim()}
        size="sm"
        type="submit"
      >
        Save
      </Button>
    </form>
  );
}

function AnalysisValueOptions({
  name,
  currentValue,
  editor,
}: {
  name: AnalysisPropertyName;
  currentValue: string | null | undefined;
  editor: AnalysisEditor;
}) {
  const options = name === "priority" ? PRIORITY_LABELS : COMPLEXITY_LABELS;
  return (
    <div className="grid grid-cols-2 gap-1">
      {Object.entries(options).map(([value, label]) => (
        <Button
          disabled={editor.saving}
          key={value}
          onClick={() => editor.save(value)}
          size="xs"
          variant={currentValue === value ? "surface" : "ghost"}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}

function AnalysisSourceControls({
  values,
  editor,
}: {
  values: AnalysisPropertyValues;
  editor: AnalysisEditor;
}) {
  const effective = resolvePropertyValue(values.human, values.ai);
  return (
    <div className="flex flex-wrap gap-1 border-t pt-2">
      <Button
        disabled={editor.saving}
        onClick={() => editor.changeSource(false)}
        size="xs"
        variant="ghost"
      >
        Clear value
      </Button>
      {effective.origin === "human" && (
        <Button
          disabled={editor.saving}
          onClick={() => editor.changeSource(true)}
          size="xs"
          variant="ghost"
        >
          {values.ai === null ? "Remove human decision" : "Use AI proposal"}
        </Button>
      )}
    </div>
  );
}

export function AnalysisPropertyEditor({
  name,
  values,
  editor,
}: {
  name: AnalysisPropertyName;
  values: AnalysisPropertyValues;
  editor: AnalysisEditor;
}) {
  const effective = resolvePropertyValue(values.human, values.ai);
  return (
    <>
      {name === "timeEstimate" ? (
        <TimeEstimateEditor editor={editor} initialValue={effective.value} />
      ) : (
        <AnalysisValueOptions
          currentValue={effective.value}
          editor={editor}
          name={name}
        />
      )}
      <AnalysisSourceControls editor={editor} values={values} />
    </>
  );
}
