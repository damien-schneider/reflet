/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "../../_generated/api";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const DNS_ENDPOINT = "https://cloudflare-dns.com";
const OWNER = { _id: "user_owner", email: "owner@example.com" };
const MEMBER = { _id: "user_member", email: "member@example.com" };
const SLACK_URL = "https://hooks.slack.com/services/T000/B000/secret";
const DISCORD_URL = "https://discord.com/api/webhooks/123/token";
const WEBHOOK_URL = "https://ops.acme.example/status-alerts";
const OTHER_ORG_URL = "https://ops.other.example/status-alerts";
const STATUS_PAGE_URL = "https://reflet.app/acme/status";
const INCIDENT_TITLE = "API is experiencing issues";

const stubPublicInternet = (statusFor: (url: string) => number = () => 204) => {
  const posts: { body: unknown; url: string }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith(DNS_ENDPOINT)) {
        return Response.json({ Answer: [{ data: "93.184.216.34", type: 1 }] });
      }
      posts.push({ body: JSON.parse(String(init?.body)), url });
      return new Response(null, { status: statusFor(url) });
    })
  );
  return { posts };
};

const setup = async () => {
  const t = setupTest({ authUsers: [OWNER, MEMBER] });
  const { monitorId, organizationId } = await t.run(async (ctx) => {
    const orgId = await seedOrganization(ctx);
    const otherOrgId = await seedOrganization(ctx, {
      name: "Other",
      slug: "other",
    });
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: orgId,
      role: "owner",
      userId: OWNER._id,
    });
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: orgId,
      role: "member",
      userId: MEMBER._id,
    });
    await ctx.db.insert("statusAlertChannels", {
      createdAt: Date.now(),
      kind: "webhook",
      organizationId: otherOrgId,
      url: OTHER_ORG_URL,
    });
    return {
      monitorId: await ctx.db.insert("statusMonitors", {
        alertThreshold: 3,
        checkIntervalMinutes: 5,
        consecutiveFailures: 0,
        createdAt: Date.now(),
        isPublic: true,
        name: "API",
        organizationId: orgId,
        status: "operational",
        updatedAt: Date.now(),
        url: "https://api.acme.example/health",
      }),
      organizationId: orgId,
    };
  });
  const owner = t.withIdentity({ sessionId: OWNER._id, subject: OWNER._id });
  const member = t.withIdentity({ sessionId: MEMBER._id, subject: MEMBER._id });

  const addChannels = async () => {
    const slackId = await owner.mutation(
      api.status.alertChannels.addAlertChannel,
      {
        kind: "slack",
        label: "#ops",
        organizationId,
        url: SLACK_URL,
      }
    );
    await owner.mutation(api.status.alertChannels.addAlertChannel, {
      kind: "discord",
      organizationId,
      url: DISCORD_URL,
    });
    const webhookId = await owner.mutation(
      api.status.alertChannels.addAlertChannel,
      { kind: "webhook", organizationId, url: WEBHOOK_URL }
    );
    return { slackId, webhookId };
  };
  const recordCheck = (isUp: boolean) =>
    t.mutation(internal.status.healthCheck.recordCheck, { isUp, monitorId });
  const failUntilOutage = async () => {
    for (const _failure of [1, 2, 3]) {
      await recordCheck(false);
    }
  };
  const deliverAlerts = async () => {
    for (const _hop of ["fan out", "delivery"]) {
      vi.runOnlyPendingTimers();
      await t.finishInProgressScheduledFunctions();
    }
  };
  const listChannels = (viewer: typeof owner) =>
    viewer.query(api.status.alertChannels.listAlertChannels, {
      organizationId,
    });

  return {
    addChannels,
    deliverAlerts,
    failUntilOutage,
    listChannels,
    member,
    organizationId,
    owner,
    recordCheck,
  };
};

const bodiesByUrl = (posts: { body: unknown; url: string }[]) =>
  Object.fromEntries(posts.map(({ body, url }) => [url, body]));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("SITE_URL", "https://reflet.app");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("status alert channels", () => {
  test("an automatic outage and its recovery post to every channel of the organization and nowhere else", async () => {
    const { posts } = stubPublicInternet();
    const { addChannels, deliverAlerts, failUntilOutage, recordCheck } =
      await setup();
    await addChannels();

    await failUntilOutage();
    await deliverAlerts();

    expect(bodiesByUrl(posts)).toEqual({
      [DISCORD_URL]: expect.objectContaining({
        content: `Incident detected: ${INCIDENT_TITLE}`,
        embeds: [expect.objectContaining({ url: STATUS_PAGE_URL })],
      }),
      [SLACK_URL]: expect.objectContaining({
        blocks: expect.any(Array),
        text: `Incident detected: ${INCIDENT_TITLE}`,
      }),
      [WEBHOOK_URL]: {
        event: "incident.detected",
        incident: {
          affectedMonitors: ["API"],
          id: expect.any(String),
          severity: "major",
          startedAt: expect.any(Number),
          status: "investigating",
          title: INCIDENT_TITLE,
        },
        organization: { name: "Acme", slug: "acme" },
        statusPageUrl: STATUS_PAGE_URL,
      },
    });

    posts.splice(0);
    await recordCheck(true);
    await deliverAlerts();

    expect(bodiesByUrl(posts)).toEqual({
      [DISCORD_URL]: expect.objectContaining({
        content: `Incident resolved: ${INCIDENT_TITLE}`,
      }),
      [SLACK_URL]: expect.objectContaining({
        text: `Incident resolved: ${INCIDENT_TITLE}`,
      }),
      [WEBHOOK_URL]: expect.objectContaining({
        event: "incident.resolved",
        incident: expect.objectContaining({
          resolvedAt: expect.any(Number),
          status: "resolved",
        }),
      }),
    });
  });

  test("a failing channel records its error while the others still deliver", async () => {
    const { posts } = stubPublicInternet((url) =>
      url === SLACK_URL ? 500 : 204
    );
    const { addChannels, deliverAlerts, failUntilOutage, listChannels, owner } =
      await setup();
    await addChannels();

    await failUntilOutage();
    await deliverAlerts();

    expect(posts.map(({ url }) => url).sort()).toEqual(
      [DISCORD_URL, SLACK_URL, WEBHOOK_URL].sort()
    );
    expect(await listChannels(owner)).toMatchObject([
      { kind: "slack", lastDelivery: { error: "HTTP 500" } },
      { kind: "discord", lastDelivery: { deliveredAt: expect.any(Number) } },
      { kind: "webhook", lastDelivery: { deliveredAt: expect.any(Number) } },
    ]);
  });

  test("a test alert posts only to the chosen channel", async () => {
    const { posts } = stubPublicInternet();
    const { addChannels, deliverAlerts, owner } = await setup();
    const { webhookId } = await addChannels();

    await owner.mutation(api.status.alertChannels.sendTestAlert, {
      channelId: webhookId,
    });
    await deliverAlerts();

    expect(posts).toEqual([
      {
        body: {
          event: "test",
          organization: { name: "Acme", slug: "acme" },
          statusPageUrl: STATUS_PAGE_URL,
        },
        url: WEBHOOK_URL,
      },
    ]);
  });

  test("members see channels without their secret URLs", async () => {
    const { addChannels, listChannels, member } = await setup();
    await addChannels();

    const channels = await listChannels(member);

    expect(JSON.stringify(channels)).not.toContain("secret");
    expect(channels[0]).toMatchObject({
      kind: "slack",
      label: "#ops",
      maskedUrl: "hooks.slack.com/…cret",
    });
  });

  test("rejects a Slack channel that is not a Slack webhook URL", async () => {
    const { organizationId, owner } = await setup();

    await expect(
      owner.mutation(api.status.alertChannels.addAlertChannel, {
        kind: "slack",
        organizationId,
        url: "https://example.com/services/T000/B000/secret",
      })
    ).rejects.toThrow("hooks.slack.com");
  });

  test("members cannot add alert channels", async () => {
    const { member, organizationId } = await setup();

    await expect(
      member.mutation(api.status.alertChannels.addAlertChannel, {
        kind: "webhook",
        organizationId,
        url: WEBHOOK_URL,
      })
    ).rejects.toThrow("Only admins");
  });
});
