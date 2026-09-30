/// <reference types="vite/client" />
import type { EmailId } from "@convex-dev/resend";
import { expect, test } from "vitest";
import { internal } from "../../_generated/api";
import type { MutationCtx } from "../../_generated/server";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

// EmailId is a compile-time brand only; the component mints it at send time.
const EMAIL_ID = "email_1" as EmailId;

const emailData = (to: string) => ({
  created_at: "2026-09-30T12:00:00.000Z",
  email_id: "re_123",
  from: "Reflet <team@mail.reflet.app>",
  subject: "v1 is out",
  to: [to],
});

const bounceEvent = (to: string, bounceType: string) => ({
  created_at: "2026-09-30T12:00:00.000Z",
  data: {
    ...emailData(to),
    bounce: { message: "rejected", subType: "General", type: bounceType },
  },
  type: "email.bounced" as const,
});

const suppressedEmails = async (ctx: MutationCtx) =>
  (await ctx.db.query("emailSuppressions").collect()).map(
    ({ email, reason }) => ({ email, reason })
  );

test("permanent bounce suppresses the lowercased address", async () => {
  const t = setupTest();
  await t.mutation(internal.email.send.handleEmailEvent, {
    event: bounceEvent("Jane.Doe@Example.test", "Permanent"),
    id: EMAIL_ID,
  });

  expect(await t.run(suppressedEmails)).toEqual([
    { email: "jane.doe@example.test", reason: "hard_bounce" },
  ]);
  const isSuppressed = await t.query(
    internal.email.suppression.isEmailSuppressed,
    { email: "jane.doe@example.test" }
  );
  expect(isSuppressed).toBe(true);
});

test("transient and undetermined bounces keep the address sendable", async () => {
  const t = setupTest();
  for (const bounceType of ["Transient", "Undetermined"]) {
    await t.mutation(internal.email.send.handleEmailEvent, {
      event: bounceEvent("full-inbox@example.test", bounceType),
      id: EMAIL_ID,
    });
  }

  expect(await t.run(suppressedEmails)).toEqual([]);
});

test("failed send is recorded instead of crashing the webhook", async () => {
  const t = setupTest();
  const sendLogId = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    return await ctx.db.insert("emailSendLog", {
      emailType: "changelog_notification",
      organizationId,
      resendEmailId: EMAIL_ID,
      sentAt: Date.now(),
      status: "sent",
      subject: "v1 is out",
      to: "someone@example.test",
    });
  });

  await t.mutation(internal.email.send.handleEmailEvent, {
    event: {
      created_at: "2026-09-30T12:00:00.000Z",
      data: {
        ...emailData("someone@example.test"),
        failed: { reason: "reached_daily_quota" },
      },
      type: "email.failed",
    },
    id: EMAIL_ID,
  });

  const sendLog = await t.run(async (ctx) => await ctx.db.get(sendLogId));
  expect(sendLog?.status).toBe("failed");
  expect(await t.run(suppressedEmails)).toEqual([]);
});
