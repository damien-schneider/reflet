"use client";

import { IconAlertTriangle, IconTrash } from "@tabler/icons-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/features/autopilot/components/settings/section-header";

export function DangerZone({
  isResetting,
  onReset,
}: {
  isResetting: boolean;
  onReset: () => void;
}) {
  return (
    <section className="space-y-5">
      <SectionHeader
        description="Irreversible actions. Proceed with caution."
        icon={IconAlertTriangle}
        title="Danger Zone"
      />

      <Card className="border-destructive/30">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="min-w-0">
            <p className="font-medium text-sm">Reset Autopilot</p>
            <p className="text-muted-foreground text-xs">
              Delete all autopilot data: work items, runs, knowledge, documents,
              activity logs, and config. This cannot be undone.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  className="shrink-0"
                  disabled={isResetting}
                  variant="destructive"
                >
                  <IconTrash className="mr-1.5 size-4" />
                  {isResetting ? "Resetting..." : "Reset All Data"}
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogMedia className="bg-destructive/10 text-destructive">
                  <IconAlertTriangle />
                </AlertDialogMedia>
                <AlertDialogTitle>Reset Autopilot?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all autopilot data for this
                  organization. You will need to re-initialize Autopilot from
                  scratch.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={isResetting}
                  onClick={onReset}
                  variant="destructive"
                >
                  {isResetting ? "Resetting..." : "Reset Everything"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </section>
  );
}
