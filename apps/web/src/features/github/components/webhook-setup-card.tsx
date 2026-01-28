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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Text } from "@/components/ui/typography";

import { GitHubPermissionErrorAlert } from "./github-permission-error-alert";

interface WebhookSetupCardProps {
  hasWebhook: boolean;
  isSettingUp: boolean;
  isAdmin: boolean;
  onSetup: () => void;
  onResync?: () => void;
  error?: { code: string; message: string } | null;
  onClearError?: () => void;
}

export function WebhookSetupCard({
  hasWebhook,
  isSettingUp,
  isAdmin,
  onSetup,
  onResync,
  error,
  onClearError,
}: WebhookSetupCardProps) {
  const renderError = () => {
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
        <Warning className="h-4 w-4" />
        <AlertTitle>Webhook setup failed</AlertTitle>
        <AlertDescription>
          <p>{error.message}</p>
        </AlertDescription>
        {onClearError ? (
          <AlertAction>
            <Button
              className="h-6 w-6"
              onClick={onClearError}
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
  };

  const renderContent = () => {
    if (hasWebhook) {
      return (
        <Badge variant="secondary">
          <Check className="mr-1 h-3 w-3" />
          Webhook Active
        </Badge>
      );
    }

    if (isAdmin) {
      return (
        <Button disabled={isSettingUp} onClick={onSetup}>
          {isSettingUp ? (
            <Spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <WebhooksLogo className="mr-2 h-4 w-4" />
          )}
          Setup Webhook
        </Button>
      );
    }

    return (
      <Text variant="bodySmall">Contact an admin to setup the webhook.</Text>
    );
  };

  const getDescription = () => {
    if (hasWebhook) {
      return "Webhook is active. Releases published on GitHub will automatically sync to your changelog.";
    }
    return "Enable automatic syncing from GitHub. When you publish a release on GitHub, it will automatically appear in your changelog without manual sync.";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WebhooksLogo className="h-5 w-5" />
          Webhook Setup
        </CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>
      <CardContent>
        {renderError()}
        {renderContent()}
      </CardContent>
    </Card>
  );
}
