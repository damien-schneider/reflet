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
  title = "GitHub needs more permissions",
  message = "The Reflet GitHub App isn’t allowed to do this yet.",
  onResync,
  onDismiss,
}: GitHubPermissionErrorAlertProps) {
  return (
    <Alert className="pr-10" variant="destructive">
      <Warning aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p className="text-pretty">{message}</p>
        <p className="mt-2 text-pretty text-muted-foreground">
          Reconnect GitHub and approve the new permissions, then try again.
        </p>
        <Button className="mt-3" onClick={onResync} size="xs" variant="surface">
          <ArrowsClockwise
            aria-hidden="true"
            className="size-4"
            data-icon="inline-start"
          />
          Reconnect GitHub
        </Button>
      </AlertDescription>
      {onDismiss ? (
        <div className="absolute top-2 right-2">
          <Button iconOnly onClick={onDismiss} size="xs" variant="ghost">
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      ) : null}
    </Alert>
  );
}
