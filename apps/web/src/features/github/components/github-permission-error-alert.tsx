"use client";

import { Alert, AlertDescription, AlertTitle } from "@ctrl-ui/react/ui/alert";
import { Button } from "@ctrl-ui/react/ui/button";
import { ArrowsClockwise, Warning, X } from "@phosphor-icons/react";

interface GitHubPermissionErrorAlertProps {
  message?: string;
  onDismiss?: () => void;
  onResync: () => void;
  title?: string;
}

export function GitHubPermissionErrorAlert({
  title = "Missing GitHub permissions",
  message = "The GitHub App needs additional permissions to perform this action.",
  onResync,
  onDismiss,
}: GitHubPermissionErrorAlertProps) {
  return (
    <Alert className="mb-4 pr-10" variant="destructive">
      <Warning className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        <p className="mt-2 text-muted-foreground">
          New permissions have been added to the GitHub App. Please resync your
          connection to grant these permissions.
        </p>
        <Button className="mt-3" onClick={onResync} size="xs" variant="surface">
          <ArrowsClockwise className="mr-2 h-4 w-4" />
          Resync GitHub Connection
        </Button>
      </AlertDescription>
      {onDismiss ? (
        <div className="absolute top-2 right-2">
          <Button
            className="h-6 w-6"
            iconOnly
            onClick={onDismiss}
            variant="ghost"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      ) : null}
    </Alert>
  );
}
