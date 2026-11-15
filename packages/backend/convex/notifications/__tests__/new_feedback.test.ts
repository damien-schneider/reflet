/// <reference types="vite/client" />
import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import { applyRecordedTriage, seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";
import { NEW_FEEDBACK_ALERT_DEADLINE_MS } from "../new_feedback";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const OWNER = { _id: "user_owner", email: "owner@acme.dev" };
const ADMIN = { _id: "user_admin", email: "admin@acme.dev" };
const MEMBER = { _id: "user_member", email: "member@acme.dev" };
const VISITOR_EMAIL = "visitor@example.com";
const ALERT_EMAIL = "notifications/new_feedback_email:send";
const ALERT_DEADLINE = "notifications/new_feedback:settleAtDeadline";

const setup = async (organization: Partial<Doc<"organizations">> = {}) => {
  const t = setupTest({ authUsers: [OWNER, ADMIN, MEMBER] });
  const { externalUserId, organizationId } = await t.run(async (ctx) => {
    const orgId = await seedOrganization(ctx, organization);
    for (const [user, role] of [
      [OWNER, "owner"],
      [ADMIN, "admin"],
      [MEMBER, "member"],
    ] as const) {
      await ctx.db.insert("organizationMembers", {
        createdAt: Date.now(),
        organizationId: orgId,
        role,
        userId: user._id,
      });
    }
    const visitorId = await ctx.db.insert("externalUsers", {
      createdAt: Date.now(),
      email: VISITOR_EMAIL,
      externalId: "visitor-1",
      lastSeenAt: Date.now(),
      organizationId: orgId,
    });
    return { externalUserId: visitorId, organizationId: orgId };
  });
  const as = (user: { _id: string }) =>
    t.withIdentity({ sessionId: user._id, subject: user._id });

  const submitThroughWidget = async () => {
    const { feedbackId } = await t.mutation(
      internal.feedback.api_public_write.createFeedbackByOrganization,
      {
        description: "Exporting a 4K recording freezes at 99%",
        externalUserId,
        organizationId,
        title: "Export freezes",
      }
    );
    return feedbackId;
  };

  const alertedUserIds = async () => {
    const notifications = await t.run((ctx) =>
      ctx.db.query("notifications").collect()
    );
    return notifications
      .filter((notification) => notification.type === "new_feedback")
      .map((notification) => notification.userId)
      .sort();
  };

  const alertEmails = async () => {
    const jobs = await t.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect()
    );
    return jobs
      .filter((job) => job.name === ALERT_EMAIL)
      .map((job) => job.args[0]);
  };

  const alertedEmails = async () =>
    (await alertEmails()).map((args) => args.to).sort();

  const passAlertDeadlineWithoutTriage = async () => {
    await t.run(async (ctx) => {
      const jobs = await ctx.db.system.query("_scheduled_functions").collect();
      for (const job of jobs) {
        if (job.name !== ALERT_DEADLINE && job.state.kind === "pending") {
          await ctx.scheduler.cancel(job._id);
        }
      }
    });
    vi.advanceTimersByTime(NEW_FEEDBACK_ALERT_DEADLINE_MS);
    await t.finishInProgressScheduledFunctions();
  };

  return {
    alertEmails,
    alertedEmails,
    alertedUserIds,
    as,
    organizationId,
    passAlertDeadlineWithoutTriage,
    submitThroughWidget,
    t,
  };
};

describe("team alert for new feedback", () => {
  test("widget feedback alerts each admin once, in-app and by email, after a non-junk verdict", async () => {
    const { alertEmails, alertedUserIds, as, submitThroughWidget, t } =
      await setup();
    const feedbackId = await submitThroughWidget();

    expect(await alertedUserIds()).toEqual([]);

    await applyRecordedTriage(t, { feedbackId, junk: 0 });
    await applyRecordedTriage(t, { feedbackId, junk: 0 });

    expect(await alertedUserIds()).toEqual([ADMIN._id, OWNER._id]);
    const emails = await alertEmails();
    expect(emails.map((email) => email.to).sort()).toEqual([
      ADMIN.email,
      OWNER.email,
    ]);
    expect(emails[0]).toMatchObject({
      authorEmail: VISITOR_EMAIL,
      feedbackId,
      feedbackTitle: "Export freezes",
    });

    const [notification] = await as(ADMIN).query(
      api.notifications.queries.list,
      {}
    );
    expect(notification).toMatchObject({
      href: `/dashboard/acme/feedback/${feedbackId}`,
      message: "Export freezes",
    });
  });

  test("feedback judged junk alerts nobody, even after a later clean verdict", async () => {
    const { alertedEmails, alertedUserIds, submitThroughWidget, t } =
      await setup();
    const feedbackId = await submitThroughWidget();

    await applyRecordedTriage(t, { feedbackId, junk: 0.99 });
    await applyRecordedTriage(t, { feedbackId, junk: 0 });

    expect(await alertedUserIds()).toEqual([]);
    expect(await alertedEmails()).toEqual([]);
  });

  test("feedback held for manual approval still alerts the admins", async () => {
    const { alertedEmails, alertedUserIds, submitThroughWidget, t } =
      await setup({ feedbackSettings: { requireApproval: true } });
    const feedbackId = await submitThroughWidget();

    await applyRecordedTriage(t, { feedbackId, junk: 0 });

    expect((await t.run((ctx) => ctx.db.get(feedbackId)))?.isApproved).toBe(
      false
    );
    expect(await alertedUserIds()).toEqual([ADMIN._id, OWNER._id]);
    expect(await alertedEmails()).toEqual([ADMIN.email, OWNER.email]);
  });

  test("feedback still alerts when triage cannot run without an OpenRouter key", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const { alertedEmails, alertedUserIds, submitThroughWidget, t } =
      await setup();
    const feedbackId = await submitThroughWidget();

    await t.action(internal.feedback.auto_tagging_actions.processAutoTagging, {
      feedbackId,
    });

    expect(await alertedUserIds()).toEqual([ADMIN._id, OWNER._id]);
    expect(await alertedEmails()).toEqual([ADMIN.email, OWNER.email]);
  });

  test("turning off new-feedback emails keeps the in-app notification", async () => {
    const { alertedEmails, alertedUserIds, as, submitThroughWidget, t } =
      await setup();
    await as(OWNER).mutation(api.notifications.preferences.updatePreferences, {
      emailOnNewFeedback: false,
    });
    const feedbackId = await submitThroughWidget();

    await applyRecordedTriage(t, { feedbackId, junk: 0 });

    expect(await alertedUserIds()).toEqual([ADMIN._id, OWNER._id]);
    expect(await alertedEmails()).toEqual([ADMIN.email]);
  });

  test("turning off new-feedback alerts silences the push but keeps the in-app notification", async () => {
    const { alertedUserIds, as, submitThroughWidget, t } = await setup();
    await as(OWNER).mutation(api.notifications.preferences.updatePreferences, {
      notifyOnNewFeedback: false,
      pushEnabled: true,
    });
    const feedbackId = await submitThroughWidget();
    await applyRecordedTriage(t, { feedbackId, junk: 0 });

    expect(await alertedUserIds()).toEqual([ADMIN._id, OWNER._id]);
    expect(
      await t.action(internal.notifications.push.sendPushNotification, {
        message: "Export freezes",
        title: "New feedback",
        type: "new_feedback",
        userId: OWNER._id,
      })
    ).toEqual({ reason: "type_disabled", sent: 0 });
  });

  test("an admin is not alerted about feedback they wrote themselves", async () => {
    const { alertedEmails, alertedUserIds, as, organizationId, t } =
      await setup();
    const feedbackId = await as(ADMIN).mutation(api.feedback.mutations.create, {
      description: "Noticed while testing the release build",
      organizationId,
      title: "Tray icon blurry on retina",
    });

    await applyRecordedTriage(t, { feedbackId, junk: 0 });

    expect(await alertedUserIds()).toEqual([OWNER._id]);
    expect(await alertedEmails()).toEqual([OWNER.email]);
  });

  test("feedback whose triage never finishes still alerts once the deadline passes", async () => {
    vi.useFakeTimers();
    const {
      alertedEmails,
      alertedUserIds,
      passAlertDeadlineWithoutTriage,
      submitThroughWidget,
    } = await setup();
    await submitThroughWidget();

    await passAlertDeadlineWithoutTriage();

    expect(await alertedUserIds()).toEqual([ADMIN._id, OWNER._id]);
    expect(await alertedEmails()).toEqual([ADMIN.email, OWNER.email]);
  });

  test("the deadline adds nothing when triage already alerted", async () => {
    vi.useFakeTimers();
    const {
      alertedEmails,
      alertedUserIds,
      passAlertDeadlineWithoutTriage,
      submitThroughWidget,
      t,
    } = await setup();
    const feedbackId = await submitThroughWidget();
    await applyRecordedTriage(t, { feedbackId, junk: 0 });

    await passAlertDeadlineWithoutTriage();

    expect(await alertedUserIds()).toEqual([ADMIN._id, OWNER._id]);
    expect(await alertedEmails()).toEqual([ADMIN.email, OWNER.email]);
  });
});
