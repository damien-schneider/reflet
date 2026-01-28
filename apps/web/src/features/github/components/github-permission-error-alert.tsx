"use client";

import { ArrowsClockwise, Warning, X } from "@phosphor-icons/react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface GitHubPermissionErrorAlertProps {
  title?: string;
  message?: string;
  onResync: () => void;
  onDismiss?: () => void;
}

export function GitHubPermissionErrorAlert({
  title = "Missing GitHub permissions",
  message = "The GitHub App needs additional permissions to perform this action.",
  onResync,
  onDismiss,
}: GitHubPermissionErrorAlertProps) {
  return (
    <Alert className="mb-4" variant="destructive">
      <Warning className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        <p className="mt-2 text-muted-foreground">
          New permissions have been added to the GitHub App. Please resync your
          connection to grant these permissions.
        </p>
        <Button className="mt-3" onClick={onResync} size="sm" variant="outline">
          <ArrowsClockwise className="mr-2 h-4 w-4" />
          Resync GitHub Connection
        </Button>
      </AlertDescription>
      {onDismiss ? (
        <AlertAction>
          <Button
            className="h-6 w-6"
            onClick={onDismiss}
            size="icon"
            variant="ghost"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </AlertAction>
      ) : null}
    </Alert>
  );
}
