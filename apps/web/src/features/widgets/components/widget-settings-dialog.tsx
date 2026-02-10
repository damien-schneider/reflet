"use client";

import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Muted } from "@/components/ui/typography";

type WidgetWithSettings = Doc<"widgets"> & {
  settings: Doc<"widgetSettings"> | null;
  conversationCount: number;
};

interface WidgetSettingsDialogProps {
  widget: WidgetWithSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WidgetPosition = "bottom-right" | "bottom-left";

export function WidgetSettingsDialog({
  widget,
  open,
  onOpenChange,
}: WidgetSettingsDialogProps) {
  const updateSettings = useMutation(api.widget_admin.updateSettings);
  const [isSaving, setIsSaving] = useState(false);

  const [primaryColor, setPrimaryColor] = useState(
    widget.settings?.primaryColor ?? "#5c6d4f"
  );
  const [position, setPosition] = useState<WidgetPosition>(
    widget.settings?.position ?? "bottom-right"
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    widget.settings?.welcomeMessage ?? "Hi there! How can we help you?"
  );
  const [greetingMessage, setGreetingMessage] = useState(
    widget.settings?.greetingMessage ?? ""
  );
  const [showLauncher, setShowLauncher] = useState(
    widget.settings?.showLauncher ?? true
  );
  const [autoOpen, setAutoOpen] = useState(widget.settings?.autoOpen ?? false);
  const [zIndex, setZIndex] = useState(widget.settings?.zIndex ?? 9999);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        widgetId: widget._id as Id<"widgets">,
        primaryColor,
        position,
        welcomeMessage,
        greetingMessage: greetingMessage || undefined,
        showLauncher,
        autoOpen,
        zIndex,
      });
      toast.success("Widget settings saved");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Widget Settings</DialogTitle>
          <DialogDescription>
            Customize the appearance and behavior of your chat widget.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="primary-color">Primary Color</Label>
            <div className="flex gap-2">
              <Input
                className="w-12 p-1"
                disabled={isSaving}
                id="primary-color-picker"
                onChange={(e) => setPrimaryColor(e.target.value)}
                type="color"
                value={primaryColor}
              />
              <Input
                className="flex-1"
                disabled={isSaving}
                id="primary-color"
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#5c6d4f"
                value={primaryColor}
              />
            </div>
            <Muted className="text-xs">
              The main color used for the widget bubble and header
            </Muted>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="position">Position</Label>
            <Select
              onValueChange={(val) => setPosition(val as WidgetPosition)}
              value={position}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                <SelectItem value="bottom-left">Bottom Left</SelectItem>
              </SelectContent>
            </Select>
            <Muted className="text-xs">
              Where the widget bubble appears on the page
            </Muted>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="welcome-message">Welcome Message</Label>
            <Input
              disabled={isSaving}
              id="welcome-message"
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Hi there! How can we help you?"
              value={welcomeMessage}
            />
            <Muted className="text-xs">
              The greeting shown at the top of the chat window
            </Muted>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="greeting-message">Subtitle (optional)</Label>
            <Input
              disabled={isSaving}
              id="greeting-message"
              onChange={(e) => setGreetingMessage(e.target.value)}
              placeholder="We typically reply within a few hours"
              value={greetingMessage}
            />
            <Muted className="text-xs">
              A secondary message shown below the welcome message
            </Muted>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="z-index">Z-Index</Label>
            <Input
              disabled={isSaving}
              id="z-index"
              min={1}
              onChange={(e) => setZIndex(Number(e.target.value))}
              type="number"
              value={zIndex}
            />
            <Muted className="text-xs">
              Higher values place the widget above other elements
            </Muted>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="show-launcher">Show Launcher</Label>
              <Muted className="text-xs">
                Display the chat bubble on the page
              </Muted>
            </div>
            <Switch
              checked={showLauncher}
              disabled={isSaving}
              id="show-launcher"
              onCheckedChange={setShowLauncher}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-open">Auto Open</Label>
              <Muted className="text-xs">
                Automatically open the chat on page load
              </Muted>
            </div>
            <Switch
              checked={autoOpen}
              disabled={isSaving}
              id="auto-open"
              onCheckedChange={setAutoOpen}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isSaving} onClick={handleSave}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
