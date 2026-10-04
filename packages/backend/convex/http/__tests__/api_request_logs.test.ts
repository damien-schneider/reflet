/// <reference types="vite/client" />

import { expect, test } from "vitest";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const PUBLIC_KEY = "fb_pub_logged";

const setup = async () => {
  const t = setupTest();
  const organizationApiKeyId = await t.run(async (ctx) =>
    ctx.db.insert("organizationApiKeys", {
      createdAt: Date.now(),
      isActive: true,
      name: "Widget",
      organizationId: await seedOrganization(ctx),
      publicKey: PUBLIC_KEY,
      secretKeyHash: "c".repeat(64),
    })
  );
  const createFeedback = (body: Record<string, unknown>) =>
    t.fetch("/api/v1/feedback/create", {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${PUBLIC_KEY}`,
        "User-Agent": "reflet-sdk/0.6.2",
      },
      method: "POST",
    });
  const requestLogs = () =>
    t.run((ctx) => ctx.db.query("apiRequestLogs").collect());
  return { createFeedback, organizationApiKeyId, requestLogs };
};

test("a rejected API request is logged against the key that made it", async () => {
  const { createFeedback, organizationApiKeyId, requestLogs } = await setup();

  const response = await createFeedback({ title: "No description" });

  expect(response.status).toBe(400);
  expect(await requestLogs()).toMatchObject([
    {
      endpoint: "/api/v1/feedback/create",
      method: "POST",
      organizationApiKeyId,
      statusCode: 400,
      userAgent: "reflet-sdk/0.6.2",
    },
  ]);
});

test("a successful API request is not logged", async () => {
  const { createFeedback, requestLogs } = await setup();

  const response = await createFeedback({
    description: "Checkout button does nothing",
    title: "Checkout",
  });

  expect(response.status).toBe(201);
  expect(await requestLogs()).toEqual([]);
});
