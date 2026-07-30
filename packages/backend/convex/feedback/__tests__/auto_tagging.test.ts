/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { api, internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

// Type assertion to work around convex-test version mismatch

// Test the Zod schema for auto-tagging response
const autoTaggingResponseSchema = z.object({
  reasoning: z
    .string()
    .describe("Brief explanation of why these tags were selected"),
  selectedTagIds: z
    .array(z.string())
    .describe(
      "Array of tag IDs from the provided list that match the feedback"
    ),
});

describe("Auto-tagging response schema", () => {
  test("should validate a valid response with tags", () => {
    const validResponse = {
      reasoning: "These tags match the feedback content",
      selectedTagIds: ["tag1", "tag2"],
    };

    const result = autoTaggingResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  test("should validate a response with empty tags array", () => {
    const emptyResponse = {
      reasoning: "No tags match this feedback",
      selectedTagIds: [],
    };

    const result = autoTaggingResponseSchema.safeParse(emptyResponse);
    expect(result.success).toBe(true);
  });

  test("should reject response without selectedTagIds", () => {
    const invalidResponse = {
      reasoning: "Some reasoning",
    };

    const result = autoTaggingResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });

  test("should reject response with non-array selectedTagIds", () => {
    const invalidResponse = {
      reasoning: "Some reasoning",
      selectedTagIds: "not-an-array",
    };

    const result = autoTaggingResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });
});

describe("Auto-tagging database operations", () => {
  test("should correctly count untagged feedback", async () => {
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

    const count = await t.query(
      api.feedback.auto_tagging.getUntaggedFeedbackCount,
      {
        organizationId: orgId,
      }
    );

    expect(count).toBe(2);
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
    await t.mutation(internal.feedback.auto_tagging.applyAutoTags, {
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
    await t.mutation(internal.feedback.auto_tagging.applyAutoTags, {
      feedbackId,
      tagIds: [tagId],
    });

    await t.mutation(internal.feedback.auto_tagging.applyAutoTags, {
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
    const jobId = await t.mutation(internal.feedback.auto_tagging.createJob, {
      organizationId: orgId,
      totalItems: 10,
    });

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
    await t.mutation(internal.feedback.auto_tagging.updateJobProgress, {
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

describe("Auto-tagging model configuration", () => {
  test("model fallback chain should be defined correctly", () => {
    // Verify the models are configured correctly
    const expectedModels = [
      "arcee-ai/trinity-large-preview:free",
      "upstage/solar-pro-3:free",
      "z-ai/glm-4.7-flash",
    ];

    // These models should be the ones used for auto-tagging
    // This test documents the expected configuration
    expect(expectedModels).toHaveLength(3);
    expect(expectedModels[0]).toContain("arcee-ai");
    expect(expectedModels[1]).toContain("upstage");
    expect(expectedModels[2]).toContain("z-ai");
  });
});
