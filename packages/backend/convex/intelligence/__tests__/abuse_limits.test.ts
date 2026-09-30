/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import { api, internal } from "../../_generated/api";
import { seedOrganization } from "../../test.fixtures";
import { setupTest } from "../../test.helpers";

const ADMIN = { _id: "user_admin", email: "admin@example.com" };
const MAX_COMPETITORS_PER_ORG = 20;
const MAX_KEYWORDS_PER_ORG = 50;
const COMPETITOR_CREATE_BURST = 10;
const SCAN_BURST = 3;

const setup = async () => {
  const t = setupTest({ authUsers: [ADMIN] });
  const organizationId = await t.run(async (ctx) => {
    const orgId = await seedOrganization(ctx);
    await ctx.db.insert("organizationMembers", {
      createdAt: Date.now(),
      organizationId: orgId,
      role: "owner",
      userId: ADMIN._id,
    });
    await ctx.db.insert("intelligenceConfig", {
      competitorTrackingEnabled: false,
      createdAt: Date.now(),
      organizationId: orgId,
      redditEnabled: true,
      scanFrequency: "weekly",
      updatedAt: Date.now(),
      webSearchEnabled: false,
    });
    await ctx.db.insert("intelligenceKeywords", {
      createdAt: Date.now(),
      keyword: "feedback tool",
      organizationId: orgId,
      source: "reddit",
    });
    return orgId;
  });
  const admin = t.withIdentity({ sessionId: ADMIN._id, subject: ADMIN._id });
  return { admin, organizationId, t };
};

describe("competitors", () => {
  test.each([
    { websiteUrl: "http://169.254.169.254/latest/meta-data/" },
    { websiteUrl: "http://localhost:3210/" },
    {
      pricingUrl: "http://10.1.2.3/pricing",
      websiteUrl: "https://rival.example.com/",
    },
  ])("rejects internal URLs %o", async (urls) => {
    const { admin, organizationId } = await setup();

    await expect(
      admin.mutation(api.intelligence.competitors.create, {
        name: "Rival",
        organizationId,
        ...urls,
      })
    ).rejects.toThrow(/public/);
  });

  test("rejects switching a competitor to an internal URL", async () => {
    const { admin, organizationId } = await setup();
    const id = await admin.mutation(api.intelligence.competitors.create, {
      name: "Rival",
      organizationId,
      websiteUrl: "https://rival.example.com/",
    });

    await expect(
      admin.mutation(api.intelligence.competitors.update, {
        changelogUrl: "http://127.0.0.1/changelog",
        id,
      })
    ).rejects.toThrow(/public/);
  });

  test("rate limits competitor creation, which triggers paid scraping", async () => {
    const { admin, organizationId } = await setup();
    for (let i = 0; i < COMPETITOR_CREATE_BURST; i++) {
      await admin.mutation(api.intelligence.competitors.create, {
        name: `Rival ${i}`,
        organizationId,
        websiteUrl: `https://rival-${i}.example.com/`,
      });
    }

    await expect(
      admin.mutation(api.intelligence.competitors.create, {
        name: "One more",
        organizationId,
        websiteUrl: "https://one-more.example.com/",
      })
    ).rejects.toThrow();
  });

  test("caps competitors per organization", async () => {
    const { admin, organizationId, t } = await setup();
    await t.run(async (ctx) => {
      for (let i = 0; i < MAX_COMPETITORS_PER_ORG; i++) {
        await ctx.db.insert("competitors", {
          createdAt: Date.now(),
          name: `Rival ${i}`,
          organizationId,
          status: "active",
          updatedAt: Date.now(),
          websiteUrl: `https://rival-${i}.example.com/`,
        });
      }
    });

    await expect(
      admin.mutation(api.intelligence.competitors.create, {
        name: "One more",
        organizationId,
        websiteUrl: "https://one-more.example.com/",
      })
    ).rejects.toThrow(`up to ${MAX_COMPETITORS_PER_ORG} competitors`);
  });

  test("rejects oversized descriptions before they reach the model", async () => {
    const { admin, organizationId } = await setup();

    await expect(
      admin.mutation(api.intelligence.competitors.create, {
        description: "x".repeat(50_000),
        name: "Rival",
        organizationId,
        websiteUrl: "https://rival.example.com/",
      })
    ).rejects.toThrow(/Description must be/);
  });
});

describe("keywords", () => {
  test("caps keywords per organization", async () => {
    const { admin, organizationId, t } = await setup();
    await t.run(async (ctx) => {
      for (let i = 1; i < MAX_KEYWORDS_PER_ORG; i++) {
        await ctx.db.insert("intelligenceKeywords", {
          createdAt: Date.now(),
          keyword: `keyword ${i}`,
          organizationId,
          source: "web",
        });
      }
    });

    await expect(
      admin.mutation(api.intelligence.keywords.create, {
        keyword: "one more",
        organizationId,
        source: "web",
      })
    ).rejects.toThrow(`up to ${MAX_KEYWORDS_PER_ORG} keywords`);
  });

  test("rejects oversized keywords", async () => {
    const { admin, organizationId } = await setup();

    await expect(
      admin.mutation(api.intelligence.keywords.create, {
        keyword: "x".repeat(5000),
        organizationId,
        source: "web",
      })
    ).rejects.toThrow(/Keyword must be/);
  });
});

describe("manual scans", () => {
  test("a cancelled scan stops instead of running in the background", async () => {
    const { admin, organizationId, t } = await setup();
    await admin.mutation(api.intelligence.scan_control.startManualScan, {
      organizationId,
    });
    await admin.mutation(api.intelligence.scan_control.cancelScan, {
      organizationId,
    });
    const job = await t.run((ctx) => ctx.db.query("intelligenceJobs").first());
    if (!job) {
      throw new Error("Expected a scan job");
    }

    await t.action(internal.intelligence.scan_pipeline.runOrgScan, {
      masterJobId: job._id,
      organizationId,
    });

    const state = await t.run(async (ctx) => ({
      config: await ctx.db.query("intelligenceConfig").first(),
      job: await ctx.db.get(job._id),
    }));
    expect(state.job).toMatchObject({
      currentStep: "Scan cancelled",
      status: "failed",
    });
    expect(state.config?.lastScanAt).toBeUndefined();
  });

  test("cancel-and-restart loops are rate limited", async () => {
    const { admin, organizationId } = await setup();
    for (let i = 0; i < SCAN_BURST; i++) {
      await admin.mutation(api.intelligence.scan_control.startManualScan, {
        organizationId,
      });
      await admin.mutation(api.intelligence.scan_control.cancelScan, {
        organizationId,
      });
    }

    await expect(
      admin.mutation(api.intelligence.scan_control.startManualScan, {
        organizationId,
      })
    ).rejects.toThrow();
  });

  test("a running scan cannot be dismissed to unlock a new one", async () => {
    const { admin, organizationId, t } = await setup();
    await admin.mutation(api.intelligence.scan_control.startManualScan, {
      organizationId,
    });
    const job = await t.run((ctx) => ctx.db.query("intelligenceJobs").first());
    if (!job) {
      throw new Error("Expected a scan job");
    }

    await expect(
      admin.mutation(api.intelligence.scan_control.dismissScan, {
        jobId: job._id,
      })
    ).rejects.toThrow("Cancel the scan");
  });
});
