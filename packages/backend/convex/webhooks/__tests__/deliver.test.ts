/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { hmacSha256Hex } from "../../shared/hmac";
import { seedFeedback, seedOrganization } from "../../test.fixtures";
import { modules } from "../../test.helpers";

async function seedDelivery(
  t: ReturnType<typeof convexTest>,
  feedbackOverrides: { isApproved?: boolean; isInternal?: boolean } = {}
) {
  return await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    const feedbackId = await seedFeedback(
      ctx,
      organizationId,
      feedbackOverrides
    );
    const now = Date.now();
    const webhookId = await ctx.db.insert("organizationWebhooks", {
      consecutiveFailures: 0,
      createdAt: now,
      events: ["feedback.created"],
      isActive: true,
      organizationId,
      secret: "shh",
      updatedAt: now,
      url: "https://example.com/hook",
    });
    const deliveryId = await ctx.db.insert("webhookDeliveries", {
      attempts: 0,
      createdAt: now,
      event: "feedback.created",
      feedbackId,
      organizationId,
      status: "pending",
      webhookId,
    });
    return { deliveryId, webhookId };
  });
}

async function readState(
  t: ReturnType<typeof convexTest>,
  ids: {
    deliveryId: Id<"webhookDeliveries">;
    webhookId: Id<"organizationWebhooks">;
  }
) {
  return await t.run(async (ctx) => ({
    delivery: await ctx.db.get(ids.deliveryId),
    scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
    webhook: await ctx.db.get(ids.webhookId),
  }));
}

describe("webhook delivery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("posts a signed payload and records success", async () => {
    const t = convexTest(schema, modules);
    const ids = await seedDelivery(t);
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await t.action(internal.webhooks.deliver.deliver, {
      deliveryId: ids.deliveryId,
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const headers = init.headers as Record<string, string>;
    const body = init.body as string;
    expect(url).toBe("https://example.com/hook");
    expect(headers["X-Reflet-Event"]).toBe("feedback.created");
    expect(headers["X-Reflet-Signature"]).toBe(
      `sha256=${await hmacSha256Hex("shh", body)}`
    );
    expect(JSON.parse(body).data.feedback.title).toBe("Draft lost on save");

    const state = await readState(t, ids);
    expect(state.delivery?.status).toBe("success");
    expect(state.delivery?.attempts).toBe(1);
  });

  test("retries twice then fails, counting consecutive failures", async () => {
    const t = convexTest(schema, modules);
    const ids = await seedDelivery(t);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 }))
    );

    await t.action(internal.webhooks.deliver.deliver, {
      deliveryId: ids.deliveryId,
    });
    const afterFirst = await readState(t, ids);
    expect(afterFirst.delivery?.status).toBe("pending");
    expect(afterFirst.delivery?.lastError).toBe("HTTP 500");
    expect(
      afterFirst.scheduled.filter((job) => job.name.includes("deliver"))
    ).toHaveLength(1);

    await t.action(internal.webhooks.deliver.deliver, {
      deliveryId: ids.deliveryId,
    });
    await t.action(internal.webhooks.deliver.deliver, {
      deliveryId: ids.deliveryId,
    });
    const afterThird = await readState(t, ids);
    expect(afterThird.delivery?.status).toBe("failed");
    expect(afterThird.delivery?.attempts).toBe(3);
    expect(afterThird.webhook?.consecutiveFailures).toBe(3);
    expect(afterThird.webhook?.isActive).toBe(true);
  });

  test("disables the hook after 20 consecutive failures", async () => {
    const t = convexTest(schema, modules);
    const ids = await seedDelivery(t);
    await t.run(async (ctx) => {
      await ctx.db.patch(ids.webhookId, { consecutiveFailures: 19 });
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      })
    );

    await t.action(internal.webhooks.deliver.deliver, {
      deliveryId: ids.deliveryId,
    });

    const state = await readState(t, ids);
    expect(state.webhook?.isActive).toBe(false);
    expect(state.delivery?.lastError).toBe("ECONNREFUSED");
  });

  test("skips unapproved feedback without calling the hook", async () => {
    const t = convexTest(schema, modules);
    const ids = await seedDelivery(t, { isApproved: false });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await t.action(internal.webhooks.deliver.deliver, {
      deliveryId: ids.deliveryId,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    const state = await readState(t, ids);
    expect(state.delivery?.status).toBe("skipped");
  });

  test("skips internal feedback without calling the hook", async () => {
    const t = convexTest(schema, modules);
    const ids = await seedDelivery(t, { isApproved: false, isInternal: true });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await t.action(internal.webhooks.deliver.deliver, {
      deliveryId: ids.deliveryId,
    });

    expect(fetchMock).not.toHaveBeenCalled();
    const state = await readState(t, ids);
    expect(state.delivery?.status).toBe("skipped");
  });
});
