import { type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { requireOrgAdmin, requireOrgMember } from "../shared/access";
import { MAX_TITLE_LENGTH, MAX_URL_LENGTH } from "../shared/constants";
import {
  assertPublicHttpUrl,
  describeFetchFailure,
  fetchPublicUrl,
} from "../shared/outbound/public_fetch";
import { validateInputLength } from "../shared/validators";
import { statusPageUrlOf } from "./incidentNotifications";
import {
  ALERT_REQUEST_BODIES,
  alertChannelsOf,
  MAX_ALERT_CHANNELS_PER_ORG,
  type StatusAlert,
  scheduleAlertDelivery,
  statusAlert,
} from "./lib/alertChannels";
import { alertChannelKind } from "./tableFields";

const DELIVERY_TIMEOUT_MS = 10_000;
const MANAGE_ALERTS = "manage status alerts";
const MASKED_URL_VISIBLE_CHARS = 4;

interface ChannelUrlRule {
  hosts: Record<string, true>;
  invalidMessage: string;
  pathPrefix: string;
}

const CHANNEL_URL_RULES: Record<
  Infer<typeof alertChannelKind>,
  ChannelUrlRule | null
> = {
  discord: {
    hosts: { "discord.com": true, "discordapp.com": true },
    invalidMessage:
      "Discord webhook URLs start with https://discord.com/api/webhooks/",
    pathPrefix: "/api/webhooks/",
  },
  slack: {
    hosts: { "hooks.slack.com": true },
    invalidMessage:
      "Slack webhook URLs start with https://hooks.slack.com/services/",
    pathPrefix: "/services/",
  },
  webhook: null,
};

const assertChannelUrl = (
  kind: Infer<typeof alertChannelKind>,
  rawUrl: string
): void => {
  const url = assertPublicHttpUrl(rawUrl);
  const rule = CHANNEL_URL_RULES[kind];
  if (!rule) {
    return;
  }
  const matchesRule =
    url.protocol === "https:" &&
    rule.hosts[url.hostname] === true &&
    url.pathname.startsWith(rule.pathPrefix);
  if (!matchesRule) {
    throw new Error(rule.invalidMessage);
  }
};

const maskedUrlOf = (rawUrl: string): string => {
  const { host, pathname } = new URL(rawUrl);
  return `${host}/…${pathname.slice(-MASKED_URL_VISIBLE_CHARS)}`;
};

export const listAlertChannels = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgMember(ctx, args.organizationId);
    const channels = await alertChannelsOf(ctx, args.organizationId);
    return channels.map(({ url, ...channel }) => ({
      ...channel,
      maskedUrl: maskedUrlOf(url),
    }));
  },
});

export const addAlertChannel = mutation({
  args: {
    kind: alertChannelKind,
    label: v.optional(v.string()),
    organizationId: v.id("organizations"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOrgAdmin(ctx, args.organizationId, MANAGE_ALERTS);
    const url = args.url.trim();
    const label = args.label?.trim() || undefined;
    validateInputLength(label, MAX_TITLE_LENGTH, "Label");
    validateInputLength(url, MAX_URL_LENGTH, "URL");
    assertChannelUrl(args.kind, url);

    const existing = await alertChannelsOf(ctx, args.organizationId);
    if (existing.length >= MAX_ALERT_CHANNELS_PER_ORG) {
      throw new Error(
        `You can add up to ${MAX_ALERT_CHANNELS_PER_ORG} alert channels. Remove one to add another.`
      );
    }

    return await ctx.db.insert("statusAlertChannels", {
      createdAt: Date.now(),
      kind: args.kind,
      label,
      organizationId: args.organizationId,
      url,
    });
  },
});

export const removeAlertChannel = mutation({
  args: { channelId: v.id("statusAlertChannels") },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      return;
    }
    await requireOrgAdmin(ctx, channel.organizationId, MANAGE_ALERTS);
    await ctx.db.delete(args.channelId);
  },
});

export const sendTestAlert = mutation({
  args: { channelId: v.id("statusAlertChannels") },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Alert channel not found");
    }
    await requireOrgAdmin(ctx, channel.organizationId, MANAGE_ALERTS);
    const organization = await ctx.db.get(channel.organizationId);
    if (!organization) {
      throw new Error("Organization not found");
    }
    await scheduleAlertDelivery(ctx, channel._id, {
      event: "test",
      organization: { name: organization.name, slug: organization.slug },
      statusPageUrl: statusPageUrlOf(organization),
    });
  },
});

export const getAlertChannel = internalQuery({
  args: { channelId: v.id("statusAlertChannels") },
  handler: async (ctx, args) => await ctx.db.get(args.channelId),
});

export const recordDelivery = internalMutation({
  args: {
    channelId: v.id("statusAlertChannels"),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      return null;
    }
    await ctx.db.patch(channel._id, {
      lastDelivery: { deliveredAt: Date.now(), error: args.error },
    });
    return null;
  },
  returns: v.null(),
});

const postAlert = async (
  channel: Doc<"statusAlertChannels">,
  alert: StatusAlert
): Promise<{ error?: string }> => {
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), DELIVERY_TIMEOUT_MS);
  try {
    const { response } = await fetchPublicUrl(
      channel.url,
      {
        body: JSON.stringify(ALERT_REQUEST_BODIES[channel.kind](alert)),
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Reflet-Status/1.0",
        },
        method: "POST",
        signal: abort.signal,
      },
      { followRedirects: false }
    );
    await response.body?.cancel();
    return response.ok ? {} : { error: `HTTP ${response.status}` };
  } catch (error) {
    return { error: describeFetchFailure(error) };
  } finally {
    clearTimeout(timeout);
  }
};

export const deliverAlert = internalAction({
  args: { alert: statusAlert, channelId: v.id("statusAlertChannels") },
  handler: async (ctx, args) => {
    const channel: Doc<"statusAlertChannels"> | null = await ctx.runQuery(
      internal.status.alertChannels.getAlertChannel,
      { channelId: args.channelId }
    );
    if (!channel) {
      return null;
    }
    const result = await postAlert(channel, args.alert);
    await ctx.runMutation(internal.status.alertChannels.recordDelivery, {
      ...result,
      channelId: channel._id,
    });
    return null;
  },
  returns: v.null(),
});
