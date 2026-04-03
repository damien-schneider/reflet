/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../../../schema";
import { modules } from "../../../test.helpers";

describe("Intelligence config", () => {
  test("should create default intelligence config", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
    });

    // Insert config directly to test default values
    const configId = await t.run(async (ctx) => {
      return await ctx.db.insert("intelligenceConfig", {
        organizationId: orgId,
        scanFrequency: "weekly",
        redditEnabled: false,
        webSearchEnabled: false,
        competitorTrackingEnabled: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const config = await t.run(async (ctx) => {
      return await ctx.db.get(configId);
    });

    expect(config).not.toBeNull();
    expect(config?.scanFrequency).toBe("weekly");
    expect(config?.redditEnabled).toBe(false);
    expect(config?.webSearchEnabled).toBe(false);
    expect(config?.competitorTrackingEnabled).toBe(false);
  });

  test("should update intelligence config fields", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
    });

    const configId = await t.run(async (ctx) => {
      return await ctx.db.insert("intelligenceConfig", {
        organizationId: orgId,
        scanFrequency: "weekly",
        redditEnabled: false,
        webSearchEnabled: false,
        competitorTrackingEnabled: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.patch(configId, {
        scanFrequency: "daily",
        competitorTrackingEnabled: true,
        updatedAt: Date.now(),
      });
    });

    const updated = await t.run(async (ctx) => {
      return await ctx.db.get(configId);
    });

    expect(updated?.scanFrequency).toBe("daily");
    expect(updated?.competitorTrackingEnabled).toBe(true);
  });
});

describe("Competitors", () => {
  test("should create and retrieve a competitor", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
    });

    const competitorId = await t.run(async (ctx) => {
      return await ctx.db.insert("competitors", {
        organizationId: orgId,
        name: "Canny",
        websiteUrl: "https://canny.io",
        description: "User feedback tool",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const competitor = await t.run(async (ctx) => {
      return await ctx.db.get(competitorId);
    });

    expect(competitor).not.toBeNull();
    expect(competitor?.name).toBe("Canny");
    expect(competitor?.websiteUrl).toBe("https://canny.io");
    expect(competitor?.status).toBe("active");
  });

  test("should store AI profile and feature list", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
    });

    const competitorId = await t.run(async (ctx) => {
      return await ctx.db.insert("competitors", {
        organizationId: orgId,
        name: "Productboard",
        websiteUrl: "https://productboard.com",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.patch(competitorId, {
        aiProfile: JSON.stringify({
          summary: "Product management platform",
          strengths: ["Feature prioritization", "Customer feedback"],
          weaknesses: ["Expensive", "Complex setup"],
          opportunities: ["AI features"],
          threats: ["Simpler alternatives"],
        }),
        aiProfileUpdatedAt: Date.now(),
        featureList: ["Feedback portal", "Roadmap", "AI prioritization"],
      });
    });

    const updated = await t.run(async (ctx) => {
      return await ctx.db.get(competitorId);
    });

    expect(updated?.featureList).toHaveLength(3);
    expect(updated?.aiProfile).toContain("Product management platform");
  });
});

describe("Intelligence keywords", () => {
  test("should create and list keywords", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.insert("intelligenceKeywords", {
        organizationId: orgId,
        keyword: "user feedback tool",
        source: "both",
        createdAt: Date.now(),
      });
      await ctx.db.insert("intelligenceKeywords", {
        organizationId: orgId,
        keyword: "product management",
        source: "reddit",
        subreddit: "r/ProductManagement",
        createdAt: Date.now(),
      });
    });

    const keywords = await t.run(async (ctx) => {
      return await ctx.db
        .query("intelligenceKeywords")
        .filter((q) => q.eq(q.field("organizationId"), orgId))
        .collect();
    });

    expect(keywords).toHaveLength(2);
    expect(keywords.some((k) => k.keyword === "user feedback tool")).toBe(true);
    expect(keywords.some((k) => k.subreddit === "r/ProductManagement")).toBe(
      true
    );
  });
});

describe("Intelligence signals and insights", () => {
  test("should create signals and link to insights", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
    });

    const jobId = await t.run(async (ctx) => {
      return await ctx.db.insert("intelligenceJobs", {
        organizationId: orgId,
        type: "reddit_scan",
        status: "completed",
        startedAt: Date.now() - 60_000,
        completedAt: Date.now(),
        stats: { itemsFound: 5, itemsProcessed: 5, errors: 0 },
      });
    });

    const signalId = await t.run(async (ctx) => {
      return await ctx.db.insert("intelligenceSignals", {
        organizationId: orgId,
        jobId,
        source: "reddit",
        title: "Users want better feedback widgets",
        content: "Lots of discussion about embeddable feedback widgets...",
        url: "https://reddit.com/r/SaaS/post123",
        signalType: "feature_request",
        relevanceScore: 0.8,
        sentiment: "neutral",
        createdAt: Date.now(),
      });
    });

    const insightId = await t.run(async (ctx) => {
      return await ctx.db.insert("intelligenceInsights", {
        organizationId: orgId,
        signalIds: [signalId],
        type: "feature_suggestion",
        title: "Build embeddable feedback widget",
        summary:
          "Multiple Reddit discussions suggest demand for lightweight embeddable feedback widgets.",
        reasoning: "8 threads with 200+ upvotes discussing this topic",
        priority: "high",
        suggestedFeedbackTitle: "Embeddable feedback widget",
        suggestedFeedbackDescription:
          "Users want a lightweight widget they can embed on any page.",
        status: "new",
        createdAt: Date.now(),
      });
    });

    const insight = await t.run(async (ctx) => {
      return await ctx.db.get(insightId);
    });

    expect(insight).not.toBeNull();
    expect(insight?.type).toBe("feature_suggestion");
    expect(insight?.priority).toBe("high");
    expect(insight?.signalIds).toHaveLength(1);
    expect(insight?.suggestedFeedbackTitle).toBe("Embeddable feedback widget");
    expect(insight?.status).toBe("new");
  });

  test("should update insight status to dismissed", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
    });

    const jobId = await t.run(async (ctx) => {
      return await ctx.db.insert("intelligenceJobs", {
        organizationId: orgId,
        type: "synthesis",
        status: "completed",
        startedAt: Date.now(),
      });
    });

    const signalId = await t.run(async (ctx) => {
      return await ctx.db.insert("intelligenceSignals", {
        organizationId: orgId,
        jobId,
        source: "web",
        title: "Some signal",
        content: "Content",
        signalType: "market_trend",
        relevanceScore: 0.5,
        sentiment: "neutral",
        createdAt: Date.now(),
      });
    });

    const insightId = await t.run(async (ctx) => {
      return await ctx.db.insert("intelligenceInsights", {
        organizationId: orgId,
        signalIds: [signalId],
        type: "market_opportunity",
        title: "Some insight",
        summary: "Summary",
        priority: "low",
        status: "new",
        createdAt: Date.now(),
      });
    });

    await t.run(async (ctx) => {
      await ctx.db.patch(insightId, { status: "dismissed" });
    });

    const dismissed = await t.run(async (ctx) => {
      return await ctx.db.get(insightId);
    });

    expect(dismissed?.status).toBe("dismissed");
  });
});

describe("Battlecards and feature comparison", () => {
  test("should store battlecard for a competitor", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
    });

    const competitorId = await t.run(async (ctx) => {
      return await ctx.db.insert("competitors", {
        organizationId: orgId,
        name: "Canny",
        websiteUrl: "https://canny.io",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const battlecardId = await t.run(async (ctx) => {
      return await ctx.db.insert("battlecards", {
        organizationId: orgId,
        competitorId,
        content: JSON.stringify({
          overview: "Canny is a feedback management tool",
          strengths: ["Easy setup", "Good UI"],
          weaknesses: ["Limited analytics"],
          talkTracks: [],
          objectionHandling: [],
        }),
        aiGeneratedAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });
    });

    const battlecard = await t.run(async (ctx) => {
      return await ctx.db.get(battlecardId);
    });

    expect(battlecard).not.toBeNull();
    expect(battlecard?.content).toContain("Canny");
  });

  test("should store feature comparison matrix", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
    });

    const competitorId = await t.run(async (ctx) => {
      return await ctx.db.insert("competitors", {
        organizationId: orgId,
        name: "Canny",
        websiteUrl: "https://canny.io",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const comparisonId = await t.run(async (ctx) => {
      return await ctx.db.insert("featureComparisons", {
        organizationId: orgId,
        features: [
          {
            featureName: "Feedback widget",
            userProductHasIt: true,
            competitors: [
              { competitorId, hasIt: true, details: "Basic widget" },
            ],
          },
          {
            featureName: "AI triage",
            userProductHasIt: true,
            competitors: [{ competitorId, hasIt: false }],
          },
        ],
        aiGeneratedAt: Date.now(),
        lastUpdatedAt: Date.now(),
      });
    });

    const comparison = await t.run(async (ctx) => {
      return await ctx.db.get(comparisonId);
    });

    expect(comparison?.features).toHaveLength(2);
    expect(comparison?.features[0]?.featureName).toBe("Feedback widget");
    expect(comparison?.features[1]?.competitors[0]?.hasIt).toBe(false);
  });
});

describe("LLM visibility checks", () => {
  test("should store LLM visibility check result", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
    });

    const checkId = await t.run(async (ctx) => {
      return await ctx.db.insert("llmVisibilityChecks", {
        organizationId: orgId,
        prompt: "What are the best feedback tools?",
        model: "qwen/qwen3.6-plus:free",
        mentionsProduct: true,
        mentionedCompetitors: ["Canny", "Productboard"],
        sentiment: "positive",
        context: "The model recommended our product as a top option",
        recommendationStrength: 7,
        checkedAt: Date.now(),
      });
    });

    const check = await t.run(async (ctx) => {
      return await ctx.db.get(checkId);
    });

    expect(check).not.toBeNull();
    expect(check?.mentionsProduct).toBe(true);
    expect(check?.recommendationStrength).toBe(7);
    expect(check?.mentionedCompetitors).toContain("Canny");
  });
});
