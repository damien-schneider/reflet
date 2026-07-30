/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { internal } from "../../_generated/api";
import schema from "../../schema";
import { modules } from "../../test.helpers";

import { createOrg } from "./test_helpers";

const testSchema = schema as any;

describe("admin_api_tags", () => {
  test("createTag should create a tag with generated slug", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const result = await t.mutation(internal.admin_api.tags.createTag, {
      color: "#FF0000",
      name: "Bug Report",
      organizationId: orgId,
    });

    expect(result.id).toBeDefined();

    const tags = await t.query(internal.admin_api.tags.listTags, {
      organizationId: orgId,
    });

    expect(tags).toHaveLength(1);
    expect(tags[0].name).toBe("Bug Report");
    expect(tags[0].slug).toBe("bug-report");
    expect(tags[0].color).toBe("#FF0000");
  });

  test("createTag should reject duplicate slugs", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.mutation(internal.admin_api.tags.createTag, {
      color: "#00FF00",
      name: "Feature",
      organizationId: orgId,
    });

    await expect(
      t.mutation(internal.admin_api.tags.createTag, {
        color: "#0000FF",
        name: "Feature",
        organizationId: orgId,
      })
    ).rejects.toThrow('Tag with slug "feature" already exists');
  });

  test("createTag should set isPublic via settings", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    await t.mutation(internal.admin_api.tags.createTag, {
      color: "#AABBCC",
      isPublic: true,
      name: "Public Tag",
      organizationId: orgId,
    });

    const tags = await t.query(internal.admin_api.tags.listTags, {
      organizationId: orgId,
    });
    expect(tags[0].isPublic).toBe(true);
  });

  test("listTags should return only tags for the given org", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);
    const otherOrgId = await t.run(async (ctx) =>
      ctx.db.insert("organizations", {
        createdAt: Date.now(),
        isPublic: false,
        name: "Other Org",
        slug: "other-org",
        subscriptionStatus: "none",
        subscriptionTier: "free",
      })
    );

    await t.mutation(internal.admin_api.tags.createTag, {
      color: "#111",
      name: "Our Tag",
      organizationId: orgId,
    });
    await t.mutation(internal.admin_api.tags.createTag, {
      color: "#222",
      name: "Their Tag",
      organizationId: otherOrgId,
    });

    const tags = await t.query(internal.admin_api.tags.listTags, {
      organizationId: orgId,
    });
    expect(tags).toHaveLength(1);
    expect(tags[0].name).toBe("Our Tag");
  });

  test("updateTag should update name and regenerate slug", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id } = await t.mutation(internal.admin_api.tags.createTag, {
      color: "#000",
      name: "Old Name",
      organizationId: orgId,
    });

    await t.mutation(internal.admin_api.tags.updateTag, {
      name: "New Name",
      organizationId: orgId,
      tagId: id,
    });

    const tags = await t.query(internal.admin_api.tags.listTags, {
      organizationId: orgId,
    });
    expect(tags[0].name).toBe("New Name");
    expect(tags[0].slug).toBe("new-name");
  });

  test("updateTag should reject tag from different org", async () => {
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

    const { id } = await t.mutation(internal.admin_api.tags.createTag, {
      color: "#000",
      name: "Tag",
      organizationId: orgId,
    });

    await expect(
      t.mutation(internal.admin_api.tags.updateTag, {
        name: "Hacked",
        organizationId: otherOrgId,
        tagId: id,
      })
    ).rejects.toThrow("Tag not found");
  });

  test("deleteTag should remove tag and clean up feedbackTags", async () => {
    const t = convexTest(testSchema, modules);
    const orgId = await createOrg(t);

    const { id: tagId } = await t.mutation(internal.admin_api.tags.createTag, {
      color: "#F00",
      name: "ToDelete",
      organizationId: orgId,
    });

    // Create feedback and link it to the tag
    const _feedbackId = await t.run(async (ctx) => {
      const fId = await ctx.db.insert("feedback", {
        commentCount: 0,
        createdAt: Date.now(),
        description: "Desc",
        isApproved: true,
        isPinned: false,
        organizationId: orgId,
        status: "open",
        title: "Test",
        updatedAt: Date.now(),
        voteCount: 0,
      });
      await ctx.db.insert("feedbackTags", { feedbackId: fId, tagId });
      return fId;
    });

    await t.mutation(internal.admin_api.tags.deleteTag, {
      organizationId: orgId,
      tagId,
    });

    const tags = await t.query(internal.admin_api.tags.listTags, {
      organizationId: orgId,
    });
    expect(tags).toHaveLength(0);

    // feedbackTags junction should be cleaned
    const remaining = await t.run(async (ctx) =>
      ctx.db.query("feedbackTags").collect()
    );
    expect(remaining).toHaveLength(0);
  });
});
