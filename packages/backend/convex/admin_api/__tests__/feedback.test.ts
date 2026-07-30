/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

import { createFeedback, createOrg } from "./test_helpers";

const testSchema = schema as any;

describe("admin_api_feedback - updateFeedback", () => {
  test("should update title and description", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const feedbackId = await createFeedback(t, orgId);

    await t.mutation(internal.admin_api.feedback.updateFeedback, {
      description: "Updated desc",
      feedbackId,
      organizationId: orgId,
      title: "Updated Title",
    });

    const fb = await t.run(async (ctx) => ctx.db.get(feedbackId));
    expect(fb?.title).toBe("Updated Title");
    expect(fb?.description).toBe("Updated desc");
  });

  test("should reject wrong org", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const otherOrgId = await t.run(async (ctx) =>
      ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Other",
        slug: "other",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      })
    );
    const feedbackId = await createFeedback(t, orgId);

    await expect(
      t.mutation(internal.admin_api.feedback.updateFeedback, {
        feedbackId,
        organizationId: otherOrgId,
        title: "Hacked",
      })
    ).rejects.toThrow("Feedback not found");
  });
});

describe("admin_api_feedback - deleteFeedback / restoreFeedback", () => {
  test("should soft-delete with deletedAt timestamp", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const feedbackId = await createFeedback(t, orgId);

    await t.mutation(internal.admin_api.feedback.deleteFeedback, {
      feedbackId,
      organizationId: orgId,
    });

    const fb = await t.run(async (ctx) => ctx.db.get(feedbackId));
    expect(fb?.deletedAt).toBeDefined();
  });

  test("restore should clear deletedAt", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const feedbackId = await createFeedback(t, orgId);

    await t.mutation(internal.admin_api.feedback.deleteFeedback, {
      feedbackId,
      organizationId: orgId,
    });

    await t.mutation(internal.admin_api.feedback.restoreFeedback, {
      feedbackId,
      organizationId: orgId,
    });

    const fb = await t.run(async (ctx) => ctx.db.get(feedbackId));
    expect(fb?.deletedAt).toBeUndefined();
  });

  test("restore should fail if not deleted", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const feedbackId = await createFeedback(t, orgId);

    await expect(
      t.mutation(internal.admin_api.feedback.restoreFeedback, {
        feedbackId,
        organizationId: orgId,
      })
    ).rejects.toThrow("Feedback is not deleted");
  });
});

describe("admin_api_feedback - assignFeedback", () => {
  test("should assign a member", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const feedbackId = await createFeedback(t, orgId);

    await t.run(async (ctx) =>
      ctx.db.insert("organizationMembers", {
        createdAt: Date.now(),
        organizationId: orgId,
        role: "admin",
        userId: "user-123",
      })
    );

    await t.mutation(internal.admin_api.feedback.assignFeedback, {
      assigneeId: "user-123",
      feedbackId,
      organizationId: orgId,
    });

    const fb = await t.run(async (ctx) => ctx.db.get(feedbackId));
    expect(fb?.assigneeId).toBe("user-123");
  });

  test("should unassign when assigneeId is undefined", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const feedbackId = await createFeedback(t, orgId);

    await t.mutation(internal.admin_api.feedback.assignFeedback, {
      feedbackId,
      organizationId: orgId,
    });

    const fb = await t.run(async (ctx) => ctx.db.get(feedbackId));
    expect(fb?.assigneeId).toBeUndefined();
  });

  test("should reject non-member assignee", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const feedbackId = await createFeedback(t, orgId);

    await expect(
      t.mutation(internal.admin_api.feedback.assignFeedback, {
        assigneeId: "non-member",
        feedbackId,
        organizationId: orgId,
      })
    ).rejects.toThrow("Assignee is not a member of this organization");
  });
});

describe("admin_api_feedback - setFeedbackStatus", () => {
  test("should set built-in status", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const feedbackId = await createFeedback(t, orgId);

    await t.mutation(internal.admin_api.feedback.setFeedbackStatus, {
      feedbackId,
      organizationId: orgId,
      status: "in_progress",
    });

    const fb = await t.run(async (ctx) => ctx.db.get(feedbackId));
    expect(fb?.status).toBe("in_progress");
  });

  test("should set completedAt when status is completed", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const feedbackId = await createFeedback(t, orgId);

    await t.mutation(internal.admin_api.feedback.setFeedbackStatus, {
      feedbackId,
      organizationId: orgId,
      status: "completed",
    });

    const fb = await t.run(async (ctx) => ctx.db.get(feedbackId));
    expect(fb?.status).toBe("completed");
    expect(fb?.completedAt).toBeDefined();
  });

  test("should set organization status by ID", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const feedbackId = await createFeedback(t, orgId);

    const statusId = await t.run(async (ctx) =>
      ctx.db.insert("organizationStatuses", {
        color: "#FFAA00",
        createdAt: Date.now(),
        name: "In Review",
        order: 0,
        organizationId: orgId,
        updatedAt: Date.now(),
      })
    );

    await t.mutation(internal.admin_api.feedback.setFeedbackStatus, {
      feedbackId,
      organizationId: orgId,
      statusId,
    });

    const fb = await t.run(async (ctx) => ctx.db.get(feedbackId));
    expect(fb?.organizationStatusId).toBe(statusId);
  });

  test("should reject status from wrong org", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const otherOrgId = await t.run(async (ctx) =>
      ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Other",
        slug: "other",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      })
    );
    const feedbackId = await createFeedback(t, orgId);

    const foreignStatusId = await t.run(async (ctx) =>
      ctx.db.insert("organizationStatuses", {
        color: "#F00",
        createdAt: Date.now(),
        name: "Foreign",
        order: 0,
        organizationId: otherOrgId,
        updatedAt: Date.now(),
      })
    );

    await expect(
      t.mutation(internal.admin_api.feedback.setFeedbackStatus, {
        feedbackId,
        organizationId: orgId,
        statusId: foreignStatusId,
      })
    ).rejects.toThrow("Status not found in this organization");
  });
});

describe("admin_api_feedback - updateFeedbackTags", () => {
  test("should add and remove tags", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const feedbackId = await createFeedback(t, orgId);

    const tag1Id = await t.run(async (ctx) =>
      ctx.db.insert("tags", {
        color: "#F00",
        createdAt: Date.now(),
        name: "Bug",
        organizationId: orgId,
        slug: "bug",
        updatedAt: Date.now(),
      })
    );
    const tag2Id = await t.run(async (ctx) =>
      ctx.db.insert("tags", {
        color: "#0F0",
        createdAt: Date.now(),
        name: "Feature",
        organizationId: orgId,
        slug: "feature",
        updatedAt: Date.now(),
      })
    );

    // Add both tags
    await t.mutation(internal.admin_api.feedback.updateFeedbackTags, {
      addTagIds: [tag1Id, tag2Id],
      feedbackId,
      organizationId: orgId,
    });

    let tags = await t.run(async (ctx) =>
      ctx.db
        .query("feedbackTags")
        .withIndex("by_feedback" as never, (q: any) =>
          q.eq("feedbackId", feedbackId)
        )
        .collect()
    );
    expect(tags).toHaveLength(2);

    // Remove one tag
    await t.mutation(internal.admin_api.feedback.updateFeedbackTags, {
      feedbackId,
      organizationId: orgId,
      removeTagIds: [tag1Id],
    });

    tags = await t.run(async (ctx) =>
      ctx.db
        .query("feedbackTags")
        .withIndex("by_feedback" as never, (q: any) =>
          q.eq("feedbackId", feedbackId)
        )
        .collect()
    );
    expect(tags).toHaveLength(1);
    expect(tags[0].tagId).toBe(tag2Id);
  });

  test("should not duplicate tags on re-add", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const feedbackId = await createFeedback(t, orgId);

    const tagId = await t.run(async (ctx) =>
      ctx.db.insert("tags", {
        color: "#000",
        createdAt: Date.now(),
        name: "Tag",
        organizationId: orgId,
        slug: "tag",
        updatedAt: Date.now(),
      })
    );

    await t.mutation(internal.admin_api.feedback.updateFeedbackTags, {
      addTagIds: [tagId],
      feedbackId,
      organizationId: orgId,
    });

    await t.mutation(internal.admin_api.feedback.updateFeedbackTags, {
      addTagIds: [tagId],
      feedbackId,
      organizationId: orgId,
    });

    const tags = await t.run(async (ctx) =>
      ctx.db.query("feedbackTags").collect()
    );
    expect(tags).toHaveLength(1);
  });

  test("should reject tag from wrong org", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const otherOrgId = await t.run(async (ctx) =>
      ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Other",
        slug: "other",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      })
    );
    const feedbackId = await createFeedback(t, orgId);

    const foreignTagId = await t.run(async (ctx) =>
      ctx.db.insert("tags", {
        color: "#000",
        createdAt: Date.now(),
        name: "Foreign",
        organizationId: otherOrgId,
        slug: "foreign",
        updatedAt: Date.now(),
      })
    );

    await expect(
      t.mutation(internal.admin_api.feedback.updateFeedbackTags, {
        addTagIds: [foreignTagId],
        feedbackId,
        organizationId: orgId,
      })
    ).rejects.toThrow("not found");
  });
});

describe("admin_api_feedback - updateFeedbackAnalysis", () => {
  test("should update priority, complexity, and timeEstimate", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const feedbackId = await createFeedback(t, orgId);

    await t.mutation(internal.admin_api.feedback.updateFeedbackAnalysis, {
      complexity: "moderate",
      feedbackId,
      organizationId: orgId,
      priority: "high",
      timeEstimate: "2-4 hours",
    });

    const fb = await t.run(async (ctx) => ctx.db.get(feedbackId));
    expect(fb?.priority).toBe("high");
    expect(fb?.complexity).toBe("moderate");
    expect(fb?.timeEstimate).toBe("2-4 hours");
  });
});

describe("admin_api_feedback - comment mutations", () => {
  test("updateComment should update body", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const feedbackId = await createFeedback(t, orgId);

    const commentId = await t.run(async (ctx) =>
      ctx.db.insert("comments", {
        body: "Original",
        createdAt: Date.now(),
        feedbackId,
        isOfficial: false,
        updatedAt: Date.now(),
      })
    );

    await t.mutation(internal.admin_api.feedback.updateComment, {
      body: "Updated comment",
      commentId,
      organizationId: orgId,
    });

    const comment = await t.run(async (ctx) => ctx.db.get(commentId));
    expect(comment?.body).toBe("Updated comment");
  });

  test("updateComment should reject comment from other org", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const otherOrgId = await t.run(async (ctx) =>
      ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Other",
        slug: "other",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      })
    );

    const feedbackId = await createFeedback(t, orgId);
    const commentId = await t.run(async (ctx) =>
      ctx.db.insert("comments", {
        body: "Hello",
        createdAt: Date.now(),
        feedbackId,
        isOfficial: false,
        updatedAt: Date.now(),
      })
    );

    await expect(
      t.mutation(internal.admin_api.feedback.updateComment, {
        body: "Hacked",
        commentId,
        organizationId: otherOrgId,
      })
    ).rejects.toThrow("Comment not found in this organization");
  });

  test("deleteComment should remove comment, replies, and update count", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const feedbackId = await createFeedback(t, orgId);

    // Set commentCount to 3
    await t.run(async (ctx) => ctx.db.patch(feedbackId, { commentCount: 3 }));

    const commentId = await t.run(async (ctx) =>
      ctx.db.insert("comments", {
        body: "Parent",
        createdAt: Date.now(),
        feedbackId,
        isOfficial: false,
        updatedAt: Date.now(),
      })
    );

    // Create a reply
    await t.run(async (ctx) =>
      ctx.db.insert("comments", {
        body: "Reply",
        createdAt: Date.now(),
        feedbackId,
        isOfficial: false,
        parentId: commentId,
        updatedAt: Date.now(),
      })
    );

    await t.mutation(internal.admin_api.feedback.deleteComment, {
      commentId,
      organizationId: orgId,
    });

    const remaining = await t.run(async (ctx) =>
      ctx.db.query("comments").collect()
    );
    expect(remaining).toHaveLength(0);

    const fb = await t.run(async (ctx) => ctx.db.get(feedbackId));
    // 3 - 1 (parent) - 1 (reply) = 1
    expect(fb?.commentCount).toBe(1);
  });

  test("markCommentOfficial should toggle isOfficial", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const feedbackId = await createFeedback(t, orgId);

    const commentId = await t.run(async (ctx) =>
      ctx.db.insert("comments", {
        body: "Response",
        createdAt: Date.now(),
        feedbackId,
        isOfficial: false,
        updatedAt: Date.now(),
      })
    );

    await t.mutation(internal.admin_api.feedback.markCommentOfficial, {
      commentId,
      isOfficial: true,
      organizationId: orgId,
    });

    let comment = await t.run(async (ctx) => ctx.db.get(commentId));
    expect(comment?.isOfficial).toBe(true);

    await t.mutation(internal.admin_api.feedback.markCommentOfficial, {
      commentId,
      isOfficial: false,
      organizationId: orgId,
    });

    comment = await t.run(async (ctx) => ctx.db.get(commentId));
    expect(comment?.isOfficial).toBe(false);
  });
});
