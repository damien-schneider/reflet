/// <reference types="vite/client" />
import { afterEach, describe, expect, test, vi } from "vitest";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const DNS_ENDPOINT = "https://cloudflare-dns.com";
const CHECK_BATCH_SIZE = 10;

const seedMonitor = (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  url: string
) =>
  ctx.db.insert("statusMonitors", {
    alertThreshold: 3,
    checkIntervalMinutes: 5,
    consecutiveFailures: 0,
    createdAt: Date.now(),
    isPublic: true,
    name: "API",
    organizationId,
    status: "operational",
    updatedAt: Date.now(),
    url,
  });

/** Every hostname resolves publicly; any non-DNS request answers 204. */
const stubPublicInternet = () => {
  const fetchMock = vi.fn(async (input: URL | string) =>
    String(input).startsWith(DNS_ENDPOINT)
      ? Response.json({ Answer: [{ data: "93.184.216.34", type: 1 }] })
      : new Response(null, { status: 204 })
  );
  vi.stubGlobal("fetch", fetchMock);
  return {
    targetUrls: () =>
      fetchMock.mock.calls
        .map(([input]) => String(input))
        .filter((url) => !url.startsWith(DNS_ENDPOINT)),
  };
};

const checkOne = async (url: string) => {
  const t = setupTest();
  const monitor = await t.run(async (ctx) => {
    const organizationId = await seedOrganization(ctx);
    const monitorId = await seedMonitor(ctx, organizationId, url);
    return { _id: monitorId, name: "API", organizationId, url };
  });
  await t.action(internal.status.healthCheck.checkMonitorBatch, {
    monitors: [monitor],
  });
  return await t.run((ctx) => ctx.db.query("statusChecks").collect());
};

describe("health checks", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("records a public URL as up", async () => {
    const { targetUrls } = stubPublicInternet();

    const checks = await checkOne("https://api.example.com/health");

    expect(targetUrls()).toEqual(["https://api.example.com/health"]);
    expect(checks).toMatchObject([{ isUp: true, statusCode: 204 }]);
  });

  test("never requests a legacy monitor pointing at the metadata service", async () => {
    const { targetUrls } = stubPublicInternet();

    const checks = await checkOne("http://169.254.169.254/latest/meta-data/");

    expect(targetUrls()).toEqual([]);
    expect(checks).toMatchObject([
      { errorMessage: "URL must point to a public address", isUp: false },
    ]);
  });

  test("records nothing when the resolver itself is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("unavailable", { status: 503 }))
    );

    const checks = await checkOne("https://api.example.com/health");

    expect(checks).toEqual([]);
  });

  test("fans due monitors out into bounded batches", async () => {
    const t = setupTest();
    const monitorCount = CHECK_BATCH_SIZE * 2 + 3;
    await t.run(async (ctx) => {
      const organizationId = await seedOrganization(ctx);
      for (let i = 0; i < monitorCount; i++) {
        await seedMonitor(ctx, organizationId, `https://s${i}.example.com/`);
      }
    });

    await t.action(internal.status.healthCheck.runHealthChecks, {});

    const batches = await t.run(async (ctx) =>
      (await ctx.db.system.query("_scheduled_functions").collect()).filter(
        (job) => job.name.includes("checkMonitorBatch")
      )
    );
    const batchSizes = batches.map((job) => job.args[0].monitors.length);
    expect(batchSizes).toEqual([CHECK_BATCH_SIZE, CHECK_BATCH_SIZE, 3]);
  });
});
