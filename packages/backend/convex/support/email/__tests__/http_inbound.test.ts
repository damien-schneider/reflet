/// <reference types="vite/client" />
import { Webhook } from "svix";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { setupTest } from "../../../test.helpers";

const SECRET = `whsec_${btoa("support-inbound-test-secret-32b!")}`;

const receivedEvent = JSON.stringify({
  created_at: "2026-10-04T12:00:00.000Z",
  data: {
    created_at: "2026-10-04T12:00:00.000Z",
    email_id: "re_inbound_1",
    from: "ana@customer.app",
    message_id: "<CAF123@mail.gmail.com>",
    subject: "Re: Export is broken",
    to: ["r+0123456789abcdef0123456789abcdef@inbox.reflet.app"],
  },
  type: "email.received",
});

const signedHeaders = (secret: string, body: string) => {
  const messageId = "msg_test";
  const timestamp = new Date();
  return {
    "svix-id": messageId,
    "svix-signature": new Webhook(secret).sign(messageId, timestamp, body),
    "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
  };
};

describe("POST /resend-support-inbound", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_SUPPORT_INBOUND_WEBHOOK_SECRET", SECRET);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("rejects a payload with an invalid signature", async () => {
    const t = setupTest();
    const otherSecret = `whsec_${btoa("another-secret-entirely-32bytes!")}`;

    const response = await t.fetch("/resend-support-inbound", {
      body: receivedEvent,
      headers: signedHeaders(otherSecret, receivedEvent),
      method: "POST",
    });

    expect(response.status).toBe(401);
    const rows = await t.run((ctx) =>
      ctx.db.query("supportInboundEmails").collect()
    );
    expect(rows).toEqual([]);
  });

  test("stores a signed email as pending", async () => {
    const t = setupTest();

    const response = await t.fetch("/resend-support-inbound", {
      body: receivedEvent,
      headers: signedHeaders(SECRET, receivedEvent),
      method: "POST",
    });

    expect(response.status).toBe(200);
    const rows = await t.run((ctx) =>
      ctx.db.query("supportInboundEmails").collect()
    );
    expect(
      rows.map(({ from, resendEmailId, rfcMessageId, status }) => ({
        from,
        resendEmailId,
        rfcMessageId,
        status,
      }))
    ).toEqual([
      {
        from: "ana@customer.app",
        resendEmailId: "re_inbound_1",
        rfcMessageId: "<CAF123@mail.gmail.com>",
        status: "pending",
      },
    ]);
  });
});
