/// <reference types="vite/client" />
import type { EmailId } from "@convex-dev/resend";
import { describe, expect, test } from "vitest";
import { internal } from "../../../_generated/api";
import type { Doc, Id } from "../../../_generated/dataModel";
import { isSupportRecipientSuppressed } from "../../../email/suppression";
import {
  scheduledFunctionNames,
  seedOrganization,
} from "../../../test.fixtures";
import { setupTest } from "../../../test.helpers";

const CUSTOMER_EMAIL = "ana@customer.app";
const PLATFORM_ALERT = "email/renderer:sendPlatformAlertEmail";
const EVENT_TIME = "2026-10-04T12:00:00.000Z";

const emailData = (emailId: string) => ({
  created_at: EVENT_TIME,
  email_id: emailId,
  from: "Acme <support@support.acme.com>",
  subject: "Re: Export is broken",
  to: [CUSTOMER_EMAIL],
});

const setup = async () => {
  const t = setupTest();
  const [acmeId, otherId] = await t.run(async (ctx) => [
    await seedOrganization(ctx, { slug: "acme" }),
    await seedOrganization(ctx, { slug: "other" }),
  ]);

  const logSupportEmails = (
    organizationId: Id<"organizations">,
    count: number,
    fields: Partial<Doc<"emailSendLog">> = {}
  ) =>
    t.run(async (ctx) => {
      const ids: string[] = [];
      for (let index = 0; index < count; index += 1) {
        const resendEmailId = `email_${crypto.randomUUID()}`;
        await ctx.db.insert("emailSendLog", {
          emailType: "support_reply",
          organizationId,
          resendEmailId,
          sentAt: Date.now(),
          status: "delivered",
          subject: "Re: Export is broken",
          to: CUSTOMER_EMAIL,
          ...fields,
        });
        ids.push(resendEmailId);
      }
      return ids;
    });

  const complain = (emailId: string) =>
    t.mutation(internal.support.email.events.handleSupportEmailEvent, {
      event: {
        created_at: EVENT_TIME,
        data: emailData(emailId),
        type: "email.complained",
      },
      // EmailId is a compile-time brand only; the component mints it at send time.
      id: emailId as EmailId,
    });

  const bounce = (emailId: string, bounceType: "Permanent" | "Transient") =>
    t.mutation(internal.support.email.events.handleSupportEmailEvent, {
      event: {
        created_at: EVENT_TIME,
        data: {
          ...emailData(emailId),
          bounce: { message: "rejected", subType: "General", type: bounceType },
        },
        type: "email.bounced",
      },
      id: emailId as EmailId,
    });

  const suppressedFor = (organizationId: Id<"organizations">) =>
    t.run((ctx) =>
      isSupportRecipientSuppressed(ctx, CUSTOMER_EMAIL, organizationId)
    );

  const pauseOf = (organizationId: Id<"organizations">) =>
    t.run(async (ctx) => {
      const settings = await ctx.db
        .query("supportEmailSettings")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId)
        )
        .unique();
      return settings?.sendingPauseReason ?? null;
    });

  const alertCount = async () =>
    (await t.run(scheduledFunctionNames)).filter(
      (name) => name === PLATFORM_ALERT
    ).length;

  return {
    acmeId,
    alertCount,
    bounce,
    complain,
    logSupportEmails,
    otherId,
    pauseOf,
    suppressedFor,
    t,
  };
};

describe("support email events", () => {
  test("a complaint suppresses the recipient for that organization only", async () => {
    const { acmeId, complain, logSupportEmails, otherId, suppressedFor, t } =
      await setup();
    const [emailId = ""] = await logSupportEmails(acmeId, 1);

    await complain(emailId);

    expect(await suppressedFor(acmeId)).toBe(true);
    expect(await suppressedFor(otherId)).toBe(false);
    expect(
      await t.query(internal.email.suppression.isEmailSuppressed, {
        email: CUSTOMER_EMAIL,
      })
    ).toBe(false);
  });

  test("a hard bounce suppresses the recipient everywhere", async () => {
    const { acmeId, bounce, logSupportEmails, otherId, suppressedFor } =
      await setup();
    const [emailId = ""] = await logSupportEmails(acmeId, 1);

    await bounce(emailId, "Permanent");

    expect(await suppressedFor(acmeId)).toBe(true);
    expect(await suppressedFor(otherId)).toBe(true);
  });

  test("three complaints within a day pause sending once and alert the platform", async () => {
    const { acmeId, alertCount, complain, logSupportEmails, otherId, pauseOf } =
      await setup();
    const emailIds = await logSupportEmails(acmeId, 4);

    for (const emailId of emailIds.slice(0, 2)) {
      await complain(emailId);
    }
    expect(await pauseOf(acmeId)).toBeNull();

    for (const emailId of emailIds.slice(2)) {
      await complain(emailId);
    }
    expect(await pauseOf(acmeId)).toBe("complaint_rate");
    expect(await pauseOf(otherId)).toBeNull();
    expect(await alertCount()).toBe(1);
  });

  test("a bounce rate of 4% over at least 100 sends pauses sending", async () => {
    const { acmeId, bounce, logSupportEmails, pauseOf } = await setup();
    await logSupportEmails(acmeId, 2, { status: "bounced" });
    await logSupportEmails(acmeId, 96);
    const [thirdBounce = "", fourthBounce = ""] = await logSupportEmails(
      acmeId,
      2
    );

    await bounce(thirdBounce, "Permanent");
    expect(await pauseOf(acmeId)).toBeNull();

    await bounce(fourthBounce, "Permanent");
    expect(await pauseOf(acmeId)).toBe("bounce_rate");
  });

  test("bounces of non-support emails do not count toward the pause", async () => {
    const { acmeId, bounce, logSupportEmails, pauseOf } = await setup();
    await logSupportEmails(acmeId, 100, {
      emailType: "changelog_notification",
      status: "bounced",
    });
    const [emailId = ""] = await logSupportEmails(acmeId, 1);

    await bounce(emailId, "Permanent");

    expect(await pauseOf(acmeId)).toBeNull();
  });
});
