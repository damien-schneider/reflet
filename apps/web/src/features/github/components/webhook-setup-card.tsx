"use client";

import { Check, Spinner, Webhook } from "@phosphor-icons/react";

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

interface WebhookSetupCardProps {
  hasWebhook: boolean;
  isSettingUp: boolean;
  isAdmin: boolean;
  onSetup: () => void;
}

export function WebhookSetupCard({
  hasWebhook,
  isSettingUp,
  isAdmin,
  onSetup,
}: WebhookSetupCardProps) {
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
            <Webhook className="mr-2 h-4 w-4" />
          )}
          Setup Webhook
        </Button>
      );
    }

    return (
      <Text variant="bodySmall">Contact an admin to setup the webhook.</Text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Webhook Setup
        </CardTitle>
        <CardDescription>
          {hasWebhook
            ? "Webhook is configured and receiving events"
            : "Set up a webhook to automatically receive release events"}
        </CardDescription>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
