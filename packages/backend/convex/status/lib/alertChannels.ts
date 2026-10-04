import { type Infer, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import {
  type alertChannelKind,
  incidentSeverity,
  incidentStatus,
} from "../tableFields";

export const MAX_ALERT_CHANNELS_PER_ORG = 5;

const alertOrganization = v.object({ name: v.string(), slug: v.string() });

const incidentAlertEvent = v.union(
  v.literal("incident.detected"),
  v.literal("incident.resolved")
);

export const statusAlert = v.union(
  v.object({
    event: incidentAlertEvent,
    incident: v.object({
      affectedMonitors: v.array(v.string()),
      id: v.string(),
      resolvedAt: v.optional(v.number()),
      severity: incidentSeverity,
      startedAt: v.number(),
      status: incidentStatus,
      title: v.string(),
    }),
    organization: alertOrganization,
    statusPageUrl: v.string(),
  }),
  v.object({
    event: v.literal("test"),
    organization: alertOrganization,
    statusPageUrl: v.string(),
  })
);

export type StatusAlert = Infer<typeof statusAlert>;

export type IncidentAlertEvent = Infer<typeof incidentAlertEvent>;

const INCIDENT_HEADLINES: Record<IncidentAlertEvent, string> = {
  "incident.detected": "Incident detected",
  "incident.resolved": "Incident resolved",
};

const DISCORD_EMBED_COLORS: Record<StatusAlert["event"], number> = {
  "incident.detected": 0xdc_26_26,
  "incident.resolved": 0x16_a3_4a,
  test: 0x71_71_7a,
};

const SLACK_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};

const SLACK_CONTROL_CHARACTERS = /[&<>]/g;

const escapeSlack = (text: string): string =>
  text.replace(
    SLACK_CONTROL_CHARACTERS,
    (character) => SLACK_ESCAPES[character] ?? character
  );

const headlineOf = (alert: StatusAlert): string => {
  if (alert.event === "test") {
    return `Test alert from the ${alert.organization.name} status page`;
  }
  return `${INCIDENT_HEADLINES[alert.event]}: ${alert.incident.title}`;
};

const detailLinesOf = (alert: StatusAlert): string[] => {
  if (alert.event === "test") {
    return ["Incident alerts will be posted here."];
  }
  const { affectedMonitors, severity } = alert.incident;
  const severityLine = `Severity: ${severity}`;
  if (affectedMonitors.length === 0) {
    return [severityLine];
  }
  return [severityLine, `Affected: ${affectedMonitors.join(", ")}`];
};

const slackMessageOf = (alert: StatusAlert) => {
  const headline = escapeSlack(headlineOf(alert));
  const details = detailLinesOf(alert).map(escapeSlack);
  return {
    blocks: [
      {
        text: { text: `*${headline}*\n${details.join("\n")}`, type: "mrkdwn" },
        type: "section",
      },
      {
        elements: [
          { text: `<${alert.statusPageUrl}|View status page>`, type: "mrkdwn" },
        ],
        type: "context",
      },
    ],
    text: headline,
  };
};

const discordMessageOf = (alert: StatusAlert) => ({
  allowed_mentions: { parse: [] },
  content: headlineOf(alert),
  embeds: [
    {
      color: DISCORD_EMBED_COLORS[alert.event],
      description: detailLinesOf(alert).join("\n"),
      title: `${alert.organization.name} status page`,
      url: alert.statusPageUrl,
    },
  ],
});

export const ALERT_REQUEST_BODIES: Record<
  Infer<typeof alertChannelKind>,
  (alert: StatusAlert) => object
> = {
  discord: discordMessageOf,
  slack: slackMessageOf,
  webhook: (alert) => alert,
};

export const alertChannelsOf = (
  ctx: QueryCtx,
  organizationId: Id<"organizations">
): Promise<Doc<"statusAlertChannels">[]> =>
  ctx.db
    .query("statusAlertChannels")
    .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
    .take(MAX_ALERT_CHANNELS_PER_ORG);

export const scheduleAlertDelivery = async (
  ctx: MutationCtx,
  channelId: Id<"statusAlertChannels">,
  alert: StatusAlert
): Promise<void> => {
  await ctx.scheduler.runAfter(0, internal.status.alertChannels.deliverAlert, {
    alert,
    channelId,
  });
};

export const sendIncidentAlerts = async (
  ctx: MutationCtx,
  {
    event,
    incident,
    organization,
    statusPageUrl,
  }: {
    event: IncidentAlertEvent;
    incident: Doc<"statusIncidents">;
    organization: Doc<"organizations">;
    statusPageUrl: string;
  }
): Promise<void> => {
  const channels = await alertChannelsOf(ctx, organization._id);
  if (channels.length === 0) {
    return;
  }
  const affectedMonitors = await Promise.all(
    incident.affectedMonitorIds.map((monitorId) => ctx.db.get(monitorId))
  );
  const alert: StatusAlert = {
    event,
    incident: {
      affectedMonitors: affectedMonitors.flatMap((monitor) =>
        monitor ? [monitor.name] : []
      ),
      id: incident._id,
      resolvedAt: incident.resolvedAt,
      severity: incident.severity,
      startedAt: incident.startedAt,
      status: incident.status,
      title: incident.title,
    },
    organization: { name: organization.name, slug: organization.slug },
    statusPageUrl,
  };
  for (const channel of channels) {
    await scheduleAlertDelivery(ctx, channel._id, alert);
  }
};
