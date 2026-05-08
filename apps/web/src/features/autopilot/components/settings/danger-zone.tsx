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

interface ResetScopeGroup {
  description: string;
  items: string[];
  title: string;
}

export function DangerZone({
  isResetting,
  onReset,
  resetScope,
}: {
  isResetting: boolean;
  onReset: () => void;
  resetScope: ResetScopeGroup[] | undefined;
}) {
  const isResetScopeLoading = resetScope === undefined;

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
              Delete Autopilot&apos;s generated data and settings. The
              confirmation dialog shows the full deletion scope.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  className="shrink-0"
                  disabled={isResetting || isResetScopeLoading}
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
              <div className="max-h-72 overflow-y-auto rounded-lg border bg-muted/30 p-3">
                {isResetScopeLoading ? (
                  <p className="text-muted-foreground text-sm">
                    Loading reset scope...
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {resetScope.map((group) => (
                      <li className="space-y-1" key={group.title}>
                        <p className="font-medium text-sm">{group.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {group.description}
                        </p>
                        <ul className="list-disc space-y-1 pl-4 text-muted-foreground text-xs">
                          {group.items.map((item) => (
                            <li key={`${group.title}-${item}`}>{item}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
