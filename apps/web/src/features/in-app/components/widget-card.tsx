"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@ctrl-ui/react/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ctrl-ui/react/ui/dropdown-menu";
import { toast } from "@ctrl-ui/react/ui/toast";
import { DotsThreeVertical, Gear, Power, Trash } from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc } from "@reflet/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { Muted, Text } from "@/components/ui/typography";

import { WidgetSettingsDialog } from "./widget-settings-dialog";

const POSITION_LABELS = {
  "bottom-left": "Bottom left",
  "bottom-right": "Bottom right",
} as const;

export type WidgetWithSettings = Doc<"widgets"> & {
  settings: Doc<"widgetSettings"> | null;
  conversationCount: number;
};

interface WidgetCardProps {
  orgSlug: string;
  widget: WidgetWithSettings;
}

export function WidgetCard({ widget }: WidgetCardProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const updateWidget = useMutation(api.widget.admin.update);
  const removeWidget = useMutation(api.widget.admin_settings.remove);

  const embedCode = `<script src="https://www.reflet.app/widget/reflet-widget.v1.js" data-widget-id="${widget.widgetId}"></script>`;
  const embedLabelId = `embed-code-${widget._id}`;

  const toggleActive = async () => {
    try {
      await updateWidget({
        isActive: !widget.isActive,
        widgetId: widget._id,
      });
    } catch {
      toast.error(
        widget.isActive
          ? "Couldn’t deactivate the chat. Try again."
          : "Couldn’t activate the chat. Try again."
      );
    }
  };

  const handleDelete = async () => {
    try {
      await removeWidget({ widgetId: widget._id });
    } catch {
      toast.error("Couldn’t delete the chat. Try again.");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <CardTitle className="truncate">{widget.name}</CardTitle>
              <Badge color={widget.isActive ? "green" : "neutral"} size="sm">
                {widget.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Actions for ${widget.name}`}
                iconOnly
                variant="ghost"
              >
                <DotsThreeVertical aria-hidden className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <Gear aria-hidden className="size-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleActive}>
                  <Power aria-hidden className="size-4" />
                  {widget.isActive ? "Deactivate" : "Activate"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="menu-item-danger"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash aria-hidden className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription className="tabular-nums">
            {widget.conversationCount} conversation
            {widget.conversationCount === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Text
              className="mb-2 font-medium"
              id={embedLabelId}
              variant="bodySmall"
            >
              Embed code
            </Text>
            <figure aria-labelledby={embedLabelId} className="relative">
              <pre className="overflow-x-auto rounded-md bg-muted p-3 pr-12 font-mono text-xs">
                {embedCode}
              </pre>
              <div className="absolute top-1 right-1">
                <CopyButton
                  label="Copy embed code"
                  size="md"
                  value={embedCode}
                />
              </div>
            </figure>
            <Muted className="mt-1 text-xs">
              Add this script tag to your site’s HTML.
            </Muted>
          </div>

          {widget.settings ? (
            <div className="flex flex-wrap gap-2">
              <Badge size="sm" variant="outline">
                <span
                  aria-hidden
                  className="size-3 rounded-full outline outline-1 outline-foreground/10 -outline-offset-1"
                  style={{ backgroundColor: widget.settings.primaryColor }}
                />
                <span className="font-mono">
                  {widget.settings.primaryColor}
                </span>
              </Badge>
              <Badge size="sm" variant="outline">
                {POSITION_LABELS[widget.settings.position]}
              </Badge>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <WidgetSettingsDialog
        onOpenChange={setSettingsOpen}
        open={settingsOpen}
        widget={widget}
      />

      <DestructiveConfirmDialog
        confirmLabel="Delete chat"
        description="The embed code stops working and all of its conversations are deleted. This can’t be undone."
        onConfirm={handleDelete}
        onOpenChange={setShowDeleteDialog}
        open={showDeleteDialog}
        title={`Delete ${widget.name}?`}
      />
    </>
  );
}
