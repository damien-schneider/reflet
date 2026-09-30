"use client";

import { Field, FieldLabel } from "@ctrl-ui/react/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";

interface SwatchOption {
  fill: string;
  key: string;
  label: string;
  value: string;
}

interface SwatchSelectFieldProps {
  disabled?: boolean;
  emptyOptionLabel?: string;
  id: string;
  label: string;
  onValueChange: (value: string) => void;
  options: SwatchOption[];
  placeholder: string;
  value: string;
}

export function SwatchSelectField({
  disabled,
  emptyOptionLabel,
  id,
  label,
  onValueChange,
  options,
  placeholder,
  value,
}: SwatchSelectFieldProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        disabled={disabled}
        onValueChange={(next) => onValueChange(next ?? "")}
        value={value}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {emptyOptionLabel ? (
            <SelectItem value="">{emptyOptionLabel}</SelectItem>
          ) : null}
          {options.map((option) => (
            <SelectItem key={option.key} value={option.value}>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-full bg-(--swatch-fill)"
                  style={{ "--swatch-fill": option.fill }}
                />
                <span className="truncate">{option.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
