import { vOnEmailEventArgs } from "@convex-dev/resend";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../../_generated/server";
import { recordEmailEvent } from "../../email/events";
import { findSupportEmailSettings } from "./delivery_policy";

const DAY_MS = 24 * 60 * 60 * 1000;
const RATE_WINDOW_MS = 7 * DAY_MS;
const MAX_SEND_LOGS_EVALUATED = 4000;
const MIN_SENDS_FOR_RATES = 100;
const MAX_COMPLAINT_RATE = 0.003;
const MAX_BOUNCE_RATE = 0.04;
const MAX_COMPLAINTS_PER_DAY = 3;

type PauseReason = NonNullable<
  Doc<"supportEmailSettings">["sendingPauseReason"]
>;

const isSupportEmail = (log: Doc<"emailSendLog">): boolean =>
  log.emailType.startsWith("support_");

interface SendingHealth {
  bounces: number;
  complaints: number;
  complaintsLastDay: number;
  sends: number;
}

const measureSendingHealth = (
  logs: Doc<"emailSendLog">[],
  now: number
): SendingHealth => {
  const supportLogs = logs.filter(isSupportEmail);
  const complained = supportLogs.filter((log) => log.status === "complained");
  return {
    bounces: supportLogs.filter((log) => log.status === "bounced").length,
    complaints: complained.length,
    complaintsLastDay: complained.filter(
      (log) => (log.complainedAt ?? log.sentAt) > now - DAY_MS
    ).length,
    sends: supportLogs.length,
  };
};

const pauseReasonFor = (health: SendingHealth): PauseReason | null => {
  const hasRateSample = health.sends >= MIN_SENDS_FOR_RATES;
  if (
    health.complaintsLastDay >= MAX_COMPLAINTS_PER_DAY ||
    (hasRateSample && health.complaints / health.sends >= MAX_COMPLAINT_RATE)
  ) {
    return "complaint_rate";
  }
  if (hasRateSample && health.bounces / health.sends >= MAX_BOUNCE_RATE) {
    return "bounce_rate";
  }
  return null;
};

const pauseSending = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  pause: { now: number; reason: PauseReason }
): Promise<boolean> => {
  const settings = await findSupportEmailSettings(ctx, organizationId);
  if (settings?.sendingPausedAt !== undefined) {
    return false;
  }
  const fields = {
    sendingPausedAt: pause.now,
    sendingPauseReason: pause.reason,
  };
  if (settings) {
    await ctx.db.patch(settings._id, fields);
  } else {
    await ctx.db.insert("supportEmailSettings", {
      ...fields,
      createdAt: pause.now,
      organizationId,
    });
  }
  return true;
};

export const evaluateAutoPause = async (
  ctx: MutationCtx,
  organizationId: Id<"organizations">
): Promise<void> => {
  const now = Date.now();
  const logs = await ctx.db
    .query("emailSendLog")
    .withIndex("by_organization_sent", (q) =>
      q.eq("organizationId", organizationId).gte("sentAt", now - RATE_WINDOW_MS)
    )
    .order("desc")
    .take(MAX_SEND_LOGS_EVALUATED);
  const health = measureSendingHealth(logs, now);
  const reason = pauseReasonFor(health);
  if (!reason) {
    return;
  }
  const paused = await pauseSending(ctx, organizationId, { now, reason });
  if (!paused) {
    return;
  }
  const organization = await ctx.db.get(organizationId);
  await ctx.scheduler.runAfter(
    0,
    internal.email.renderer.sendPlatformAlertEmail,
    {
      details: [
        `Organization: ${organization?.name ?? organizationId} (${organization?.slug ?? "unknown"})`,
        `Reason: ${reason}`,
        `Support emails over 7 days: ${health.sends}`,
        `Complaints: ${health.complaints} (${health.complaintsLastDay} in the last 24 h)`,
        `Bounces: ${health.bounces}`,
      ],
      subject: "Support email sending paused",
      title: "Support email sending was paused automatically",
    }
  );
};

export const handleSupportEmailEvent = internalMutation({
  args: vOnEmailEventArgs,
  handler: async (ctx, args) => {
    const { sendLog, suppressionReason } = await recordEmailEvent(ctx, args, {
      complaintScope: "organization",
    });
    if (sendLog && suppressionReason && isSupportEmail(sendLog)) {
      await evaluateAutoPause(ctx, sendLog.organizationId);
    }
  },
});
