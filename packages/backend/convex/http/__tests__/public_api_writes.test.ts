/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const PUBLIC_KEY = "fb_pub_quota";
const PUBLIC_KEY_REPORTS_PER_MINUTE = 30;

async function setup() {
  const t = setupTest();
  const seeded = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx, { isPublic: false });
    await ctx.db.insert("organizationApiKeys", {
      createdAt: Date.now(),
      isActive: true,
      name: "Widget",
      organizationId,
      publicKey: PUBLIC_KEY,
      secretKeyHash: "c".repeat(64),
    });
    const surveyId = await ctx.db.insert("surveys", {
      completionRate: 0,
      createdAt: Date.now(),
      createdBy: "user-1",
      organizationId,
      responseCount: 0,
      status: "active",
      title: "NPS",
      triggerType: "manual",
      updatedAt: Date.now(),
    });
    return { organizationId, surveyId };
  });
  return { ...seeded, t };
}

const post = (body: Record<string, unknown>, headers = {}): RequestInit => ({
  body: JSON.stringify(body),
  headers: { Authorization: `Bearer ${PUBLIC_KEY}`, ...headers },
  method: "POST",
});

const unsignedToken = (payload: Record<string, unknown>) =>
  `${btoa(JSON.stringify({ alg: "none" }))}.${btoa(JSON.stringify(payload))}.`;

describe("public-key writes", () => {
  test("survey starts and screenshot uploads do not starve feedback reports", async () => {
    const { surveyId, t } = await setup();
    for (let i = 0; i <= PUBLIC_KEY_REPORTS_PER_MINUTE; i++) {
      const start = await t.fetch(
        "/api/v1/surveys/respond/start",
        post({ surveyId })
      );
      const upload = await t.fetch(
        "/api/v1/feedback/screenshot/upload-url",
        post({})
      );
      expect(start.status).toBe(200);
      expect(upload.status).toBe(200);
    }

    const report = await t.fetch(
      "/api/v1/feedback/create",
      post({ description: "Broken", title: "Checkout" })
    );

    expect(report.status).toBe(201);
  });

  test("feedback reports are limited per public key", async () => {
    const { t } = await setup();
    for (let i = 0; i < PUBLIC_KEY_REPORTS_PER_MINUTE; i++) {
      const response = await t.fetch(
        "/api/v1/feedback/create",
        post({ description: `Report ${i}`, title: "Checkout" })
      );
      expect(response.status).toBe(201);
    }

    const over = await t.fetch(
      "/api/v1/feedback/create",
      post({ description: "One more", title: "Checkout" })
    );

    expect(over.status).toBe(429);
    const feedback = await t.run((ctx) => ctx.db.query("feedback").collect());
    expect(feedback).toHaveLength(PUBLIC_KEY_REPORTS_PER_MINUTE);
  });

  test("an unsigned user token cannot rename or act as a signed-in user", async () => {
    const { organizationId, t } = await setup();
    await t.run((ctx) =>
      ctx.db.insert("externalUsers", {
        createdAt: Date.now(),
        email: "ada@acme.test",
        externalId: "1042",
        lastSeenAt: Date.now(),
        name: "Ada",
        organizationId,
        verified: true,
      })
    );

    const response = await t.fetch(
      "/api/v1/feedback/create",
      post(
        { description: "Spam", title: "Spam" },
        {
          "X-User-Token": unsignedToken({
            email: "attacker@evil.test",
            id: "1042",
            name: "Support",
          }),
        }
      )
    );

    expect(response.status).toBe(201);
    const user = await t.run((ctx) => ctx.db.query("externalUsers").unique());
    const feedback = await t.run((ctx) => ctx.db.query("feedback").unique());
    const votes = await t.run((ctx) => ctx.db.query("feedbackVotes").collect());
    expect(user).toMatchObject({ email: "ada@acme.test", name: "Ada" });
    expect(feedback?.externalUserId).toBeUndefined();
    expect(votes).toHaveLength(0);
  });
});
