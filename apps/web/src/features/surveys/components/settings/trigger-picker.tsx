"use client";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldItem,
  FieldLabel,
  FieldTitle,
} from "@ctrl-ui/react/ui/field";
import { Radio, RadioGroup } from "@ctrl-ui/react/ui/radio-group";
import {
  Code,
  Cursor,
  Eye,
  Lightning,
  SignOut,
  Timer,
} from "@phosphor-icons/react";
import { TRIGGER_TYPES, type TriggerType } from "@reflet/survey-core";
import {
  TRIGGER_DESCRIPTIONS,
  TRIGGER_LABELS,
} from "@/features/surveys/lib/constants";

const TRIGGER_ICON_MAP = {
  event: Lightning,
  exit_intent: SignOut,
  feedback_submitted: Cursor,
  manual: Code,
  page_visit: Eye,
  time_delay: Timer,
} as const;

interface TriggerPickerProps {
  labelledBy: string;
  onChange: (type: TriggerType) => void;
  value: TriggerType;
}

export function TriggerPicker({
  labelledBy,
  value,
  onChange,
}: TriggerPickerProps) {
  return (
    <Field>
      <RadioGroup
        aria-labelledby={labelledBy}
        className="grid w-full grid-cols-1 sm:grid-cols-2"
        onValueChange={onChange}
        value={value}
      >
        {TRIGGER_TYPES.map((type) => {
          const Icon = TRIGGER_ICON_MAP[type];

          return (
            <FieldItem key={type}>
              <FieldLabel variant="card">
                <Radio value={type} />
                <FieldContent>
                  <FieldTitle className="flex items-center gap-2">
                    <Icon aria-hidden />
                    {TRIGGER_LABELS[type]}
                  </FieldTitle>
                  <FieldDescription>
                    {TRIGGER_DESCRIPTIONS[type].description}
                  </FieldDescription>
                </FieldContent>
              </FieldLabel>
            </FieldItem>
          );
        })}
      </RadioGroup>
    </Field>
  );
}
