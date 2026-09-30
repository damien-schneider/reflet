"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import {
  ColorPicker,
  ColorPickerArea,
  ColorPickerContent,
  ColorPickerHue,
  ColorPickerInput,
  ColorPickerTrigger,
} from "@ctrl-ui/react/ui/color-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ctrl-ui/react/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@ctrl-ui/react/ui/number-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { Switch } from "@ctrl-ui/react/ui/switch";
import { toast } from "@ctrl-ui/react/ui/toast";
import { Minus, Plus } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { type ChangeEvent, useState } from "react";
import { Label } from "@/components/ui/label";
import { Muted } from "@/components/ui/typography";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/branding";

type WidgetWithSettings = Doc<"widgets"> & {
  settings: Doc<"widgetSettings"> | null;
  conversationCount: number;
};

interface WidgetSettingsDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  widget: WidgetWithSettings;
}

type WidgetPosition = "bottom-right" | "bottom-left";

const DEFAULT_Z_INDEX = 9999;
const MIN_Z_INDEX = 1;

export function WidgetSettingsDialog({
  widget,
  open,
  onOpenChange,
}: WidgetSettingsDialogProps) {
  const updateSettings = useMutation(api.widget.admin_settings.updateSettings);
  const [isSaving, setIsSaving] = useState(false);

  const [primaryColor, setPrimaryColor] = useState(
    widget.settings?.primaryColor ?? DEFAULT_PRIMARY_COLOR
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
  const [zIndex, setZIndex] = useState(
    widget.settings?.zIndex ?? DEFAULT_Z_INDEX
  );

  const handleSave = async () => {
    const settings = {
      autoOpen,
      greetingMessage: greetingMessage || undefined,
      position,
      primaryColor,
      showLauncher,
      welcomeMessage,
      widgetId: widget._id,
      zIndex,
    };
    setIsSaving(true);
    try {
      await updateSettings(settings);
      toast.success("Chat settings saved");
      onOpenChange(false);
    } catch {
      toast.error("Couldn’t save settings. Try again.");
    }
    setIsSaving(false);
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chat settings</DialogTitle>
          <DialogDescription>
            Customize how {widget.name} looks and behaves on your site.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Field>
            <FieldLabel htmlFor="primary-color">Primary color</FieldLabel>
            <ColorPicker
              disabled={isSaving}
              format="hex"
              onValueChange={setPrimaryColor}
              value={primaryColor}
            >
              <div className="flex items-center gap-2">
                <ColorPickerTrigger aria-label="Pick the widget primary color" />
                <ColorPickerInput
                  aria-label="Primary color"
                  className="flex-1"
                  id="primary-color"
                />
              </div>
              <ColorPickerContent>
                <ColorPickerArea />
                <ColorPickerHue />
              </ColorPickerContent>
            </ColorPicker>
            <FieldDescription>
              Used for the chat bubble and header.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="position">Position</FieldLabel>
            <Select
              onValueChange={(val) => {
                if (val === "bottom-right" || val === "bottom-left") {
                  setPosition(val);
                }
              }}
              value={position}
            >
              <SelectTrigger className="w-full" id="position">
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bottom-right">Bottom right</SelectItem>
                <SelectItem value="bottom-left">Bottom left</SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription>
              Where the chat bubble appears on the page.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="welcome-message">Welcome message</FieldLabel>
            <Input
              disabled={isSaving}
              id="welcome-message"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setWelcomeMessage(e.target.value)
              }
              placeholder="Hi there! How can we help you?"
              value={welcomeMessage}
            />
            <FieldDescription>
              The greeting shown at the top of the chat window.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="greeting-message">
              Subtitle (optional)
            </FieldLabel>
            <Input
              disabled={isSaving}
              id="greeting-message"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setGreetingMessage(e.target.value)
              }
              placeholder="We typically reply within a few hours"
              value={greetingMessage}
            />
            <FieldDescription>
              Shown below the welcome message.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="z-index">Z-index</FieldLabel>
            <NumberField
              disabled={isSaving}
              format={{ useGrouping: false }}
              id="z-index"
              min={MIN_Z_INDEX}
              onValueChange={(next) => setZIndex(next ?? MIN_Z_INDEX)}
              value={zIndex}
            >
              <NumberFieldGroup>
                <NumberFieldDecrement aria-label="Decrease z-index">
                  <Minus aria-hidden />
                </NumberFieldDecrement>
                <NumberFieldInput className="tabular-nums" />
                <NumberFieldIncrement aria-label="Increase z-index">
                  <Plus aria-hidden />
                </NumberFieldIncrement>
              </NumberFieldGroup>
            </NumberField>
            <FieldDescription>
              Raise it if the chat appears behind other elements on your site.
            </FieldDescription>
          </Field>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="show-launcher">Show launcher</Label>
              <Muted className="text-caption" id="show-launcher-hint">
                Display the chat bubble on the page.
              </Muted>
            </div>
            <Switch
              aria-describedby="show-launcher-hint"
              checked={showLauncher}
              disabled={isSaving}
              id="show-launcher"
              onCheckedChange={setShowLauncher}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="auto-open">Open automatically</Label>
              <Muted className="text-caption" id="auto-open-hint">
                Open the chat as soon as the page loads.
              </Muted>
            </div>
            <Switch
              aria-describedby="auto-open-hint"
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
            variant="surface"
          >
            Cancel
          </Button>
          <Button
            disabled={isSaving}
            onClick={handleSave}
            tone="primary"
            variant="solid"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
