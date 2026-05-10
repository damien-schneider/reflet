"use client";

import {
  Check,
  Spinner,
  Warning,
  WebhooksLogo,
  X,
} from "@phosphor-icons/react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { H3, Muted, Text } from "@/components/ui/typography";

import { GitHubPermissionErrorAlert } from "./github-permission-error-alert";

interface WebhookSetupCardProps {
  error?: { code: string; message: string } | null;
  hasWebhook: boolean;
  isAdmin: boolean;
  isSettingUp: boolean;
  onClearError?: () => void;
  onResync?: () => void;
  onSetup: () => void;
}

function WebhookSetupError({
  error,
  onClearError,
  onResync,
}: {
  error?: { code: string; message: string } | null;
  onClearError?: () => void;
  onResync?: () => void;
}) {
  if (!error) {
    return null;
  }

  const isPermissionError = error.code === "GITHUB_PERMISSION_DENIED";

  if (isPermissionError && onResync) {
    return (
      <GitHubPermissionErrorAlert
        message="The GitHub App is missing the required webhook permissions."
        onDismiss={onClearError}
        onResync={onResync}
        title="Webhook setup failed"
      />
    );
  }

  return (
    <Alert className="mb-4" variant="destructive">
      <Warning className="size-4" />
      <AlertTitle>Webhook setup failed</AlertTitle>
      <AlertDescription>
        <p>{error.message}</p>
      </AlertDescription>
      {onClearError ? (
        <AlertAction>
          <Button
            className="size-6"
            onClick={onClearError}
            size="icon"
            variant="ghost"
          >
            <X className="size-4" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </AlertAction>
      ) : null}
    </Alert>
  );
}

function WebhookSetupAction({
  hasWebhook,
  isAdmin,
  isSettingUp,
  onSetup,
}: {
  hasWebhook: boolean;
  isAdmin: boolean;
  isSettingUp: boolean;
  onSetup: () => void;
}) {
  if (hasWebhook) {
    return (
      <Badge variant="secondary">
        <Check className="mr-1 size-3" />
        Webhook Active
      </Badge>
    );
  }

  if (isAdmin) {
    return (
      <Button disabled={isSettingUp} onClick={onSetup}>
        {isSettingUp ? (
          <Spinner className="mr-2 size-4 animate-spin" />
        ) : (
          <WebhooksLogo className="mr-2 size-4" />
        )}
        Setup Webhook
      </Button>
    );
  }

  return (
    <Text variant="bodySmall">Contact an admin to setup the webhook.</Text>
  );
}

export function WebhookSetupSection({
  hasWebhook,
  isSettingUp,
  isAdmin,
  onSetup,
  onResync,
  error,
  onClearError,
}: WebhookSetupCardProps) {
  const getDescription = () => {
    if (hasWebhook) {
      return "Webhook is active. Releases published on GitHub will automatically sync to your changelog.";
    }
    return "Enable automatic syncing from GitHub. When you publish a release on GitHub, it will automatically appear in your changelog without manual sync.";
  };

  return (
    <section className="space-y-4">
      <div>
        <H3 className="flex items-center gap-2" variant="section">
          <WebhooksLogo className="size-5" />
          Webhook Setup
        </H3>
        <Muted>{getDescription()}</Muted>
      </div>
      <WebhookSetupError
        error={error}
        onClearError={onClearError}
        onResync={onResync}
      />
      <WebhookSetupAction
        hasWebhook={hasWebhook}
        isAdmin={isAdmin}
        isSettingUp={isSettingUp}
        onSetup={onSetup}
      />
    </section>
  );
}
