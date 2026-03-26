"use client";

import { Gear } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

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
      <PopoverTrigger render={<Button size="sm" variant="outline" />}>
        <Gear className="h-4 w-4" />
        Settings
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Inbox Settings</PopoverTitle>
          <PopoverDescription>
            Configure your public support page
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex items-center justify-between pt-1">
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
