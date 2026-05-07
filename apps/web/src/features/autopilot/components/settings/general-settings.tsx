"use client";

import { IconCode, IconSettings } from "@tabler/icons-react";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SectionHeader } from "@/features/autopilot/components/settings/section-header";

export function GeneralSettings({
  autoMergePRs,
  disabled,
  onAutoMergeChange,
}: {
  autoMergePRs: boolean;
  disabled: boolean;
  onAutoMergeChange: (value: boolean) => void;
}) {
  return (
    <section className="space-y-5">
      <SectionHeader
        description="Master controls for your Autopilot instance"
        icon={IconSettings}
        title="General"
      />

      <Card>
        <CardContent className="divide-y">
          <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                <IconCode className="size-4" />
              </div>
              <div>
                <Label className="font-medium text-sm" htmlFor="auto-merge-prs">
                  Auto-merge PRs
                </Label>
                <p className="text-muted-foreground text-xs">
                  Merge PRs automatically after CI passes
                </p>
              </div>
            </div>
            <Switch
              checked={autoMergePRs}
              disabled={disabled}
              id="auto-merge-prs"
              onCheckedChange={onAutoMergeChange}
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
