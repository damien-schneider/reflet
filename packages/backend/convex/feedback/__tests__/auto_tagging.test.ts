/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

describe("Auto-tagging database operations", () => {
  test("should reject untagged count for anonymous callers", async () => {
    const t = convexTest(schema, modules);

    // Create an organization first
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

    // Create some feedback without tags
    await t.run(async (ctx) => {
      await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "Description 1",
        isApproved: true,
        isPinned: false,
        organizationId: orgId,
        status: "open",
        title: "Feedback 1",
        updatedAt: Date.now(),
        voteCount: 0,
      });

      await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "Description 2",
        isApproved: true,
        isPinned: false,
        organizationId: orgId,
        status: "open",
        title: "Feedback 2",
        updatedAt: Date.now(),
        voteCount: 0,
      });
    });

    await expect(
      t.query(api.feedback.auto_tagging.getTriageCounts, {
        organizationId: orgId,
      })
    ).rejects.toThrow("Not authenticated");
  });

  test("should apply tags to feedback with AI indicator", async () => {
    const t = convexTest(schema, modules);

    // Create organization, feedback, and tag
    const { feedbackId, tagId } = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Test Org",
        slug: "test-org-tags",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });

      const feedbackId = await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "Please add dark mode",
        isApproved: true,
        isPinned: false,
        organizationId: orgId,
        status: "open",
        title: "Feature Request",
        updatedAt: Date.now(),
        voteCount: 0,
      });

      const tagId = await ctx.db.insert("tags", {
        color: "#0000FF",
        createdAt: Date.now(),
        name: "Feature",
        organizationId: orgId,
        slug: "feature",
        updatedAt: Date.now(),
      });

      return { feedbackId, orgId, tagId };
    });

    // Apply tag using internal mutation
    await t.mutation(internal.feedback.auto_tagging_jobs.applyAutoTags, {
      feedbackId,
      tagIds: [tagId],
    });

    // Verify the tag was applied with AI indicator
    const feedbackTag = await t.run(async (ctx) => {
      const allTags = await ctx.db.query("feedbackTags").collect();
      return allTags.find((t) => t.feedbackId === feedbackId);
    });

    expect(feedbackTag).toBeDefined();
    expect(feedbackTag?.tagId).toBe(tagId);
    expect(feedbackTag?.appliedByAi).toBe(true);
  });

  test("should not duplicate tags when applying", async () => {
    const t = convexTest(schema, modules);

    // Create organization, feedback, and tag
    const { feedbackId, tagId } = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Test Org",
        slug: "test-org-no-dup",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });

      const feedbackId = await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "App crashes on login",
        isApproved: true,
        isPinned: false,
        organizationId: orgId,
        status: "open",
        title: "Bug Report",
        updatedAt: Date.now(),
        voteCount: 0,
      });

      const tagId = await ctx.db.insert("tags", {
        color: "#FF0000",
        createdAt: Date.now(),
        name: "Bug",
        organizationId: orgId,
        slug: "bug",
        updatedAt: Date.now(),
      });

      return { feedbackId, tagId };
    });

    // Apply the same tag twice
    await t.mutation(internal.feedback.auto_tagging_jobs.applyAutoTags, {
      feedbackId,
      tagIds: [tagId],
    });

    await t.mutation(internal.feedback.auto_tagging_jobs.applyAutoTags, {
      feedbackId,
      tagIds: [tagId],
    });

    // Verify only one tag entry exists
    const feedbackTags = await t.run(async (ctx) => {
      const allTags = await ctx.db.query("feedbackTags").collect();
      return allTags.filter((t) => t.feedbackId === feedbackId);
    });

    expect(feedbackTags.length).toBe(1);
  });

  test("should create and track auto-tagging job", async () => {
    const t = convexTest(schema, modules);

    // Create organization
    const orgId = await t.run(
      async (ctx) =>
        await ctx.db.insert("organizations", {
          createdAt: Date.now(),
          isPublic: false,
          name: "Test Org",
          slug: "test-org-job",
          subscriptionStatus: "none",
          subscriptionTier: "free",
        })
    );

    // Create a job
    const jobId = await t.mutation(
      internal.feedback.auto_tagging_jobs.createJob,
      {
        organizationId: orgId,
        totalItems: 10,
      }
    );

    expect(jobId).toBeDefined();

    // Verify job was created with correct initial state
    const job = await t.run(async (ctx) => await ctx.db.get(jobId));

    expect(job).toBeDefined();
    expect(job?.status).toBe("pending");
    expect(job?.totalItems).toBe(10);
    expect(job?.processedItems).toBe(0);
    expect(job?.successfulItems).toBe(0);
    expect(job?.failedItems).toBe(0);
    expect(job?.errors).toEqual([]);
  });

  test("should update job progress correctly", async () => {
    const t = convexTest(schema, modules);

    // Create organization and job
    const { jobId } = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Test Org",
        slug: "test-org-progress",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });

      const jobId = await ctx.db.insert("autoTaggingJobs", {
        errors: [],
        failedItems: 0,
        organizationId: orgId,
        processedItems: 0,
        startedAt: Date.now(),
        status: "pending",
        successfulItems: 0,
        totalItems: 5,
      });

      return { jobId, orgId };
    });

    // Update progress
    await t.mutation(internal.feedback.auto_tagging_jobs.updateJobProgress, {
      failedItems: 1,
      jobId,
      processedItems: 3,
      status: "processing",
      successfulItems: 2,
    });

    // Verify progress was updated
    const job = await t.run(async (ctx) => await ctx.db.get(jobId));

    expect(job?.status).toBe("processing");
    expect(job?.processedItems).toBe(3);
    expect(job?.successfulItems).toBe(2);
    expect(job?.failedItems).toBe(1);
  });
});

describe("Triage scope selection", () => {
  test("untriaged skips analysed and hand-tagged items, all keeps them", async () => {
    const t = convexTest(schema, modules);

    const { orgId, freshId } = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Test Org",
        slug: "test-org-scope",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      });

      const insertFeedback = async (
        title: string,
        extra: Record<string, unknown> = {}
      ) =>
        await ctx.db.insert("feedback", {
          commentCount: 0,
          createdAt: Date.now(),
          description: "Something happened",
          isApproved: true,
          isPinned: false,
          organizationId: orgId,
          status: "open",
          title,
          updatedAt: Date.now(),
          voteCount: 0,
          ...extra,
        });

      const freshId = await insertFeedback("Fresh");
      await insertFeedback("Analysed", { aiPriorityGeneratedAt: Date.now() });
      await insertFeedback("Deleted", { deletedAt: Date.now() });

      const handTaggedId = await insertFeedback("Hand tagged");
      const tagId = await ctx.db.insert("tags", {
        color: "#FF0000",
        createdAt: Date.now(),
        name: "Bug",
        organizationId: orgId,
        slug: "bug",
        updatedAt: Date.now(),
      });
      await ctx.db.insert("feedbackTags", {
        appliedByAi: false,
        feedbackId: handTaggedId,
        tagId,
      });

      return { freshId, orgId };
    });

    const untriaged = await t.query(
      internal.feedback.auto_tagging.getFeedbackIdsForTriage,
      { organizationId: orgId, scope: "untriaged" }
    );
    const all = await t.query(
      internal.feedback.auto_tagging.getFeedbackIdsForTriage,
      { organizationId: orgId, scope: "all" }
    );

    expect(untriaged).toEqual([freshId]);
    expect(all).toHaveLength(3);
    expect(all).toContain(freshId);
  });
});

describe("Recompute reconciliation", () => {
  test("drops AI tags the model no longer predicts but keeps manual ones", async () => {
    const t = convexTest(schema, modules);

    const { aiTagId, feedbackId, manualTagId, staleTagId } = await t.run(
      async (ctx) => {
        const orgId = await ctx.db.insert("organizations", {
          createdAt: Date.now(),
          isPublic: false,
          name: "Test Org",
          slug: "test-org-recompute",
          subscriptionStatus: "none",
          subscriptionTier: "free",
        });

        const feedbackId = await ctx.db.insert("feedback", {
          commentCount: 0,
          createdAt: Date.now(),
          description: "Invoices are missing the VAT line",
          isApproved: true,
          isPinned: false,
          organizationId: orgId,
          status: "open",
          title: "Invoices unusable",
          updatedAt: Date.now(),
          voteCount: 0,
        });

        const insertTag = async (name: string) =>
          await ctx.db.insert("tags", {
            color: "#FF0000",
            createdAt: Date.now(),
            name,
            organizationId: orgId,
            slug: name.toLowerCase(),
            updatedAt: Date.now(),
          });

        const staleTagId = await insertTag("Mobile");
        const manualTagId = await insertTag("Enterprise");
        const aiTagId = await insertTag("Billing");

        await ctx.db.insert("feedbackTags", {
          appliedByAi: true,
          feedbackId,
          tagId: staleTagId,
        });
        await ctx.db.insert("feedbackTags", {
          appliedByAi: false,
          feedbackId,
          tagId: manualTagId,
        });

        return { aiTagId, feedbackId, manualTagId, staleTagId };
      }
    );

    await t.mutation(internal.feedback.auto_tagging_jobs.applyAutoTags, {
      feedbackId,
      tagIds: [aiTagId],
    });

    const tagIds = await t.run(async (ctx) => {
      const links = await ctx.db.query("feedbackTags").collect();
      return links
        .filter((link) => link.feedbackId === feedbackId)
        .map((link) => link.tagId);
    });

    expect(tagIds).toContain(aiTagId);
    expect(tagIds).toContain(manualTagId);
    expect(tagIds).not.toContain(staleTagId);
  });
});
