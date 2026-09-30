/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { hmacSha256Hex } from "../../shared/hmac";
import { seedFeedback, seedOrganization } from "../../test.fixtures";
import { modules } from "../../test.helpers";

const DNS_ENDPOINT = "https://cloudflare-dns.com";
const PUBLIC_ADDRESS = "93.184.216.34";

/** Stubs fetch: DNS lookups resolve to `resolvedAddress`, everything else is the hook. */
const stubFetch = (
  hookResponse: () => Response,
  resolvedAddress = PUBLIC_ADDRESS
) => {
  const fetchMock = vi.fn(async (input: URL | string, _init?: RequestInit) =>
    String(input).startsWith(DNS_ENDPOINT)
      ? Response.json({ Answer: [{ data: resolvedAddress, type: 1 }] })
      : hookResponse()
  );
  vi.stubGlobal("fetch", fetchMock);
  return {
    hookCalls: () =>
      fetchMock.mock.calls.filter(
        ([input]) => !String(input).startsWith(DNS_ENDPOINT)
      ),
  };
};

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
    const { hookCalls } = stubFetch(() => new Response("ok", { status: 200 }));

    await t.action(internal.webhooks.deliver.deliver, {
      deliveryId: ids.deliveryId,
    });

    const [url, init] = hookCalls()[0] ?? [];
    const headers = new Headers(init?.headers);
    const body = String(init?.body);
    expect(String(url)).toBe("https://example.com/hook");
    expect(headers.get("X-Reflet-Event")).toBe("feedback.created");
    expect(headers.get("X-Reflet-Signature")).toBe(
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
    stubFetch(() => new Response("nope", { status: 500 }));

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
    stubFetch(() => {
      throw new Error("connect ECONNREFUSED 203.0.113.9:443");
    });

    await t.action(internal.webhooks.deliver.deliver, {
      deliveryId: ids.deliveryId,
    });

    const state = await readState(t, ids);
    expect(state.webhook?.isActive).toBe(false);
    expect(state.delivery?.lastError).toBe("Request failed");
  });

  test("refuses to post to a hook whose host resolves to a private address", async () => {
    const t = convexTest(schema, modules);
    const ids = await seedDelivery(t);
    const { hookCalls } = stubFetch(
      () => new Response("internal", { status: 200 }),
      "169.254.169.254"
    );

    await t.action(internal.webhooks.deliver.deliver, {
      deliveryId: ids.deliveryId,
    });

    expect(hookCalls()).toHaveLength(0);
    const state = await readState(t, ids);
    expect(state.delivery?.lastError).toBe(
      "URL must point to a public address"
    );
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
