"use client";

import { Button } from "@ctrl-ui/react/ui/button";
import { Card, CardContent } from "@ctrl-ui/react/ui/card";
import { Field, FieldLabel } from "@ctrl-ui/react/ui/field";
import { Input } from "@ctrl-ui/react/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ctrl-ui/react/ui/select";
import { toast } from "@ctrl-ui/react/ui/toast";
import {
  BellRinging,
  DiscordLogo,
  type Icon,
  PaperPlaneTilt,
  SlackLogo,
  Trash,
  WebhooksLogo,
} from "@phosphor-icons/react";
import { api } from "@reflet/backend/convex/_generated/api";
import type { Doc, Id } from "@reflet/backend/convex/_generated/dataModel";
import { MAX_ALERT_CHANNELS_PER_ORG } from "@reflet/backend/convex/status/lib/alertChannels";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { formatDistanceToNow } from "date-fns";
import { type FormEvent, useId, useState } from "react";
import { DestructiveConfirmDialog } from "@/components/ui/destructive-confirm-dialog";

type AlertChannelKind = Doc<"statusAlertChannels">["kind"];

type AlertChannel = FunctionReturnType<
  typeof api.status.alertChannels.listAlertChannels
>[number];

const CHANNEL_KINDS: Record<
  AlertChannelKind,
  { icon: Icon; label: string; urlPlaceholder: string }
> = {
  discord: {
    icon: DiscordLogo,
    label: "Discord",
    urlPlaceholder: "https://discord.com/api/webhooks/…",
  },
  slack: {
    icon: SlackLogo,
    label: "Slack",
    urlPlaceholder: "https://hooks.slack.com/services/…",
  },
  webhook: {
    icon: WebhooksLogo,
    label: "Webhook",
    urlPlaceholder: "https://example.com/status-alerts",
  },
};

const CHANNEL_KIND_ORDER: AlertChannelKind[] = ["slack", "discord", "webhook"];

const CHANNEL_KIND_ITEMS = CHANNEL_KIND_ORDER.map((value) => ({
  label: CHANNEL_KINDS[value].label,
  value,
}));

const errorMessageOr = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export function AlertChannels({
  isAdmin,
  organizationId,
}: {
  isAdmin: boolean;
  organizationId: Id<"organizations">;
}) {
  const channels = useQuery(api.status.alertChannels.listAlertChannels, {
    organizationId,
  });

  if (channels === undefined) {
    return null;
  }

  const canAddChannel = isAdmin && channels.length < MAX_ALERT_CHANNELS_PER_ORG;

  return (
    <section aria-labelledby="alert-channels" className="space-y-3">
      <div className="space-y-1">
        <h2 className="font-semibold text-heading-4" id="alert-channels">
          Alerts
        </h2>
        <p className="text-pretty text-muted-foreground text-sm">
          Post to Slack, Discord or your own endpoint the moment an incident
          starts or resolves.
        </p>
      </div>
      {channels.map((channel) => (
        <AlertChannelRow
          channel={channel}
          isAdmin={isAdmin}
          key={channel._id}
        />
      ))}
      {channels.length === 0 && !isAdmin && (
        <p className="text-muted-foreground text-sm">
          No alert channels yet. Ask an admin to add one.
        </p>
      )}
      {canAddChannel && <AddAlertChannelForm organizationId={organizationId} />}
    </section>
  );
}

function LastDelivery({
  lastDelivery,
}: {
  lastDelivery: AlertChannel["lastDelivery"];
}) {
  if (!lastDelivery) {
    return <span>No alerts sent yet</span>;
  }
  const when = formatDistanceToNow(lastDelivery.deliveredAt, {
    addSuffix: true,
  });
  if (lastDelivery.error) {
    return (
      <span className="text-destructive-text">
        Failed {when}: {lastDelivery.error}
      </span>
    );
  }
  return <span>Delivered {when}</span>;
}

function AlertChannelRow({
  channel,
  isAdmin,
}: {
  channel: AlertChannel;
  isAdmin: boolean;
}) {
  const removeChannel = useMutation(
    api.status.alertChannels.removeAlertChannel
  );
  const sendTestAlert = useMutation(api.status.alertChannels.sendTestAlert);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const kind = CHANNEL_KINDS[channel.kind];
  const KindIcon = kind.icon;
  const name = channel.label ?? kind.label;

  const handleSendTest = async () => {
    try {
      await sendTestAlert({ channelId: channel._id });
      toast.success(`Test alert sent to ${name}`);
    } catch (error) {
      toast.error(errorMessageOr(error, "Couldn’t send the test alert."));
    }
  };

  const handleRemove = async () => {
    try {
      await removeChannel({ channelId: channel._id });
    } catch (error) {
      toast.error(errorMessageOr(error, "Couldn’t remove the channel."));
    }
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <KindIcon aria-hidden className="size-5 shrink-0" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate font-medium text-sm">
            {name}
            <span className="ml-2 font-mono text-muted-foreground text-xs">
              {channel.maskedUrl}
            </span>
          </p>
          <p className="text-muted-foreground text-xs">
            <LastDelivery lastDelivery={channel.lastDelivery} />
          </p>
        </div>
        {isAdmin && (
          <>
            <Button onClick={handleSendTest} size="sm" variant="surface">
              <PaperPlaneTilt />
              Send test
            </Button>
            <Button
              aria-label={`Remove ${name}`}
              iconOnly
              onClick={() => setIsConfirmOpen(true)}
              size="sm"
              variant="ghost"
            >
              <Trash />
            </Button>
            <DestructiveConfirmDialog
              confirmLabel="Remove channel"
              description="Incident alerts stop posting to this channel. You’ll need its URL again to re-add it."
              onConfirm={handleRemove}
              onOpenChange={setIsConfirmOpen}
              open={isConfirmOpen}
              title={`Remove ${name}?`}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AddAlertChannelForm({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const addChannel = useMutation(api.status.alertChannels.addAlertChannel);
  const [isOpen, setIsOpen] = useState(false);
  const [kind, setKind] = useState<AlertChannelKind>("slack");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const kindId = useId();
  const urlId = useId();
  const labelId = useId();

  const closeForm = () => {
    setIsOpen(false);
    setUrl("");
    setLabel("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!url.trim() || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      await addChannel({
        kind,
        label: label.trim() || undefined,
        organizationId,
        url: url.trim(),
      });
      closeForm();
    } catch (error) {
      toast.error(
        errorMessageOr(error, "Couldn’t add the channel. Try again.")
      );
    }
    setIsSaving(false);
  };

  if (!isOpen) {
    return (
      <Button
        className="w-full justify-start"
        onClick={() => setIsOpen(true)}
        variant="surface"
      >
        <BellRinging />
        Add alert channel
      </Button>
    );
  }

  return (
    <Card>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <Field>
              <FieldLabel htmlFor={kindId}>Send to</FieldLabel>
              <Select
                items={CHANNEL_KIND_ITEMS}
                onValueChange={setKind}
                value={kind}
              >
                <SelectTrigger id={kindId}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANNEL_KIND_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor={urlId}>Webhook URL</FieldLabel>
              <Input
                autoCapitalize="off"
                autoComplete="off"
                autoFocus
                id={urlId}
                inputMode="url"
                onChange={(event) => setUrl(event.target.value)}
                placeholder={CHANNEL_KINDS[kind].urlPlaceholder}
                spellCheck={false}
                type="text"
                value={url}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor={labelId}>Label (optional)</FieldLabel>
            <Input
              id={labelId}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="#incidents"
              value={label}
            />
          </Field>
          <div className="flex items-center justify-end gap-2">
            <Button onClick={closeForm} size="sm" variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={!url.trim() || isSaving}
              size="sm"
              tone="primary"
              type="submit"
              variant="solid"
            >
              {isSaving ? "Adding…" : "Add channel"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
