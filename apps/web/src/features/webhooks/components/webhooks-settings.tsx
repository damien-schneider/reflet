"use client";

import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import { Card, CardContent, CardFooter } from "@ctrl-ui/react/ui/card";
import { Field, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import { Skeleton } from "@ctrl-ui/react/ui/skeleton";
import { Spinner } from "@ctrl-ui/react/ui/spinner";
import { Switch } from "@ctrl-ui/react/ui/switch";
import {
  ArrowSquareOut,
  PauseCircle,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { SecretOnceBanner } from "@/components/secret-once-banner";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";
import { SettingsSection } from "@/features/project/components/settings-page";
import {
  type CreateWebhookInput,
  useWebhooks,
  type WebhookListItem,
} from "../hooks/use-webhooks";
import { WebhookDeliveries } from "./webhook-deliveries";

const EVENT_OPTIONS = [
  { hint: "Approved feedback appears", value: "feedback.created" },
  { hint: "A status changes", value: "feedback.status_changed" },
  { hint: "A GitHub issue is linked", value: "feedback.github_issue_created" },
] as const;

type WebhookEvent = (typeof EVENT_OPTIONS)[number]["value"];

const ALL_EVENTS = EVENT_OPTIONS.map((option) => option.value);

interface WebhooksSettingsProps {
  organizationId: Id<"organizations">;
}

export function WebhooksSettings({ organizationId }: WebhooksSettingsProps) {
  const {
    create,
    deliveries,
    dismissSecret,
    isCreating,
    newSecret,
    remove,
    setActive,
    webhooks,
  } = useWebhooks(organizationId);
  const [webhookToDelete, setWebhookToDelete] =
    useState<Id<"organizationWebhooks"> | null>(null);

  return (
    <>
      <SettingsSection
        actions={
          <ButtonLink
            render={
              <Link href="/docs/api#webhooks" rel="noopener" target="_blank" />
            }
            size="sm"
            variant="ghost"
          >
            Webhook docs
            <ArrowSquareOut aria-hidden />
          </ButtonLink>
        }
        description="Send signed events to your own endpoint when feedback changes."
        title="Webhooks"
      >
        {newSecret ? (
          <SecretOnceBanner
            onDismiss={dismissSecret}
            secret={newSecret}
            title="Save your signing secret now"
          />
        ) : null}
        <WebhookForm create={create} isCreating={isCreating} />
        <WebhookList
          onDelete={setWebhookToDelete}
          onToggle={setActive}
          webhooks={webhooks}
        />
      </SettingsSection>

      {deliveries && deliveries.length > 0 ? (
        <SettingsSection
          description="The most recent delivery attempts across all endpoints."
          title="Recent deliveries"
        >
          <WebhookDeliveries deliveries={deliveries} />
        </SettingsSection>
      ) : null}

      <DestructiveConfirmDialog
        confirmLabel="Delete webhook"
        description="Pending deliveries are dropped and the endpoint stops receiving events right away."
        onConfirm={() => {
          if (webhookToDelete) {
            remove(webhookToDelete);
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            setWebhookToDelete(null);
          }
        }}
        open={webhookToDelete !== null}
        title="Delete webhook?"
      />
    </>
  );
}

function WebhookForm({
  create,
  isCreating,
}: {
  create: (input: CreateWebhookInput) => Promise<boolean>;
  isCreating: boolean;
}) {
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<WebhookEvent[]>(ALL_EVENTS);

  const toggleEvent = (event: WebhookEvent, enabled: boolean) => {
    setEvents((current) =>
      enabled
        ? [...current.filter((item) => item !== event), event]
        : current.filter((item) => item !== event)
    );
  };

  const handleSubmit = async (formEvent: FormEvent) => {
    formEvent.preventDefault();
    const created = await create({
      description: description.trim() || undefined,
      events,
      url: url.trim(),
    });
    if (created) {
      setUrl("");
      setDescription("");
    }
  };

  const canSubmit = !isCreating && url.trim().length > 0 && events.length > 0;

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="webhook-url">Webhook URL</FieldLabel>
            <Input
              autoComplete="off"
              id="webhook-url"
              inputMode="url"
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/hooks/reflet"
              spellCheck={false}
              type="url"
              value={url}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="webhook-description">
              Description (optional)
            </FieldLabel>
            <Input
              id="webhook-description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Production Slack bridge"
              value={description}
            />
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-medium text-label">Events</legend>
            {EVENT_OPTIONS.map((option) => (
              <div className="flex items-center gap-3" key={option.value}>
                <Switch
                  aria-describedby={`webhook-event-${option.value}`}
                  aria-label={option.value}
                  checked={events.includes(option.value)}
                  onCheckedChange={(checked) =>
                    toggleEvent(option.value, checked)
                  }
                />
                <code className="font-mono text-caption">{option.value}</code>
                <span
                  className="text-caption text-muted-foreground"
                  id={`webhook-event-${option.value}`}
                >
                  {option.hint}
                </span>
              </div>
            ))}
            {events.length === 0 ? (
              <p className="text-caption text-muted-foreground">
                Select at least one event.
              </p>
            ) : null}
          </fieldset>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            disabled={!canSubmit}
            tone="primary"
            type="submit"
            variant="solid"
          >
            {isCreating ? (
              <Spinner aria-hidden data-icon="inline-start" size="xs" />
            ) : null}
            {isCreating ? "Creating…" : "Add webhook"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function WebhookList({
  onDelete,
  onToggle,
  webhooks,
}: {
  onDelete: (id: Id<"organizationWebhooks">) => void;
  onToggle: (id: Id<"organizationWebhooks">, isActive: boolean) => void;
  webhooks: WebhookListItem[] | undefined;
}) {
  if (webhooks === undefined) {
    return <Skeleton aria-busy="true" className="h-24 w-full" />;
  }
  if (webhooks.length === 0) {
    return (
      <p className="text-body text-muted-foreground">
        No webhooks yet. Add an endpoint above to start receiving events.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {webhooks.map((webhook) => (
        <li key={webhook._id}>
          <Card>
            <CardContent className="flex items-start justify-between gap-4">
              <WebhookSummary webhook={webhook} />
              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  aria-label={`Enable webhook ${webhook.url}`}
                  checked={webhook.isActive}
                  onCheckedChange={(checked) => onToggle(webhook._id, checked)}
                />
                <Button
                  aria-label={`Delete webhook ${webhook.url}`}
                  iconOnly
                  onClick={() => onDelete(webhook._id)}
                  size="sm"
                  tone="danger"
                  variant="ghost"
                >
                  <Trash aria-hidden />
                </Button>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function WebhookSummary({ webhook }: { webhook: WebhookListItem }) {
  const failures = webhook.consecutiveFailures;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate font-mono text-label">{webhook.url}</p>
        {webhook.isActive ? null : (
          <Badge color="neutral" size="sm">
            <PauseCircle aria-hidden />
            Paused
          </Badge>
        )}
      </div>
      {webhook.description ? (
        <p className="text-body text-muted-foreground">{webhook.description}</p>
      ) : null}
      <div className="flex flex-wrap gap-1">
        {webhook.events.map((event) => (
          <Badge key={event} size="sm" variant="outline">
            <span className="font-mono">{event}</span>
          </Badge>
        ))}
      </div>
      {failures > 0 ? (
        <p className="flex items-center gap-1.5 text-caption text-warning-text">
          <Warning aria-hidden className="size-4 shrink-0" />
          <span className="tabular-nums">
            {failures} consecutive {failures === 1 ? "failure" : "failures"}
            {webhook.isActive ? "" : ". Paused automatically."}
          </span>
        </p>
      ) : null}
    </div>
  );
}
