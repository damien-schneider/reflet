"use client";

import { Label } from "@ctrl-ui/react/ui/label";
import { Switch } from "@ctrl-ui/react/ui/switch";
import { Text } from "@ctrl-ui/react/ui/typography";
import type { ReactNode } from "react";

interface SettingSwitchRowProps {
  checked: boolean;
  description: string;
  disabled?: boolean;
  id: string;
  label: string;
  onCheckedChange: (checked: boolean) => void;
  status?: ReactNode;
}

export function SettingSwitchRow({
  checked,
  description,
  disabled,
  id,
  label,
  onCheckedChange,
  status,
}: SettingSwitchRowProps) {
  const descriptionId = `${id}-description`;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <Label htmlFor={id}>{label}</Label>
        <Text as="p" id={descriptionId} tone="muted">
          {description}
        </Text>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {status}
        <Switch
          aria-describedby={descriptionId}
          checked={checked}
          disabled={disabled}
          id={id}
          onCheckedChange={onCheckedChange}
        />
      </div>
    </div>
  );
}
