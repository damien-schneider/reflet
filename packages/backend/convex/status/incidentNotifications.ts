import { type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { isOrgAdmin } from "../shared/membership";
import { affectedMonitorNames, isPublicNotice } from "./lib/visibility";
import { incidentSeverity, incidentStatus } from "./tableFields";

const SUBSCRIBER_PAGE_SIZE = 100;
/** An outage that recovers within this window never reaches subscribers, so a flapping monitor can't flood their inbox. */
const AUTO_INCIDENT_ANNOUNCE_DELAY_MS = 5 * 60 * 1000;

export const statusIncidentEmailFields = {
  affectedMonitorNames: v.array(v.string()),
  message: v.string(),
  organizationName: v.string(),
  severity: incidentSeverity,
  status: incidentStatus,
  statusPageUrl: v.string(),
  title: v.string(),
};

const statusIncidentEmail = v.object(statusIncidentEmailFields);

type StatusIncidentEmail = Infer<typeof statusIncidentEmail>;

export const statusMaintenanceEmailFields = {
  affectedMonitorNames: v.array(v.string()),
  endsAt: v.number(),
  message: v.optional(v.string()),
  organizationName: v.string(),
  startsAt: v.number(),
  statusPageUrl: v.string(),
  title: v.string(),
};

const subscriberNotice = v.union(
  v.object({ email: statusIncidentEmail, kind: v.literal("incident") }),
  v.object({
    email: v.object(statusMaintenanceEmailFields),
    kind: v.literal("maintenance"),
  })
);

type SubscriberNotice = Infer<typeof subscriberNotice>;

type TeamNotificationType = "incident_detected" | "incident_resolved";

const TEAM_NOTIFICATION_TITLES: Record<TeamNotificationType, string> = {
  incident_detected: "Incident detected",
  incident_resolved: "Incident resolved",
};

export const notifyIncidentChange = async (
  ctx: MutationCtx,
  args: {
    incidentId: Id<"statusIncidents">;
    updateId: Id<"statusIncidentUpdates">;
  }
): Promise<void> => {
  await ctx.scheduler.runAfter(
    0,
    internal.status.incidentNotifications.fanOutIncidentChange,
    args
  );
};

const isFirstUpdate = async (
  ctx: MutationCtx,
  update: Doc<"statusIncidentUpdates">
): Promise<boolean> => {
  const firstUpdate = await ctx.db
    .query("statusIncidentUpdates")
    .withIndex("by_incident", (q) => q.eq("incidentId", update.incidentId))
    .first();
  return firstUpdate?._id === update._id;
};

const teamNotificationTypeFor = (
  update: Doc<"statusIncidentUpdates">,
  isFirst: boolean
): TeamNotificationType | null => {
  if (update.status === "resolved") {
    return "incident_resolved";
  }
  return isFirst ? "incident_detected" : null;
};

const notifyOrgAdmins = async (
  ctx: MutationCtx,
  incident: Doc<"statusIncidents">,
  organization: Doc<"organizations">,
  type: TeamNotificationType
): Promise<void> => {
  const members = await ctx.db
    .query("organizationMembers")
    .withIndex("by_org_user", (q) =>
      q.eq("organizationId", incident.organizationId)
    )
    .collect();
  const title = TEAM_NOTIFICATION_TITLES[type];
  const now = Date.now();

  for (const admin of members.filter((member) => isOrgAdmin(member.role))) {
    await ctx.db.insert("notifications", {
      createdAt: now,
      isRead: false,
      message: incident.title,
      title,
      type,
      userId: admin.userId,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.push.sendPushNotification,
      {
        message: incident.title,
        title,
        type,
        url: `/dashboard/${organization.slug}/status`,
        userId: admin.userId,
      }
    );
  }
};

export const statusPageUrlOf = (organization: Doc<"organizations">): string =>
  `${process.env.SITE_URL ?? ""}/${organization.slug}/status`;

/** Names of the public monitors a notice touches, or null when its subscribers must not hear about it. */
export const publicMonitorNamesFor = async (
  ctx: MutationCtx,
  organization: Doc<"organizations">,
  notice: { affectedMonitorIds: Id<"statusMonitors">[] }
): Promise<string[] | null> => {
  if (!organization.isPublic) {
    return null;
  }
  const monitors = await ctx.db
    .query("statusMonitors")
    .withIndex("by_organization", (q) =>
      q.eq("organizationId", organization._id)
    )
    .collect();
  const publicMonitors = monitors.filter((monitor) => monitor.isPublic);
  const publicMonitorIds = new Set(publicMonitors.map(({ _id }) => _id));
  return isPublicNotice(notice, publicMonitorIds)
    ? affectedMonitorNames(notice, publicMonitors)
    : null;
};

export const notifySubscribers = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  notice: SubscriberNotice
): Promise<void> => {
  await ctx.scheduler.runAfter(
    0,
    internal.status.incidentNotifications.emailSubscribers,
    { cursor: null, notice, organizationId }
  );
};

const subscriberEmailFor = async (
  ctx: MutationCtx,
  incident: Doc<"statusIncidents">,
  update: Doc<"statusIncidentUpdates">,
  organization: Doc<"organizations">
): Promise<StatusIncidentEmail | null> => {
  const affectedMonitorNames = await publicMonitorNamesFor(
    ctx,
    organization,
    incident
  );
  if (!affectedMonitorNames) {
    return null;
  }
  return {
    affectedMonitorNames,
    message: update.message,
    organizationName: organization.name,
    severity: incident.severity,
    status: update.status,
    statusPageUrl: statusPageUrlOf(organization),
    title: incident.title,
  };
};

const emailSubscribersAbout = async (
  ctx: MutationCtx,
  incident: Doc<"statusIncidents">,
  update: Doc<"statusIncidentUpdates">
): Promise<void> => {
  const organization = await ctx.db.get(incident.organizationId);
  if (!organization) {
    return;
  }
  const email = await subscriberEmailFor(ctx, incident, update, organization);
  if (!email) {
    return;
  }
  if (incident.subscribersNotifiedAt === undefined) {
    await ctx.db.patch(incident._id, { subscribersNotifiedAt: Date.now() });
  }
  await notifySubscribers(ctx, incident.organizationId, {
    email,
    kind: "incident",
  });
};

type SubscriberDelivery = "now" | "after_delay" | "never";

/** Subscribers follow an incident once it is announced; an automatic detection is only announced if it outlives the delay or a human posts on it. */
const subscriberDeliveryFor = (
  incident: Doc<"statusIncidents">,
  update: Doc<"statusIncidentUpdates">,
  isFirst: boolean
): SubscriberDelivery => {
  if (incident.subscribersNotifiedAt !== undefined) {
    return "now";
  }
  if (update.status === "resolved") {
    return "never";
  }
  return incident.autoDetected && isFirst ? "after_delay" : "now";
};

export const fanOutIncidentChange = internalMutation({
  args: {
    incidentId: v.id("statusIncidents"),
    updateId: v.id("statusIncidentUpdates"),
  },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.incidentId);
    const update = await ctx.db.get(args.updateId);
    if (!(incident && update)) {
      return null;
    }
    const organization = await ctx.db.get(incident.organizationId);
    if (!organization) {
      return null;
    }

    const isFirst = await isFirstUpdate(ctx, update);
    const teamNotificationType = teamNotificationTypeFor(update, isFirst);
    if (teamNotificationType) {
      await notifyOrgAdmins(ctx, incident, organization, teamNotificationType);
    }

    const delivery = subscriberDeliveryFor(incident, update, isFirst);
    if (delivery === "now") {
      await emailSubscribersAbout(ctx, incident, update);
    }
    if (delivery === "after_delay") {
      await ctx.scheduler.runAfter(
        AUTO_INCIDENT_ANNOUNCE_DELAY_MS,
        internal.status.incidentNotifications.announceIfStillOpen,
        args
      );
    }
    return null;
  },
  returns: v.null(),
});

export const announceIfStillOpen = internalMutation({
  args: {
    incidentId: v.id("statusIncidents"),
    updateId: v.id("statusIncidentUpdates"),
  },
  handler: async (ctx, args) => {
    const incident = await ctx.db.get(args.incidentId);
    const update = await ctx.db.get(args.updateId);
    const isUnannouncedAndOpen =
      incident?.status !== "resolved" &&
      incident?.subscribersNotifiedAt === undefined;
    if (incident && update && isUnannouncedAndOpen) {
      await emailSubscribersAbout(ctx, incident, update);
    }
    return null;
  },
  returns: v.null(),
});

const scheduleNoticeEmail = async (
  ctx: MutationCtx,
  notice: SubscriberNotice,
  recipient: { to: string; unsubscribeUrl: string }
): Promise<void> => {
  if (notice.kind === "incident") {
    await ctx.scheduler.runAfter(
      0,
      internal.email.renderer.sendStatusIncidentEmail,
      { ...notice.email, ...recipient }
    );
    return;
  }
  await ctx.scheduler.runAfter(
    0,
    internal.email.renderer.sendStatusMaintenanceEmail,
    { ...notice.email, ...recipient }
  );
};

export const emailSubscribers = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    notice: subscriberNotice,
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("statusSubscribers")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId)
      )
      .paginate({ cursor: args.cursor, numItems: SUBSCRIBER_PAGE_SIZE });
    const siteUrl = process.env.SITE_URL ?? "";
    const confirmedSubscribers = page.page.filter(
      (subscriber) => subscriber.confirmationToken === undefined
    );

    for (const subscriber of confirmedSubscribers) {
      await scheduleNoticeEmail(ctx, args.notice, {
        to: subscriber.email,
        unsubscribeUrl: `${siteUrl}/subscriptions/unsubscribe?list=status&token=${subscriber.unsubscribeToken}`,
      });
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.status.incidentNotifications.emailSubscribers,
        { ...args, cursor: page.continueCursor }
      );
    }
    return null;
  },
  returns: v.null(),
});
