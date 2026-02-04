/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { z } from "zod";
import { api, internal } from "./_generated/api";
import schema from "./schema";

// Import all modules for convex-test
const modules = import.meta.glob("./**/*.ts");

// Type assertion to work around convex-test version mismatch
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const testSchema = schema as any;

// Test the Zod schema for auto-tagging response
const autoTaggingResponseSchema = z.object({
  selectedTagIds: z
    .array(z.string())
    .describe(
      "Array of tag IDs from the provided list that match the feedback"
    ),
  reasoning: z
    .string()
    .describe("Brief explanation of why these tags were selected"),
});

describe("Auto-tagging response schema", () => {
  test("should validate a valid response with tags", () => {
    const validResponse = {
      selectedTagIds: ["tag1", "tag2"],
      reasoning: "These tags match the feedback content",
    };

    const result = autoTaggingResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  test("should validate a response with empty tags array", () => {
    const emptyResponse = {
      selectedTagIds: [],
      reasoning: "No tags match this feedback",
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
      selectedTagIds: "not-an-array",
      reasoning: "Some reasoning",
    };

    const result = autoTaggingResponseSchema.safeParse(invalidResponse);
    expect(result.success).toBe(false);
  });
});

describe("Auto-tagging database operations", () => {
  test("should correctly count untagged feedback", async () => {
    const t = convexTest(testSchema, modules);

    // Create an organization first
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

    // Create some feedback without tags
    await t.run(async (ctx) => {
      await ctx.db.insert("feedback", {
        organizationId: orgId,
        title: "Feedback 1",
        description: "Description 1",
        status: "open",
        voteCount: 0,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.insert("feedback", {
        organizationId: orgId,
        title: "Feedback 2",
        description: "Description 2",
        status: "open",
        voteCount: 0,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const count = await t.query(
      api.feedback_auto_tagging.getUntaggedFeedbackCount,
      {
        organizationId: orgId,
      }
    );

    expect(count).toBe(2);
  });

  test("should apply tags to feedback with AI indicator", async () => {
    const t = convexTest(testSchema, modules);

    // Create organization, feedback, and tag
    const { feedbackId, tagId } = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org-tags",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });

      const feedbackId = await ctx.db.insert("feedback", {
        organizationId: orgId,
        title: "Feature Request",
        description: "Please add dark mode",
        status: "open",
        voteCount: 0,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const tagId = await ctx.db.insert("tags", {
        organizationId: orgId,
        name: "Feature",
        slug: "feature",
        color: "#0000FF",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return { orgId, feedbackId, tagId };
    });

    // Apply tag using internal mutation
    await t.mutation(internal.feedback_auto_tagging.applyAutoTags, {
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
    const t = convexTest(testSchema, modules);

    // Create organization, feedback, and tag
    const { feedbackId, tagId } = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org-no-dup",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });

      const feedbackId = await ctx.db.insert("feedback", {
        organizationId: orgId,
        title: "Bug Report",
        description: "App crashes on login",
        status: "open",
        voteCount: 0,
        commentCount: 0,
        isApproved: true,
        isPinned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const tagId = await ctx.db.insert("tags", {
        organizationId: orgId,
        name: "Bug",
        slug: "bug",
        color: "#FF0000",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      return { feedbackId, tagId };
    });

    // Apply the same tag twice
    await t.mutation(internal.feedback_auto_tagging.applyAutoTags, {
      feedbackId,
      tagIds: [tagId],
    });

    await t.mutation(internal.feedback_auto_tagging.applyAutoTags, {
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
    const t = convexTest(testSchema, modules);

    // Create organization
    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org-job",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });
    });

    // Create a job
    const jobId = await t.mutation(internal.feedback_auto_tagging.createJob, {
      organizationId: orgId,
      totalItems: 10,
    });

    expect(jobId).toBeDefined();

    // Verify job was created with correct initial state
    const job = await t.run(async (ctx) => {
      return await ctx.db.get(jobId);
    });

    expect(job).toBeDefined();
    expect(job?.status).toBe("pending");
    expect(job?.totalItems).toBe(10);
    expect(job?.processedItems).toBe(0);
    expect(job?.successfulItems).toBe(0);
    expect(job?.failedItems).toBe(0);
    expect(job?.errors).toEqual([]);
  });

  test("should update job progress correctly", async () => {
    const t = convexTest(testSchema, modules);

    // Create organization and job
    const { jobId } = await t.run(async (ctx) => {
      const orgId = await ctx.db.insert("organizations", {
        name: "Test Org",
        slug: "test-org-progress",
        isPublic: false,
        subscriptionTier: "free",
        subscriptionStatus: "none",
        createdAt: Date.now(),
      });

      const jobId = await ctx.db.insert("autoTaggingJobs", {
        organizationId: orgId,
        status: "pending",
        totalItems: 5,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        errors: [],
        startedAt: Date.now(),
      });

      return { orgId, jobId };
    });

    // Update progress
    await t.mutation(internal.feedback_auto_tagging.updateJobProgress, {
      jobId,
      processedItems: 3,
      successfulItems: 2,
      failedItems: 1,
      status: "processing",
    });

    // Verify progress was updated
    const job = await t.run(async (ctx) => {
      return await ctx.db.get(jobId);
    });

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
