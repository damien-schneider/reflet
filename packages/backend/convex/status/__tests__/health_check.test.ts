/// <reference types="vite/client" />
import { Readable } from "node:stream";
import { afterEach, describe, expect, test, vi } from "vitest";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const DNS_ENDPOINT = "https://cloudflare-dns.com";
const CHECK_BATCH_SIZE = 10;

const dns = vi.hoisted(() => ({ lookup: vi.fn() }));
const https = vi.hoisted(() => ({ request: vi.fn() }));

vi.mock("node:dns/promises", () => dns);
vi.mock("node:https", () => https);

const seedMonitor = (
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  url: string,
  overrides: Partial<Doc<"statusMonitors">> = {}
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
    ...overrides,
  });

const isDnsLookup = (input: URL | string) =>
  String(input).startsWith(DNS_ENDPOINT);

const stubPublicInternet = (
  answer: (method: string, attempt: number) => number = () => 204
) => {
  const targetRequests: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string, init?: RequestInit) => {
      if (isDnsLookup(input)) {
        return Response.json({ Answer: [{ data: "93.184.216.34", type: 1 }] });
      }
      const method = init?.method ?? "GET";
      targetRequests.push(`${method} ${String(input)}`);
      return new Response(null, {
        status: answer(method, targetRequests.length),
      });
    })
  );
  return { targetRequests };
};

const servePage = (body: string) => {
  const pageRequests: string[] = [];
  dns.lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  https.request.mockImplementation(
    (
      url: URL,
      options: { method?: string },
      onResponse: (page: Readable) => void
    ) => ({
      end: () => {
        pageRequests.push(`${options.method ?? "GET"} ${url.href}`);
        onResponse(
          Object.assign(Readable.from([Buffer.from(body)]), {
            headers: {},
            statusCode: 200,
          })
        );
      },
      on: vi.fn(),
    })
  );
  return { pageRequests };
};

const checkDue = async (overrides: Partial<Doc<"statusMonitors">>) => {
  vi.useFakeTimers();
  const t = setupTest();
  const monitorId = await t.run(async (ctx) =>
    seedMonitor(
      ctx,
      await seedOrganization(ctx),
      "https://api.example.com/health",
      overrides
    )
  );
  await t.action(internal.status.healthCheck.runHealthChecks, {});
  await t.finishAllScheduledFunctions(vi.runAllTimers);
  return await t.run(async (ctx) => ({
    checks: await ctx.db.query("statusChecks").collect(),
    monitor: await ctx.db.get(monitorId),
  }));
};

const checkOne = async (url: string) => {
  const t = setupTest();
  const monitorId = await t.run(async (ctx) =>
    seedMonitor(ctx, await seedOrganization(ctx), url)
  );
  await t.action(internal.status.healthCheck.checkMonitorBatch, {
    monitors: [{ _id: monitorId, url }],
  });
  return await t.run(async (ctx) => ({
    checks: await ctx.db.query("statusChecks").collect(),
    monitor: await ctx.db.get(monitorId),
  }));
};

describe("health checks", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  test("records a public URL as up", async () => {
    const { targetRequests } = stubPublicInternet();

    const { checks } = await checkOne("https://api.example.com/health");

    expect(targetRequests).toEqual(["HEAD https://api.example.com/health"]);
    expect(checks).toMatchObject([{ isUp: true, statusCode: 204 }]);
  });

  test("confirms a server that rejects HEAD with a GET", async () => {
    const { targetRequests } = stubPublicInternet((method) =>
      method === "HEAD" ? 405 : 200
    );

    const { checks, monitor } = await checkOne("https://api.example.com/");

    expect(targetRequests).toEqual([
      "HEAD https://api.example.com/",
      "GET https://api.example.com/",
    ]);
    expect(checks).toMatchObject([{ isUp: true, statusCode: 200 }]);
    expect(monitor?.status).toBe("operational");
  });

  test("does not count a failure the confirmation request disproves", async () => {
    stubPublicInternet((_method, attempt) => (attempt === 1 ? 503 : 204));

    const { checks, monitor } = await checkOne("https://api.example.com/");

    expect(checks).toMatchObject([{ isUp: true }]);
    expect(monitor).toMatchObject({
      consecutiveFailures: 0,
      status: "operational",
    });
  });

  test("counts a failure confirmed twice", async () => {
    const { targetRequests } = stubPublicInternet(() => 503);

    const { checks, monitor } = await checkOne("https://api.example.com/");

    expect(targetRequests).toHaveLength(2);
    expect(checks).toMatchObject([{ isUp: false, statusCode: 503 }]);
    expect(monitor).toMatchObject({
      consecutiveFailures: 1,
      status: "degraded",
    });
  });

  test("counts an unexpected status code as down once confirmed", async () => {
    const { targetRequests } = stubPublicInternet(() => 204);

    const { checks, monitor } = await checkDue({ expectedStatusCodes: [200] });

    expect(targetRequests).toHaveLength(2);
    expect(checks).toMatchObject([
      {
        errorMessage: "Expected status 200, got 204",
        isUp: false,
        statusCode: 204,
      },
    ]);
    expect(monitor).toMatchObject({
      consecutiveFailures: 1,
      status: "degraded",
    });
  });

  test("records a page containing the keyword as up", async () => {
    servePage("<p>status: all systems ok</p>");

    const { checks, monitor } = await checkDue({ bodyKeyword: "systems ok" });

    expect(checks).toMatchObject([{ isUp: true, statusCode: 200 }]);
    expect(monitor?.status).toBe("operational");
  });

  test("counts a page missing the keyword as down once confirmed", async () => {
    const { pageRequests } = servePage("<p>maintenance</p>");

    const { checks, monitor } = await checkDue({ bodyKeyword: "ok" });

    expect(pageRequests).toHaveLength(2);
    expect(checks).toMatchObject([
      { errorMessage: 'Keyword "ok" not found', isUp: false, statusCode: 200 },
    ]);
    expect(monitor?.consecutiveFailures).toBe(1);
  });

  test("reads the body with GET when a HEAD monitor has a keyword", async () => {
    const { targetRequests } = stubPublicInternet();
    const { pageRequests } = servePage("ok");

    const { checks } = await checkDue({ bodyKeyword: "ok", method: "HEAD" });

    expect(targetRequests).toEqual([]);
    expect(pageRequests).toEqual(["GET https://api.example.com/health"]);
    expect(checks).toMatchObject([{ isUp: true }]);
  });

  test("never requests a legacy monitor pointing at the metadata service", async () => {
    const { targetRequests } = stubPublicInternet();

    const { checks } = await checkOne(
      "http://169.254.169.254/latest/meta-data/"
    );

    expect(targetRequests).toEqual([]);
    expect(checks).toMatchObject([
      { errorMessage: "URL must point to a public address", isUp: false },
    ]);
  });

  test("records nothing when the resolver itself is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("unavailable", { status: 503 }))
    );

    const { checks } = await checkOne("https://api.example.com/health");

    expect(checks).toEqual([]);
  });

  test("a check landing after the monitor was paused leaves it paused", async () => {
    const t = setupTest();
    const monitorId = await t.run(async (ctx) =>
      seedMonitor(ctx, await seedOrganization(ctx), "https://a.example.com/", {
        status: "paused",
      })
    );

    await t.mutation(internal.status.healthCheck.recordCheck, {
      isUp: false,
      monitorId,
    });

    const monitor = await t.run((ctx) => ctx.db.get(monitorId));
    expect(monitor).toMatchObject({ consecutiveFailures: 0, status: "paused" });
  });

  test.each([
    { checkedAgoSeconds: 4 * 60 + 30, isDue: true },
    { checkedAgoSeconds: 4 * 60, isDue: false },
  ])(
    "a 5-minute monitor checked $checkedAgoSeconds s ago is due: $isDue",
    async ({ checkedAgoSeconds, isDue }) => {
      const t = setupTest();
      await t.run(async (ctx) =>
        seedMonitor(
          ctx,
          await seedOrganization(ctx),
          "https://a.example.com/",
          {
            lastCheckedAt: Date.now() - checkedAgoSeconds * 1000,
          }
        )
      );

      const page = await t.query(
        internal.status.healthCheck.getDueMonitorsPage,
        {
          paginationOpts: { cursor: null, numItems: 10 },
        }
      );

      expect(page.monitors.length === 1).toBe(isDue);
    }
  );

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
