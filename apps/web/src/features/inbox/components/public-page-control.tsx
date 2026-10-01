"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
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
import { ArrowSquareOut, Globe } from "@phosphor-icons/react";
import Link from "next/link";
import { Label } from "@/components/ui/label";

interface PublicPageControlProps {
  onToggle: (enabled: boolean) => void;
  publicHref: string;
  setting: { enabled: boolean; isSaving: boolean };
}

export function PublicPageControl({
  onToggle,
  publicHref,
  setting,
}: PublicPageControlProps) {
  return (
    <Popover>
      <PopoverTrigger render={<Button size="sm" variant="surface" />}>
        <Globe aria-hidden />
        Public support page
        <Badge color={setting.enabled ? "green" : "neutral"} size="sm">
          {setting.enabled ? "On" : "Off"}
        </Badge>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Public support page</PopoverTitle>
          <PopoverDescription>
            Visitors write to you from your public board. Their messages land in
            this inbox.
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex items-center justify-between gap-4 pt-1">
          <Label htmlFor="public-support-page-toggle">
            Accept messages from visitors
          </Label>
          <Switch
            checked={setting.enabled}
            disabled={setting.isSaving}
            id="public-support-page-toggle"
            onCheckedChange={onToggle}
          />
        </div>
        {setting.enabled && (
          <Link
            className="inline-flex items-center gap-1 pt-2 text-label text-primary-text underline-offset-4 hover:underline"
            href={publicHref}
            rel="noopener"
            target="_blank"
          >
            Open the public page
            <ArrowSquareOut aria-hidden className="size-3.5" />
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
}
