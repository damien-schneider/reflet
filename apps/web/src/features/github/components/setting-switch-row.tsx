"use client";

import { Switch } from "@ctrl-ui/react/ui/switch";
import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/typography";

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
        <Text
          className="text-muted-foreground"
          id={descriptionId}
          variant="bodySmall"
        >
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
