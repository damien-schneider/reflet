"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@ctrl-ui/react/ui/popover";
import { Switch } from "@ctrl-ui/react/ui/switch";
import { Gear } from "@phosphor-icons/react";
import { Label } from "@/components/ui/label";

interface SettingsPopoverProps {
  isSaving: boolean;
  onToggle: (enabled: boolean) => void;
  supportEnabled: boolean;
}

export function SettingsPopover({
  supportEnabled,
  onToggle,
  isSaving,
}: SettingsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger render={<Button size="xs" variant="surface" />}>
        <Gear aria-hidden />
        Settings
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Inbox settings</PopoverTitle>
          <PopoverDescription>
            Let visitors start conversations from your public board.
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex items-center justify-between gap-4 pt-1">
          <Label htmlFor="support-popover-toggle">
            Enable public support page
          </Label>
          <Switch
            checked={supportEnabled}
            disabled={isSaving}
            id="support-popover-toggle"
            onCheckedChange={onToggle}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
