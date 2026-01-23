"use client";

import { Check, Copy, Gear, Power, Trash } from "@phosphor-icons/react";
import { api } from "@reflet-v2/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet-v2/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Muted, Text } from "@/components/ui/typography";

import { WidgetSettingsDialog } from "./widget-settings-dialog";

type WidgetWithSettings = Doc<"widgets"> & {
  settings: Doc<"widgetSettings"> | null;
  conversationCount: number;
};

interface WidgetCardProps {
  widget: WidgetWithSettings;
  orgSlug: string;
}

export function WidgetCard({ widget }: WidgetCardProps) {
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const updateWidget = useMutation(api.widget_admin.update);
  const removeWidget = useMutation(api.widget_admin.remove);

  const embedCode = `<script src="https://cdn.reflet.app/widget/v1.js" data-widget-id="${widget.widgetId}"></script>`;

  const copyEmbedCode = async () => {
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success("Embed code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleActive = async () => {
    try {
      await updateWidget({
        widgetId: widget._id as Id<"widgets">,
        isActive: !widget.isActive,
      });
      toast.success(
        widget.isActive ? "Widget deactivated" : "Widget activated"
      );
    } catch {
      toast.error("Failed to update widget");
    }
  };

  const handleDelete = async () => {
    if (
      // biome-ignore lint/suspicious/noAlert: Simple confirmation for destructive action
      !window.confirm(
        "Are you sure you want to delete this widget? This action cannot be undone."
      )
    ) {
      return;
    }
    try {
      await removeWidget({ widgetId: widget._id as Id<"widgets"> });
      toast.success("Widget deleted");
    } catch {
      toast.error("Failed to delete widget");
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{widget.name}</CardTitle>
              <Badge variant={widget.isActive ? "default" : "secondary"}>
                {widget.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={(props: React.ComponentProps<"button">) => (
                  <Button {...props} size="icon" variant="ghost">
                    <Gear className="h-4 w-4" />
                  </Button>
                )}
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <Gear className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleActive}>
                  <Power className="mr-2 h-4 w-4" />
                  {widget.isActive ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={handleDelete}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription>
            {widget.conversationCount} conversation
            {widget.conversationCount !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Text className="mb-2 font-medium" variant="bodySmall">
              Embed Code
            </Text>
            <div className="relative">
              <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
                {embedCode}
              </pre>
              <Button
                className="absolute top-2 right-2"
                onClick={copyEmbedCode}
                size="icon"
                variant="ghost"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Muted className="mt-1 text-xs">
              Add this script tag to your website&apos;s HTML
            </Muted>
          </div>

          {widget.settings && (
            <div className="flex flex-wrap gap-2 text-xs">
              <div
                className="flex items-center gap-1.5 rounded-full px-2 py-1"
                style={{ backgroundColor: `${widget.settings.primaryColor}20` }}
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: widget.settings.primaryColor }}
                />
                <span>{widget.settings.primaryColor}</span>
              </div>
              <Badge variant="outline">{widget.settings.position}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <WidgetSettingsDialog
        onOpenChange={setSettingsOpen}
        open={settingsOpen}
        widget={widget}
      />
    </>
  );
}
