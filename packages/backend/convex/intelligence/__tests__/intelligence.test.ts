/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import schema from "../../schema";
import { modules } from "../../test.helpers";

describe("Intelligence config", () => {
  test("should create default intelligence config", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(
      async (ctx) =>
        await ctx.db.insert("organizations", {
          createdAt: Date.now(),
          isPublic: false,
          name: "Test Org",
          slug: "test-org",
          subscriptionStatus: "none",
          subscriptionTier: "free",
        })
    );

    // Insert config directly to test default values
    const configId = await t.run(
      async (ctx) =>
        await ctx.db.insert("intelligenceConfig", {
          competitorTrackingEnabled: false,
          createdAt: Date.now(),
          organizationId: orgId,
          redditEnabled: false,
          scanFrequency: "weekly",
          updatedAt: Date.now(),
          webSearchEnabled: false,
        })
    );

    const config = await t.run(async (ctx) => await ctx.db.get(configId));

    expect(config).not.toBeNull();
    expect(config?.scanFrequency).toBe("weekly");
    expect(config?.redditEnabled).toBe(false);
    expect(config?.webSearchEnabled).toBe(false);
    expect(config?.competitorTrackingEnabled).toBe(false);
  });

  test("should update intelligence config fields", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(
      async (ctx) =>
        await ctx.db.insert("organizations", {
          createdAt: Date.now(),
          isPublic: false,
          name: "Test Org",
          slug: "test-org",
          subscriptionStatus: "none",
          subscriptionTier: "free",
        })
    );

    const configId = await t.run(
      async (ctx) =>
        await ctx.db.insert("intelligenceConfig", {
          competitorTrackingEnabled: false,
          createdAt: Date.now(),
          organizationId: orgId,
          redditEnabled: false,
          scanFrequency: "weekly",
          updatedAt: Date.now(),
          webSearchEnabled: false,
        })
    );

    await t.run(async (ctx) => {
      await ctx.db.patch(configId, {
        competitorTrackingEnabled: true,
        scanFrequency: "daily",
        updatedAt: Date.now(),
      });
    });

    const updated = await t.run(async (ctx) => await ctx.db.get(configId));

    expect(updated?.scanFrequency).toBe("daily");
    expect(updated?.competitorTrackingEnabled).toBe(true);
  });
});

describe("Competitors", () => {
  test("should create and retrieve a competitor", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(
      async (ctx) =>
        await ctx.db.insert("organizations", {
          createdAt: Date.now(),
          isPublic: false,
          name: "Test Org",
          slug: "test-org",
          subscriptionStatus: "none",
          subscriptionTier: "free",
        })
    );

    const competitorId = await t.run(
      async (ctx) =>
        await ctx.db.insert("competitors", {
          createdAt: Date.now(),
          description: "User feedback tool",
          name: "Canny",
          organizationId: orgId,
          status: "active",
          updatedAt: Date.now(),
          websiteUrl: "https://canny.io",
        })
    );

    const competitor = await t.run(
      async (ctx) => await ctx.db.get(competitorId)
    );

    expect(competitor).not.toBeNull();
    expect(competitor?.name).toBe("Canny");
    expect(competitor?.websiteUrl).toBe("https://canny.io");
    expect(competitor?.status).toBe("active");
  });

  test("should store AI profile and feature list", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(
      async (ctx) =>
        await ctx.db.insert("organizations", {
          createdAt: Date.now(),
          isPublic: false,
          name: "Test Org",
          slug: "test-org",
          subscriptionStatus: "none",
          subscriptionTier: "free",
        })
    );

    const competitorId = await t.run(
      async (ctx) =>
        await ctx.db.insert("competitors", {
          createdAt: Date.now(),
          name: "Productboard",
          organizationId: orgId,
          status: "active",
          updatedAt: Date.now(),
          websiteUrl: "https://productboard.com",
        })
    );

    await t.run(async (ctx) => {
      await ctx.db.patch(competitorId, {
        aiProfile: JSON.stringify({
          opportunities: ["AI features"],
          strengths: ["Feature prioritization", "Customer feedback"],
          summary: "Product management platform",
          threats: ["Simpler alternatives"],
          weaknesses: ["Expensive", "Complex setup"],
        }),
        aiProfileUpdatedAt: Date.now(),
        featureList: ["Feedback portal", "Roadmap", "AI prioritization"],
      });
    });

    const updated = await t.run(async (ctx) => await ctx.db.get(competitorId));

    expect(updated?.featureList).toHaveLength(3);
    expect(updated?.aiProfile).toContain("Product management platform");
  });
});

describe("Intelligence keywords", () => {
  test("should create and list keywords", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(
      async (ctx) =>
        await ctx.db.insert("organizations", {
          createdAt: Date.now(),
          isPublic: false,
          name: "Test Org",
          slug: "test-org",
          subscriptionStatus: "none",
          subscriptionTier: "free",
        })
    );

    await t.run(async (ctx) => {
      await ctx.db.insert("intelligenceKeywords", {
        createdAt: Date.now(),
        keyword: "user feedback tool",
        organizationId: orgId,
        source: "both",
      });
      await ctx.db.insert("intelligenceKeywords", {
        createdAt: Date.now(),
        keyword: "product management",
        organizationId: orgId,
        source: "reddit",
        subreddit: "r/ProductManagement",
      });
    });

    const keywords = await t.run(
      async (ctx) =>
        await ctx.db
          .query("intelligenceKeywords")
          .filter((q) => q.eq(q.field("organizationId"), orgId))
          .collect()
    );

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

    const orgId = await t.run(
      async (ctx) =>
        await ctx.db.insert("organizations", {
          createdAt: Date.now(),
          isPublic: false,
          name: "Test Org",
          slug: "test-org",
          subscriptionStatus: "none",
          subscriptionTier: "free",
        })
    );

    const jobId = await t.run(
      async (ctx) =>
        await ctx.db.insert("intelligenceJobs", {
          completedAt: Date.now(),
          organizationId: orgId,
          startedAt: Date.now() - 60_000,
          stats: { errors: 0, itemsFound: 5, itemsProcessed: 5 },
          status: "completed",
          type: "reddit_scan",
        })
    );

    const signalId = await t.run(
      async (ctx) =>
        await ctx.db.insert("intelligenceSignals", {
          content: "Lots of discussion about embeddable feedback widgets...",
          createdAt: Date.now(),
          jobId,
          organizationId: orgId,
          relevanceScore: 0.8,
          sentiment: "neutral",
          signalType: "feature_request",
          source: "reddit",
          title: "Users want better feedback widgets",
          url: "https://reddit.com/r/SaaS/post123",
        })
    );

    const insightId = await t.run(
      async (ctx) =>
        await ctx.db.insert("intelligenceInsights", {
          createdAt: Date.now(),
          organizationId: orgId,
          priority: "high",
          reasoning: "8 threads with 200+ upvotes discussing this topic",
          signalIds: [signalId],
          status: "new",
          suggestedFeedbackDescription:
            "Users want a lightweight widget they can embed on any page.",
          suggestedFeedbackTitle: "Embeddable feedback widget",
          summary:
            "Multiple Reddit discussions suggest demand for lightweight embeddable feedback widgets.",
          title: "Build embeddable feedback widget",
          type: "feature_suggestion",
        })
    );

    const insight = await t.run(async (ctx) => await ctx.db.get(insightId));

    expect(insight).not.toBeNull();
    expect(insight?.type).toBe("feature_suggestion");
    expect(insight?.priority).toBe("high");
    expect(insight?.signalIds).toHaveLength(1);
    expect(insight?.suggestedFeedbackTitle).toBe("Embeddable feedback widget");
    expect(insight?.status).toBe("new");
  });

  test("should update insight status to dismissed", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(
      async (ctx) =>
        await ctx.db.insert("organizations", {
          createdAt: Date.now(),
          isPublic: false,
          name: "Test Org",
          slug: "test-org",
          subscriptionStatus: "none",
          subscriptionTier: "free",
        })
    );

    const jobId = await t.run(
      async (ctx) =>
        await ctx.db.insert("intelligenceJobs", {
          organizationId: orgId,
          startedAt: Date.now(),
          status: "completed",
          type: "synthesis",
        })
    );

    const signalId = await t.run(
      async (ctx) =>
        await ctx.db.insert("intelligenceSignals", {
          content: "Content",
          createdAt: Date.now(),
          jobId,
          organizationId: orgId,
          relevanceScore: 0.5,
          sentiment: "neutral",
          signalType: "market_trend",
          source: "web",
          title: "Some signal",
        })
    );

    const insightId = await t.run(
      async (ctx) =>
        await ctx.db.insert("intelligenceInsights", {
          createdAt: Date.now(),
          organizationId: orgId,
          priority: "low",
          signalIds: [signalId],
          status: "new",
          summary: "Summary",
          title: "Some insight",
          type: "market_opportunity",
        })
    );

    await t.run(async (ctx) => {
      await ctx.db.patch(insightId, { status: "dismissed" });
    });

    const dismissed = await t.run(async (ctx) => await ctx.db.get(insightId));

    expect(dismissed?.status).toBe("dismissed");
  });
});

describe("Battlecards and feature comparison", () => {
  test("should store battlecard for a competitor", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(
      async (ctx) =>
        await ctx.db.insert("organizations", {
          createdAt: Date.now(),
          isPublic: false,
          name: "Test Org",
          slug: "test-org",
          subscriptionStatus: "none",
          subscriptionTier: "free",
        })
    );

    const competitorId = await t.run(
      async (ctx) =>
        await ctx.db.insert("competitors", {
          createdAt: Date.now(),
          name: "Canny",
          organizationId: orgId,
          status: "active",
          updatedAt: Date.now(),
          websiteUrl: "https://canny.io",
        })
    );

    const battlecardId = await t.run(
      async (ctx) =>
        await ctx.db.insert("battlecards", {
          aiGeneratedAt: Date.now(),
          competitorId,
          content: JSON.stringify({
            objectionHandling: [],
            overview: "Canny is a feedback management tool",
            strengths: ["Easy setup", "Good UI"],
            talkTracks: [],
            weaknesses: ["Limited analytics"],
          }),
          lastUpdatedAt: Date.now(),
          organizationId: orgId,
        })
    );

    const battlecard = await t.run(
      async (ctx) => await ctx.db.get(battlecardId)
    );

    expect(battlecard).not.toBeNull();
    expect(battlecard?.content).toContain("Canny");
  });

  test("should store feature comparison matrix", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(
      async (ctx) =>
        await ctx.db.insert("organizations", {
          createdAt: Date.now(),
          isPublic: false,
          name: "Test Org",
          slug: "test-org",
          subscriptionStatus: "none",
          subscriptionTier: "free",
        })
    );

    const competitorId = await t.run(
      async (ctx) =>
        await ctx.db.insert("competitors", {
          createdAt: Date.now(),
          name: "Canny",
          organizationId: orgId,
          status: "active",
          updatedAt: Date.now(),
          websiteUrl: "https://canny.io",
        })
    );

    const comparisonId = await t.run(
      async (ctx) =>
        await ctx.db.insert("featureComparisons", {
          aiGeneratedAt: Date.now(),
          features: [
            {
              competitors: [
                { competitorId, details: "Basic widget", hasIt: true },
              ],
              featureName: "Feedback widget",
              userProductHasIt: true,
            },
            {
              competitors: [{ competitorId, hasIt: false }],
              featureName: "AI triage",
              userProductHasIt: true,
            },
          ],
          lastUpdatedAt: Date.now(),
          organizationId: orgId,
        })
    );

    const comparison = await t.run(
      async (ctx) => await ctx.db.get(comparisonId)
    );

    expect(comparison?.features).toHaveLength(2);
    expect(comparison?.features[0]?.featureName).toBe("Feedback widget");
    expect(comparison?.features[1]?.competitors[0]?.hasIt).toBe(false);
  });
});

describe("LLM visibility checks", () => {
  test("should store LLM visibility check result", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(
      async (ctx) =>
        await ctx.db.insert("organizations", {
          createdAt: Date.now(),
          isPublic: false,
          name: "Test Org",
          slug: "test-org",
          subscriptionStatus: "none",
          subscriptionTier: "free",
        })
    );

    const checkId = await t.run(
      async (ctx) =>
        await ctx.db.insert("llmVisibilityChecks", {
          checkedAt: Date.now(),
          context: "The model recommended our product as a top option",
          mentionedCompetitors: ["Canny", "Productboard"],
          mentionsProduct: true,
          model: "anthropic/claude-sonnet-4",
          organizationId: orgId,
          prompt: "What are the best feedback tools?",
          recommendationStrength: 7,
          sentiment: "positive",
        })
    );

    const check = await t.run(async (ctx) => await ctx.db.get(checkId));

    expect(check).not.toBeNull();
    expect(check?.mentionsProduct).toBe(true);
    expect(check?.recommendationStrength).toBe(7);
    expect(check?.mentionedCompetitors).toContain("Canny");
  });
});
