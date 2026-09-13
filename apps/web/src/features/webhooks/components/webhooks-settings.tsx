"use client";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ctrl-ui/react/ui/alert-dialog";
import { Badge } from "@ctrl-ui/react/ui/badge";
import { Button, ButtonLink } from "@ctrl-ui/react/ui/button";
import { Input } from "@ctrl-ui/react/ui/input";
import { Switch } from "@ctrl-ui/react/ui/switch";
import { ArrowSquareOut, Trash } from "@phosphor-icons/react";
import type { Id } from "@reflet/backend/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { SecretOnceBanner } from "@/components/secret-once-banner";
import { Muted } from "@/components/ui/typography";
import { useWebhooks } from "../hooks/use-webhooks";

const EVENT_OPTIONS = [
  { hint: "approved feedback appears", value: "feedback.created" },
  { hint: "status moves", value: "feedback.status_changed" },
  { hint: "a GitHub issue is linked", value: "feedback.github_issue_created" },
] as const;

type WebhookEvent = (typeof EVENT_OPTIONS)[number]["value"];

const ALL_EVENTS = EVENT_OPTIONS.map((option) => option.value);

const DELIVERY_BADGE_COLOR = {
  failed: "red",
  pending: "yellow",
  skipped: "neutral",
  success: "green",
} as const;

interface WebhooksSettingsProps {
  organizationId: Id<"organizations">;
}

export function WebhooksSettings({ organizationId }: WebhooksSettingsProps) {
  const {
    copySecret,
    create,
    deliveries,
    dismissSecret,
    isCreating,
    newSecret,
    remove,
    setActive,
    webhooks,
  } = useWebhooks(organizationId);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<WebhookEvent[]>(ALL_EVENTS);
  const [webhookToDelete, setWebhookToDelete] =
    useState<Id<"organizationWebhooks"> | null>(null);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold text-lg">Webhooks</h2>
        <ButtonLink
          render={
            <Link href="/docs/api#webhooks" rel="noopener" target="_blank" />
          }
          size="xs"
        >
          Docs
          <ArrowSquareOut className="ml-2 h-4 w-4" />
        </ButtonLink>
      </div>

      {newSecret ? (
        <SecretOnceBanner
          onCopy={copySecret}
          onDismiss={dismissSecret}
          secret={newSecret}
          title="Save your signing secret now"
        />
      ) : null}

      <form className="space-y-3 rounded-lg border p-4" onSubmit={handleSubmit}>
        <Input
          aria-label="Webhook URL"
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://example.com/hooks/reflet"
          type="url"
          value={url}
        />
        <Input
          aria-label="Description"
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description (optional)"
          value={description}
        />
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {EVENT_OPTIONS.map((option) => (
            <div className="flex items-center gap-2 text-sm" key={option.value}>
              <Switch
                aria-label={option.value}
                checked={events.includes(option.value)}
                onCheckedChange={(checked) =>
                  toggleEvent(option.value, checked)
                }
              />
              <code className="text-xs">{option.value}</code>
              <Muted className="text-xs">{option.hint}</Muted>
            </div>
          ))}
        </div>
        <Button
          disabled={!canSubmit}
          tone="primary"
          type="submit"
          variant="solid"
        >
          {isCreating ? "Creating..." : "Add webhook"}
        </Button>
      </form>

      {webhooks && webhooks.length > 0 ? (
        <ul className="space-y-3">
          {webhooks.map((webhook) => (
            <li
              className="flex items-start justify-between gap-4 rounded-lg border p-4"
              key={webhook._id}
            >
              <div className="min-w-0 space-y-1">
                <p className="truncate font-mono text-sm">{webhook.url}</p>
                {webhook.description ? (
                  <Muted className="text-sm">{webhook.description}</Muted>
                ) : null}
                <div className="flex flex-wrap gap-1">
                  {webhook.events.map((event) => (
                    <Badge key={event} variant="outline">
                      {event}
                    </Badge>
                  ))}
                </div>
                {webhook.consecutiveFailures > 0 ? (
                  <Muted className="text-amber-600 text-xs">
                    {webhook.consecutiveFailures} consecutive failures
                    {webhook.isActive ? "" : " — disabled automatically"}
                  </Muted>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Switch
                  aria-label="Webhook active"
                  checked={webhook.isActive}
                  onCheckedChange={(checked) => setActive(webhook._id, checked)}
                />
                <Button
                  aria-label="Delete webhook"
                  iconOnly
                  onClick={() => setWebhookToDelete(webhook._id)}
                  tone="danger"
                  variant="ghost"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Muted className="text-sm">
          No webhooks yet. Add one to receive signed events for feedback.
        </Muted>
      )}

      {deliveries && deliveries.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">Event</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Attempts</th>
                <th className="px-3 py-2 font-medium">Last error</th>
                <th className="px-3 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((delivery) => (
                <tr className="border-t" key={delivery._id}>
                  <td className="px-3 py-2 font-mono text-xs">
                    {delivery.event}
                  </td>
                  <td className="px-3 py-2">
                    <Badge color={DELIVERY_BADGE_COLOR[delivery.status]}>
                      {delivery.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">{delivery.attempts}</td>
                  <td className="max-w-48 truncate px-3 py-2 text-muted-foreground">
                    {delivery.lastError ?? ""}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                    {formatDistanceToNow(delivery.createdAt, {
                      addSuffix: true,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setWebhookToDelete(null);
          }
        }}
        open={webhookToDelete !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              Pending deliveries are dropped and the endpoint stops receiving
              events immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose>Cancel</AlertDialogClose>
            <AlertDialogClose
              onClick={() => {
                if (webhookToDelete) {
                  remove(webhookToDelete);
                }
              }}
              tone="danger"
              variant="surface"
            >
              Delete
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
