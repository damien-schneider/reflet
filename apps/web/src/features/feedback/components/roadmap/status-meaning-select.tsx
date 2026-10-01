"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { STATUS_DEFINITIONS } from "@reflet/backend/convex/organizations/status_definitions";
import { isFeedbackStatusValue } from "@reflet/backend/convex/shared/validators";

export function StatusMeaningSelect({
  value,
  onChange,
}: {
  value?: Doc<"feedback">["status"];
  onChange: (value: Doc<"feedback">["status"]) => void;
}) {
  return (
    <Select
      onValueChange={(next) => {
        if (isFeedbackStatusValue(next)) {
          onChange(next);
        }
      }}
      value={value ?? ""}
    >
      <SelectTrigger aria-label="Lifecycle meaning">
        <SelectValue placeholder="Choose lifecycle meaning" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(STATUS_DEFINITIONS).map(([key, definition]) => (
          <SelectItem key={key} value={key}>
            {definition.name} · {definition.group.replaceAll("_", " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
